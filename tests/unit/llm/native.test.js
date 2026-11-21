import { describe, it, expect } from 'vitest'

import {
  collectEvents,
  jsonResponse,
  mockFetchRoutes,
  streamResponse
} from '../../helpers/llmTestUtils.js'

import { createNativeProvider, discoverNativeServers, probeNativeServer } from '@/llm/native.ts'

const OLLAMA_ROUTES = {
  ':11434/api/version': jsonResponse({ version: '0.20.0' }),
  ':11434/api/tags': jsonResponse({
    models: [
      { name: 'gemma4:e4b', size: 6e9, details: { parameter_size: '8B', quantization_level: 'Q4_K_M' } },
      { name: 'qwen3:8b', size: 5e9, details: {} }
    ]
  }),
  ':11434/api/show': jsonResponse({
    capabilities: ['completion', 'tools'],
    model_info: { 'gemma4.context_length': 131072 }
  })
}

describe('native inference servers', () => {
  it('identifies Ollama and describes its installed models', async () => {
    mockFetchRoutes(OLLAMA_ROUTES)

    const server = await probeNativeServer('http://localhost:11434/v1', '')

    expect(server.kind).toBe('ollama')
    expect(server.models[0]).toMatchObject({
      id: 'gemma4:e4b',
      developer: 'Google',
      isPreferred: true,
      sizeBytes: 6e9,
      parameterSize: '8B',
      quantization: 'Q4_K_M',
      contextWindow: 131072,
      capabilities: { structuredOutput: 'schema', toolCalling: true, reasoning: false }
    })
    expect(server.models[1]).toMatchObject({ id: 'qwen3:8b', isPreferred: false })
  })

  it('identifies LM Studio and llama.cpp by their native endpoints', async () => {
    mockFetchRoutes({
      ':1234/api/v1/models': jsonResponse({
        models: [
          { type: 'llm', key: 'mistralai/ministral-3-8b', display_name: 'Ministral 3 8B', size_bytes: 5e9, max_context_length: 32768, loaded_instances: [{ config: { context_length: 8192 } }] },
          { type: 'embedding', key: 'nomic-embed' }
        ]
      }),
      ':9931/props': jsonResponse({ default_generation_settings: { n_ctx: 4096 } }),
      ':9931/v1/models': jsonResponse({ data: [{ id: '/models/phi-4-mini.gguf', meta: { size: 3e9 } }] })
    })

    const servers = await discoverNativeServers()

    expect(servers.map((server) => server.kind)).toEqual(['lmstudio', 'llamacpp'])
    expect(servers[0].models).toHaveLength(1)
    expect(servers[0].models[0]).toMatchObject({
      id: 'mistralai/ministral-3-8b',
      name: 'Ministral 3 8B',
      contextWindow: 8192,
      isPreferred: true
    })
    expect(servers[1].models[0]).toMatchObject({
      name: 'phi-4-mini.gguf',
      contextWindow: 4096,
      developer: 'Microsoft'
    })
  })

  it('reports no server when nothing answers', async () => {
    mockFetchRoutes({})

    expect(await probeNativeServer('http://localhost:11434/v1', '')).toBeNull()
    expect(await discoverNativeServers()).toEqual([])
  })

  it('chats with Ollama natively to set the context window and schema', async () => {
    const line = (chunk) => `${JSON.stringify(chunk)}\n`
    const fetchMock = mockFetchRoutes({
      '/api/chat': streamResponse([
        line({ message: { thinking: 'Let me think' } }),
        line({ message: { content: '{"ok":' } }),
        line({ message: { content: 'true}' } }),
        line({ done: true, done_reason: 'stop', prompt_eval_count: 30, eval_count: 7 })
      ])
    })
    const provider = createNativeProvider('ollama', 'http://localhost:11434/v1', '')

    const events = await collectEvents(
      provider.streamChat({
        model: 'gpt-oss:20b',
        messages: [{ role: 'user', content: 'Hi' }],
        contextWindow: 16384,
        maxOutputTokens: 100,
        reasoningEffort: 'low',
        jsonSchema: { name: 'answer', schema: { type: 'object' } }
      })
    )

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:11434/api/chat')
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'gpt-oss:20b',
      options: { num_ctx: 16384, num_predict: 100 },
      format: { type: 'object' },
      think: 'low'
    })
    expect(events).toEqual([
      { type: 'reasoning', text: 'Let me think' },
      { type: 'text', text: '{"ok":' },
      { type: 'text', text: 'true}' },
      { type: 'finish', finishReason: 'stop', usage: { inputTokens: 30, outputTokens: 7 } }
    ])
  })
})
