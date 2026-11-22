import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { jsonResponse, mockFetchRoutes } from '../../helpers/llmTestUtils.js'

import { BrowserProvider } from '@/llm/browser.ts'
import { completeChat } from '@/llm/chat.ts'
import { useLlmStore } from '@/stores/llm.js'

vi.mock('@/llm/chat.ts', () => ({ completeChat: vi.fn() }))

const OLLAMA_ROUTES = {
  ':11434/api/version': jsonResponse({ version: '0.20.0' }),
  ':11434/api/tags': jsonResponse({
    models: [
      { name: 'qwen3:8b', size: 5e9 },
      { name: 'gpt-oss:20b', size: 14e9 }
    ]
  }),
  ':11434/api/show': jsonResponse({
    capabilities: ['completion', 'thinking'],
    model_info: { 'general.context_length': 131072 }
  })
}

describe('LLM store', () => {
  let store

  const createStore = () => {
    setActivePinia(createPinia())
    store = useLlmStore()
  }

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    completeChat.mockReset()
    completeChat.mockResolvedValue({ text: 'ok', tokensPerSecond: 23.44 })
    mockFetchRoutes({})
    createStore()
  })

  describe('setup', () => {
    it('requires an explicit choice before any model is used', async () => {
      expect(store.settings.mode).toBeNull()
      expect(store.setupIssue).toContain('Choose where')
      await expect(store.generate({ messages: [] })).rejects.toMatchObject({ code: 'unavailable' })
      expect(completeChat).not.toHaveBeenCalled()
    })

    it('treats models on this device as ready once a model is chosen', () => {
      store.settings.mode = 'browser'
      store.modelId = 'onnx-community/gemma-4-E2B-it-ONNX'

      expect(store.setupIssue).toBe('')
      expect(store.location).toBe('local')
      expect(store.backendName).toBe('Browser')
    })

    it('uses cloud services only with a key and explicit consent per service', () => {
      store.settings.mode = 'cloud'
      expect(store.location).toBe('remote')
      expect(store.setupIssue).toContain('OpenAI API key')

      store.apiKeys.openai = 'sk-test'
      expect(store.modelId).toBe('gpt-5.4')
      expect(store.setupIssue).toContain('Confirm')

      store.hasRemoteConsent = true
      expect(store.setupIssue).toBe('')

      store.settings.cloudServiceId = 'mistral'
      store.apiKeys.mistral = 'key'
      expect(store.hasRemoteConsent).toBe(false)
      expect(store.setupIssue).toContain('Confirm')
    })

    it('asks for consent when a "local" server is on another machine', () => {
      store.settings.mode = 'native'
      store.modelId = 'gemma4:e4b'
      expect(store.setupIssue).toBe('')

      store.settings.nativeBaseUrl = 'https://llm.example.org/v1'
      expect(store.location).toBe('remote')
      expect(store.setupIssue).toContain('Confirm')
    })
  })

  describe('persistence', () => {
    it('restores settings and keeps API keys out of the storage unless asked to remember', async () => {
      store.settings.mode = 'cloud'
      store.apiKeys.openai = 'sk-test'
      await nextTick()

      expect(JSON.parse(localStorage.getItem('llmSettings')).mode).toBe('cloud')
      expect(localStorage.getItem('llmApiKeys')).toBeNull()
      expect(JSON.stringify(localStorage)).not.toContain('sk-test')

      store.settings.rememberApiKeys = true
      await nextTick()
      expect(JSON.parse(localStorage.getItem('llmApiKeys'))).toEqual({ openai: 'sk-test' })

      createStore()
      expect(store.settings.mode).toBe('cloud')
      expect(store.apiKeys.openai).toBe('sk-test')

      store.settings.rememberApiKeys = false
      await nextTick()
      expect(localStorage.getItem('llmApiKeys')).toBeNull()
    })

    it('takes over the key stored by the previous OpenAI-only version', () => {
      localStorage.setItem('pureSuggest.openaiApiKey', 'sk-legacy')

      createStore()

      expect(store.apiKeys.openai).toBe('sk-legacy')
      expect(store.settings.rememberApiKeys).toBe(true)
      expect(localStorage.getItem('pureSuggest.openaiApiKey')).toBeNull()
    })
  })

  describe('models', () => {
    it('identifies the local server and lists preferred models first', async () => {
      mockFetchRoutes(OLLAMA_ROUTES)
      store.settings.mode = 'native'
      store.settings.nativeKind = 'openai-compatible'

      await store.refreshModels()

      expect(store.settings.nativeKind).toBe('ollama')
      expect(store.models.map((model) => model.id)).toEqual(['gpt-oss:20b', 'qwen3:8b'])
      expect(store.modelsError).toBe('')
    })

    it('explains when no server answers', async () => {
      store.settings.mode = 'native'

      await store.refreshModels()

      expect(store.models).toEqual([])
      expect(store.modelsError).toContain('No inference server answered')
    })

    it('adopts a detected server', async () => {
      mockFetchRoutes(OLLAMA_ROUTES)
      store.settings.mode = 'native'
      store.settings.nativeBaseUrl = 'http://localhost:5000/v1'

      await store.detectServers()

      expect(store.servers).toHaveLength(1)
      expect(store.settings.nativeBaseUrl).toBe('http://localhost:11434/v1')
      expect(store.recommendation).not.toBeNull()
    })
  })

  describe('warmUp', () => {
    const DEVICE = { hasWebGpu: true, supportsShaderF16: true, tier: 'standard' }
    let prepareModel

    const setUpBrowserModel = (isAvailable) => {
      prepareModel = vi.spyOn(BrowserProvider.prototype, 'prepareModel').mockResolvedValue()
      vi.spyOn(BrowserProvider.prototype, 'listModels').mockResolvedValue([
        { id: 'model-a', name: 'Model A', isPreferred: true, isAvailable, capabilities: {} }
      ])
      store.device = DEVICE
      store.settings.mode = 'browser'
      store.modelId = 'model-a'
    }

    it('loads a downloaded browser model into memory ahead of its use', async () => {
      setUpBrowserModel(true)

      await store.warmUp()

      expect(prepareModel).toHaveBeenCalledWith('model-a', expect.any(Function), undefined)
      expect(store.loadedModelId).toBe('model-a')
    })

    it('never starts a download or touches other backends', async () => {
      setUpBrowserModel(false)
      await store.warmUp()
      expect(prepareModel).not.toHaveBeenCalled()

      store.settings.mode = 'native'
      store.modelId = 'gemma4:e4b'
      await store.warmUp()
      expect(global.fetch).not.toHaveBeenCalled()
      expect(store.loadedModelId).toBe('')
    })
  })

  describe('generate', () => {
    it('runs requests on the chosen local model and records the measured speed', async () => {
      mockFetchRoutes(OLLAMA_ROUTES)
      store.settings.mode = 'native'
      store.settings.temperature = 0.3
      store.modelId = 'gpt-oss:20b'
      const messages = [{ role: 'user', content: 'Hi' }]

      const result = await store.generate({ messages, maxOutputTokens: 1000 })

      expect(result.text).toBe('ok')
      const [provider, request] = completeChat.mock.calls[0]
      expect(provider.id).toBe('ollama')
      expect(request).toMatchObject({
        model: 'gpt-oss:20b',
        messages,
        temperature: 0.3,
        contextWindow: 16384,
        // Thinking models get room and a low effort for their reasoning
        maxOutputTokens: 3048,
        reasoningEffort: 'low'
      })
      expect(store.usableContextWindow).toBe(16384 - 2048)
      expect(store.measuredSpeed('gpt-oss:20b')).toBeCloseTo(23.4)
    })

    it('reports progress while the answer is generated', async () => {
      mockFetchRoutes(OLLAMA_ROUTES)
      store.settings.mode = 'native'
      store.modelId = 'gpt-oss:20b'
      completeChat.mockImplementation(async (provider, request, onEvent) => {
        onEvent({ type: 'reasoning', text: 'Hm. ' })
        onEvent({ type: 'text', text: 'Hel' })
        onEvent({ type: 'text', text: 'lo' })
        return { text: 'Hello' }
      })
      const onStatus = vi.fn()

      await store.generate({ messages: [], maxOutputTokens: 10 }, onStatus)

      expect(onStatus).toHaveBeenLastCalledWith({
        phase: 'generate',
        text: 'Hello',
        reasoning: 'Hm. '
      })
    })

    it('leaves the answer length of cloud models unrestricted', async () => {
      mockFetchRoutes({ '/v1/models': jsonResponse({ data: [{ id: 'mistral-small-latest' }] }) })
      store.settings.mode = 'cloud'
      store.settings.cloudServiceId = 'mistral'
      store.apiKeys.mistral = 'key'
      store.hasRemoteConsent = true

      await store.generate({ messages: [], maxOutputTokens: 1000 })

      const [provider, request] = completeChat.mock.calls[0]
      expect(provider.location).toBe('remote')
      expect(request.model).toBe('mistral-small-latest')
      expect(request.maxOutputTokens).toBeUndefined()
      expect(request.contextWindow).toBe(64000)
    })
  })
})
