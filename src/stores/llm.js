import { defineStore } from 'pinia'
import { computed, reactive, ref, shallowRef, watch } from 'vue'

import { BrowserProvider } from '@/llm/browser.ts'
import { CLOUD_SERVICES, DEFAULT_CONTEXT_WINDOW } from '@/llm/catalog.ts'
import { completeChat } from '@/llm/chat.ts'
import { createCloudProvider } from '@/llm/cloud.ts'
import {
  createNativeProvider,
  discoverNativeServers,
  NATIVE_SERVER_NAMES,
  probeNativeServer,
  queryLocalNetworkPermission
} from '@/llm/native.ts'
import { detectDevice, measurementKey, recommendSetup } from '@/llm/selection.ts'
import { isLoopbackUrl } from '@/llm/transport.ts'
import { LlmError } from '@/llm/types.ts'

const SETTINGS_STORAGE_KEY = 'llmSettings'
const API_KEYS_STORAGE_KEY = 'llmApiKeys'
// Key stored by the first, OpenAI-only version of the AI recommendations
const LEGACY_OPENAI_KEY_STORAGE_KEY = 'pureSuggest.openaiApiKey'

// Tokens reserved for the reasoning of models that think before answering
const REASONING_HEADROOM = 2048

const DEFAULT_SETTINGS = {
  // 'browser', 'native', 'cloud', or null as long as the user has not chosen
  mode: null,
  browserModelId: '',
  browserBackend: 'auto',
  customBrowserModelIds: [],
  nativeBaseUrl: 'http://localhost:11434/v1',
  nativeKind: 'ollama',
  nativeModelId: '',
  cloudServiceId: 'openai',
  cloudModelIds: {},
  cloudCustomBaseUrl: '',
  // Remote targets the user explicitly allowed to receive session data
  remoteConsents: [],
  rememberApiKeys: false,
  // null: leave sampling to the backend's default
  temperature: null,
  // null: choose automatically per mode and model
  contextWindow: null,
  // Measured generation speed (tokens per second) by backend and model
  measurements: {}
}

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {}
  } catch {
    return {}
  }
}

function loadApiKeys() {
  const apiKeys = readStorage(API_KEYS_STORAGE_KEY)
  try {
    const legacyKey = localStorage.getItem(LEGACY_OPENAI_KEY_STORAGE_KEY)
    if (legacyKey) {
      apiKeys.openai ||= legacyKey
      localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(apiKeys))
      localStorage.removeItem(LEGACY_OPENAI_KEY_STORAGE_KEY)
    }
  } catch {
    // storage unavailable: keys stay in memory
  }
  return apiKeys
}

/**
 * Inference settings and state: which backend runs prompts (in the browser, on a local
 * server, or in the cloud), which model it uses, and what is known about the device.
 */
