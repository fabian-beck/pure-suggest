/**
 * Provider-independent contract for LLM inference. The application only talks to this
 * interface; whether a prompt runs in the browser, on a local server, or in the cloud is
 * decided by the provider instance behind it.
 */

export type InferenceMode = 'browser' | 'native' | 'cloud'

/** Where prompts are processed: on this device or on a machine reached over the network. */
export type ProcessingLocation = 'local' | 'remote'

export type JsonSchema = { [key: string]: unknown }

/**
 * What a model (as served by its provider) supports. Absent entries are unknown, not
 * unsupported: providers only state what they can tell for sure.
 */
export interface ModelCapabilities {
  /**
   * `schema`: output is constrained to a JSON schema; `json`: output is constrained to
   * valid JSON; `none`: JSON can only be requested through the prompt.
   */
  structuredOutput?: 'schema' | 'json' | 'none'
  toolCalling?: boolean
  /** Whether the model reasons before answering, with an effort that requests can set. */
  reasoning?: boolean
  vision?: boolean
}

export interface ModelInfo {
  id: string
  name: string
  developer?: string
  /** Whether the developer is among the preferred (European/US open-weight or selected cloud) ones. */
  isPreferred: boolean
  /** Maximum number of tokens (prompt and answer) the model can process as served. */
  contextWindow?: number
  /** Download and disk size in bytes. */
  sizeBytes?: number
  /** Approximate working memory (RAM or VRAM) in bytes. */
  memoryBytes?: number
  parameterSize?: string
  quantization?: string
  license?: string
  /** Whether the model is ready without a further download (cached, installed, or hosted). */
  isAvailable: boolean
  /** Why the model cannot be used at all on this backend. */
  unavailableReason?: string
  capabilities: ModelCapabilities
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: JsonSchema
}

export interface ToolCall {
  id: string
  name: string
  /** JSON-encoded arguments as produced by the model. */
  arguments: string
}

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string }

export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  topP?: number
  seed?: number
  maxOutputTokens?: number
  /** Requested context window in tokens; honoured where the backend can set it per request. */
  contextWindow?: number
  /** Requests a JSON answer; constrained by the schema as far as the model's capabilities allow. */
  jsonSchema?: { name: string; schema: JsonSchema }
  tools?: ToolDefinition[]
  reasoningEffort?: 'low' | 'medium' | 'high'
  signal?: AbortSignal
}

export interface TokenUsage {
  inputTokens?: number
  outputTokens?: number
}

export type FinishReason = 'stop' | 'length' | 'tool-calls' | 'content-filter' | 'unknown'

export type ChatEvent =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'tool-call'; toolCall: ToolCall }
  | { type: 'finish'; finishReason: FinishReason; usage: TokenUsage }

export interface ChatResult {
  text: string
  reasoning: string
  toolCalls: ToolCall[]
  finishReason: FinishReason
  usage: TokenUsage
  /** Measured generation speed; undefined if the answer was too short to measure. */
  tokensPerSecond?: number
}

export interface ModelLoadProgress {
  /** `download`: fetching weights; `load`: initialising the model in memory. */
  phase: 'download' | 'load'
  loadedBytes?: number
  totalBytes?: number
}

export interface Availability {
  isAvailable: boolean
  /** Why the provider cannot be used and what the user can do about it. */
  reason?: string
}

export interface LlmProvider {
  readonly id: string
  readonly name: string
  readonly mode: InferenceMode
  readonly location: ProcessingLocation

  checkAvailability(signal?: AbortSignal): Promise<Availability>
  listModels(signal?: AbortSignal): Promise<ModelInfo[]>
  streamChat(request: ChatRequest): AsyncGenerator<ChatEvent, void, void>

  /** Downloads (if necessary) and loads a model ahead of the first request. */
  prepareModel?(
    modelId: string,
    onProgress: (progress: ModelLoadProgress) => void,
    signal?: AbortSignal
  ): Promise<void>
  /** Deletes the locally stored weights of a model. */
  removeModel?(modelId: string): Promise<void>
  /** Releases resources held by the provider (loaded models, workers). */
  dispose?(): void
}

export type LlmErrorCode =
  | 'aborted'
  | 'network'
  | 'unavailable'
  | 'authentication'
  | 'permission'
  | 'rate-limit'
  | 'model-not-found'
  | 'context-overflow'
  | 'out-of-memory'
  | 'invalid-request'
  | 'invalid-response'
  | 'unsupported'
  | 'server'
  | 'unknown'

/** Error raised by all providers, so that callers can react without knowing the backend. */
export class LlmError extends Error {
  readonly code: LlmErrorCode
  readonly status?: number

  constructor(code: LlmErrorCode, message: string, status?: number, cause?: unknown) {
    super(message, { cause })
    this.name = 'LlmError'
    this.code = code
    this.status = status
  }
}
