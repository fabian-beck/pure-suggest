import type { InferenceMode } from './types.ts'

// Model families of the developers the application prefers (open-weight models from European
// and US developers, and the cloud services offered for own API keys). Other models stay
// selectable manually but are never recommended or selected automatically.
const PREFERRED_FAMILIES: [RegExp, string][] = [
  [/gemma|gemini/i, 'Google'],
  [/mistral|ministral|magistral|devstral|codestral|pixtral|mixtral/i, 'Mistral AI'],
  [/phi-?\d/i, 'Microsoft'],
  [/gpt|chatgpt|^(openai\/)?o\d/i, 'OpenAI'],
  [/claude/i, 'Anthropic'],
  [/llama/i, 'Meta'],
  [/granite/i, 'IBM']
]

/** The preferred developer a model id belongs to, if any. */
export function preferredDeveloper(modelId: string): string | undefined {
  return PREFERRED_FAMILIES.find(([pattern]) => pattern.test(modelId))?.[1]
}

/** Context window assumed where a backend does not report one, and the cap used per mode. */
export const DEFAULT_CONTEXT_WINDOW: Record<InferenceMode, number> = {
  browser: 8192,
  native: 16384,
  cloud: 64000
}

/** Capability classes of devices; decide which model sizes are offered by default. */
export type DeviceTier = 'low' | 'standard' | 'high'

export interface BrowserModel {
  /** Hugging Face repository with ONNX weights. */
  id: string
  name: string
  developer: string
  license: string
  contextWindow: number
  /** Smallest device class the model is suggested for. */
  tier: DeviceTier
  /** Whether loading the model through this application has been confirmed. */
  isVerified: boolean
  /** Weight format to use on the GPU where the default (4-bit, half precision) misbehaves. */
  webGpuDtype?: string
  note?: string
}

export const BROWSER_MODELS: BrowserModel[] = [
  {
    id: 'onnx-community/gemma-3-270m-it-ONNX',
    name: 'Gemma 3 270M',
    developer: 'Google',
    license: 'Gemma Terms of Use',
    contextWindow: 32768,
    tier: 'low',
    isVerified: true,
    webGpuDtype: 'fp32',
    note: 'Smallest download; noticeably weaker recommendations.'
  },
  {
    id: 'onnx-community/gemma-4-E2B-it-ONNX',
    name: 'Gemma 4 E2B',
    developer: 'Google',
    license: 'Apache 2.0',
    contextWindow: 131072,
    tier: 'low',
    isVerified: true
  },
  {
    id: 'onnx-community/gemma-4-E4B-it-ONNX',
    name: 'Gemma 4 E4B',
    developer: 'Google',
    license: 'Apache 2.0',
    contextWindow: 131072,
    tier: 'standard',
    isVerified: true
  },
  {
    id: 'mistralai/Ministral-3-3B-Instruct-2512-ONNX',
    name: 'Ministral 3 3B',
    developer: 'Mistral AI',
    license: 'Apache 2.0',
    contextWindow: 262144,
    tier: 'standard',
    isVerified: false
  },
  {
    id: 'onnx-community/Phi-4-mini-instruct-ONNX-MHA',
    name: 'Phi-4 Mini',
    developer: 'Microsoft',
    license: 'MIT',
    contextWindow: 131072,
    tier: 'standard',
    isVerified: false
  }
]

/** Models suggested for installation in a local server (Ollama tags), smallest first. */
export const NATIVE_MODEL_SUGGESTIONS: { tag: string; name: string; tier: DeviceTier }[] = [
  { tag: 'gemma4:e4b', name: 'Gemma 4 E4B', tier: 'standard' },
  { tag: 'ministral-3:3b', name: 'Ministral 3 3B', tier: 'standard' },
  { tag: 'phi4-mini', name: 'Phi-4 Mini', tier: 'standard' },
  { tag: 'ministral-3:8b', name: 'Ministral 3 8B', tier: 'high' },
  { tag: 'gpt-oss:20b', name: 'GPT-OSS 20B', tier: 'high' }
]

export interface CloudService {
  id: string
  name: string
  api: 'openai-compatible' | 'anthropic'
  baseUrl: string
  /** Where users create an API key. */
  keyUrl: string
  /** Model preselected until the user chooses one from the service's model list. */
  defaultModel: string
}

export const CLOUD_SERVICES: CloudService[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    api: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    keyUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-5.4'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    api: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    keyUrl: 'https://platform.claude.com/settings/keys',
    defaultModel: 'claude-opus-5-5'
  },
  {
    id: 'google',
    name: 'Google Gemini',
    api: 'openai-compatible',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyUrl: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-flash-latest'
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    api: 'openai-compatible',
    baseUrl: 'https://api.mistral.ai/v1',
    keyUrl: 'https://console.mistral.ai/api-keys',
    defaultModel: 'mistral-small-latest'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    api: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyUrl: 'https://openrouter.ai/settings/keys',
    defaultModel: ''
  },
  {
    id: 'custom',
    name: 'Other (OpenAI-compatible)',
    api: 'openai-compatible',
    baseUrl: '',
    keyUrl: '',
    defaultModel: ''
  }
]