export const useLlmStore = defineStore('llm', () => {
  const storedApiKeys = loadApiKeys()
  const settings = reactive({
    ...structuredClone(DEFAULT_SETTINGS),
    ...readStorage(SETTINGS_STORAGE_KEY)
  })
  if (Object.keys(storedApiKeys).length) settings.rememberApiKeys = true
  // API keys by cloud service id, plus `native` for protected local servers
  const apiKeys = reactive(storedApiKeys)

  const device = shallowRef(null)
  const servers = shallowRef([])
  const localNetworkPermission = ref('unknown')
  const models = shallowRef([])
  const modelsError = ref('')
  const isLoadingModels = ref(false)
  const isDetectingServers = ref(false)
  // Browser model currently held in memory (lost on every page reload)
  const loadedModelId = ref('')

  watch(
    settings,
    () => {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      } catch (error) {
        console.warn('Could not store inference settings:', error)
      }
    },
    { deep: true }
  )

  // Keys only reach the persistent storage on request; otherwise they live until the page closes
  watch(
    [apiKeys, () => settings.rememberApiKeys],
    () => {
      try {
        if (settings.rememberApiKeys) {
          localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(apiKeys))
        } else localStorage.removeItem(API_KEYS_STORAGE_KEY)
      } catch (error) {
        console.warn('Could not store API keys:', error)
      }
    },
    { deep: true }
  )

  const cloudService = computed(
    () =>
      CLOUD_SERVICES.find((service) => service.id === settings.cloudServiceId) ?? CLOUD_SERVICES[0]
  )
  const cloudBaseUrl = computed(() => cloudService.value.baseUrl || settings.cloudCustomBaseUrl)

  const modelId = computed({
    get() {
      if (settings.mode === 'browser') return settings.browserModelId
      if (settings.mode === 'native') return settings.nativeModelId
      if (settings.mode !== 'cloud') return ''
      return settings.cloudModelIds[settings.cloudServiceId] ?? cloudService.value.defaultModel
    },
    set(id) {
      if (settings.mode === 'browser') settings.browserModelId = id
      else if (settings.mode === 'native') settings.nativeModelId = id
      else if (settings.mode === 'cloud') settings.cloudModelIds[settings.cloudServiceId] = id
    }
  })

  const activeModel = computed(
    () =>
      models.value.find((model) => model.id === modelId.value) ?? {
        id: modelId.value,
        name: modelId.value,
        isPreferred: false,
        isAvailable: true,
        capabilities: {}
      }
  )

  /** Whether prompts stay on this device (`local`) or are sent over the network (`remote`). */
  const location = computed(() => {
    if (settings.mode === 'native')
      return isLoopbackUrl(settings.nativeBaseUrl) ? 'local' : 'remote'
    if (settings.mode === 'cloud') return isLoopbackUrl(cloudBaseUrl.value) ? 'local' : 'remote'
    return 'local'
  })

  const backendName = computed(() => {
    if (settings.mode === 'browser') return 'Browser'
    if (settings.mode === 'native') return NATIVE_SERVER_NAMES[settings.nativeKind]
    if (settings.mode === 'cloud') return cloudService.value.name
    return ''
  })

  const consentKey = computed(() =>
    settings.mode === 'cloud' ? `cloud:${cloudBaseUrl.value}` : `native:${settings.nativeBaseUrl}`
  )
  const hasRemoteConsent = computed({
    get: () => settings.remoteConsents.includes(consentKey.value),
    set(isAllowed) {
      const others = settings.remoteConsents.filter((key) => key !== consentKey.value)
      settings.remoteConsents = isAllowed ? [...others, consentKey.value] : others
    }
  })

  /** What still prevents running prompts; empty if the chosen backend is ready to use. */
  const setupIssue = computed(() => {
    if (!settings.mode) return 'Choose where the AI model should run.'
    if (settings.mode === 'cloud') {
      if (!cloudBaseUrl.value) return 'Enter the address of the service.'
      if (!apiKeys[settings.cloudServiceId]) return `Enter your ${cloudService.value.name} API key.`
    }
    if (!modelId.value) return 'Choose a model.'
    if (location.value === 'remote' && !hasRemoteConsent.value) {
      return 'Confirm that session data may be sent to this service.'
    }
    return ''
  })

  const contextWindow = computed(() => {
    if (!settings.mode) return 0
    const requested = settings.contextWindow || DEFAULT_CONTEXT_WINDOW[settings.mode]
    return Math.min(requested, activeModel.value.contextWindow ?? Infinity)
  })

  const recommendation = computed(() =>
    device.value ? recommendSetup(device.value, servers.value, settings.measurements) : null
  )

  // The provider is kept across calls (it may hold a loaded model) and replaced on new settings
  let cachedProvider = { key: '', provider: null }
  function getProvider() {
    let key
    let create
    if (settings.mode === 'browser') {
      key = ['browser', settings.browserBackend, device.value, ...settings.customBrowserModelIds]
      create = () =>
        new BrowserProvider(settings.browserBackend, device.value, [
          ...settings.customBrowserModelIds
        ])
    } else if (settings.mode === 'native') {
      key = ['native', settings.nativeKind, settings.nativeBaseUrl, apiKeys.native]
      create = () =>
        createNativeProvider(settings.nativeKind, settings.nativeBaseUrl, apiKeys.native ?? '')
    } else {
      key = ['cloud', settings.cloudServiceId, cloudBaseUrl.value, apiKeys[settings.cloudServiceId]]
      create = () =>
        createCloudProvider(
          cloudService.value,
          settings.cloudCustomBaseUrl,
          apiKeys[settings.cloudServiceId] ?? ''
        )
    }
    key = JSON.stringify(key)
    if (cachedProvider.key !== key) {
      cachedProvider.provider?.dispose?.()
      cachedProvider = { key, provider: create() }
      loadedModelId.value = ''
    }
    return cachedProvider.provider
  }

  // Matches the id of the provider created for the chosen backend
  const providerId = computed(() => {
    if (settings.mode === 'native') return settings.nativeKind
    return settings.mode === 'cloud' ? settings.cloudServiceId : 'browser'
  })

  function measuredSpeed(id) {
    return settings.measurements[measurementKey(providerId.value, id)]
  }

  async function ensureDevice() {
    device.value ??= await detectDevice()
  }

  /** Loads the models of the chosen backend; for local servers, also identifies the server. */
  async function refreshModels() {
    if (!settings.mode) return
    const mode = settings.mode
    modelsError.value = ''
    models.value = []
    // Cloud services only list their models to key holders
    if (mode === 'cloud' && !apiKeys[settings.cloudServiceId]) return
    isLoadingModels.value = true
    try {
      await ensureDevice()
      let listed
      if (mode === 'native') {
        const server = await probeNativeServer(settings.nativeBaseUrl, apiKeys.native ?? '')
        if (!server) {
          throw new LlmError(
            'network',
            `No inference server answered at ${settings.nativeBaseUrl}.`
          )
        }
        settings.nativeKind = server.kind
        listed = server.models
      } else listed = await getProvider().listModels()
      if (mode !== settings.mode) return
      // Preferred developers first; the rest stays available for a manual choice
      models.value = [...listed].sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred))
    } catch (error) {
      if (mode === settings.mode) modelsError.value = error.message
    } finally {
      if (mode === settings.mode) isLoadingModels.value = false
    }
  }

  /** Looks for local servers at their default addresses (may trigger a browser permission prompt). */
  async function detectServers() {
    isDetectingServers.value = true
    try {
      await ensureDevice()
      servers.value = await discoverNativeServers()
      localNetworkPermission.value = await queryLocalNetworkPermission()
    } finally {
      isDetectingServers.value = false
    }
    if (settings.mode !== 'native') return
    const isCurrentDetected = servers.value.some(
      (server) => server.baseUrl === settings.nativeBaseUrl
    )
    if (servers.value.length && !isCurrentDetected)
      settings.nativeBaseUrl = servers.value[0].baseUrl
    await refreshModels()
  }

  function applyRecommendation() {
    const { mode, modelId: recommendedModelId, baseUrl } = recommendation.value
    settings.mode = mode
    if (mode === 'native') {
      settings.nativeBaseUrl = baseUrl
      settings.nativeModelId = recommendedModelId
    } else settings.browserModelId = recommendedModelId
  }

  /** Downloads and loads the chosen model of a backend that keeps models itself. */
  async function prepareModel(onProgress, signal) {
    await ensureDevice()
    const provider = getProvider()
    if (!provider.prepareModel) return
    const id = modelId.value
    await provider.prepareModel(id, onProgress, signal)
    loadedModelId.value = id
  }

  /**
   * Loads the chosen browser model into memory ahead of its use if it is already downloaded
   * (after a page reload, it is not in memory anymore); never starts a download.
   */
  async function warmUp() {
    if (settings.mode !== 'browser' || setupIssue.value) return
    try {
      if (!models.value.length) await refreshModels()
      const isDownloaded = models.value.some(
        (model) => model.id === modelId.value && model.isAvailable
      )
      if (isDownloaded) await prepareModel(() => {})
    } catch (error) {
      console.warn('Could not load the model ahead of its use:', error)
    }
  }

  async function removeModel(id) {
    await getProvider().removeModel?.(id)
    if (loadedModelId.value === id) loadedModelId.value = ''
    await refreshModels()
  }

  /** Context window left for prompt and answer after reserving room for hidden reasoning. */
  const usableContextWindow = computed(() =>
    Math.max(
      0,
      contextWindow.value - (activeModel.value.capabilities.reasoning ? REASONING_HEADROOM : 0)
    )
  )

  /**
   * Runs a chat request ({messages, jsonSchema, maxOutputTokens, signal}) on the chosen
   * backend and model with the user's sampling settings. `onStatus` reports the phase
   * (`download`, `load`, `generate`) with byte counts or, while generating, the answer
   * (`text`) and the model's own reasoning (`reasoning`) as far as they are written.
   */
  async function generate(request, onStatus) {
    if (setupIssue.value) throw new LlmError('unavailable', setupIssue.value)
    // Model details (context window, capabilities) shape the request
    if (!models.value.length) await refreshModels()
    await prepareModel((progress) => onStatus?.(progress), request.signal)
    const isReasoning = activeModel.value.capabilities.reasoning === true
    // Cloud models have ample context, and their hidden reasoning counts against the limit
    const localOutputTokens = request.maxOutputTokens + (isReasoning ? REASONING_HEADROOM : 0)
    const maxOutputTokens = settings.mode === 'cloud' ? undefined : localOutputTokens
    const written = { phase: 'generate', text: '', reasoning: '' }
    const result = await completeChat(
      getProvider(),
      {
        ...request,
        model: modelId.value,
        maxOutputTokens,
        reasoningEffort: isReasoning ? 'low' : undefined,
        temperature: settings.temperature ?? undefined,
        contextWindow: contextWindow.value
      },
      (event) => {
        if (event.type !== 'text' && event.type !== 'reasoning') return
        written[event.type] += event.text
        onStatus?.({ ...written })
      }
    )
    if (result.tokensPerSecond) {
      settings.measurements[measurementKey(providerId.value, modelId.value)] =
        Math.round(result.tokensPerSecond * 10) / 10
    }
    return result
  }

  return {
    settings,
    apiKeys,
    device,
    servers,
    localNetworkPermission,
    models,
    modelsError,
    isLoadingModels,
    isDetectingServers,
    loadedModelId,
    cloudService,
    modelId,
    activeModel,
    location,
    backendName,
    hasRemoteConsent,
    setupIssue,
    contextWindow,
    usableContextWindow,
    recommendation,
    measuredSpeed,
    refreshModels,
    detectServers,
    applyRecommendation,
    prepareModel,
    warmUp,
    removeModel,
    generate
  }
})
