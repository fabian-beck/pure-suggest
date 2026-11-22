import { preferredDeveloper } from './catalog.ts'
import { OpenAiCompatibleProvider } from './openaiCompatible.ts'
import { fetchOrThrow, readJsonLines, trimTrailingSlashes } from './transport.ts'
import {
  LlmError,
  type ChatEvent,
  type ChatMessage,
  type ChatRequest,
  type LlmProvider,
  type ModelInfo
} from './types.ts'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export type NativeServerKind = 'ollama' | 'lmstudio' | 'llamacpp' | 'openai-compatible'

export const NATIVE_SERVER_NAMES: Record<NativeServerKind, string> = {
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  llamacpp: 'llama.cpp',
  'openai-compatible': 'Local server'
}

/** Default endpoints probed by the automatic discovery. */
const DEFAULT_ENDPOINTS = [
  'http://localhost:11434/v1', // Ollama
  'http://localhost:1234/v1', // LM Studio
  'http://localhost:9931/v1', // llama.cpp server
  'http://localhost:8080/v1' // llama.cpp server (former default)
]

const PROBE_TIMEOUT_MS = 2500

/** Removes the OpenAI path suffix to address the server's native API. */
function serverRoot(baseUrl: string): string {
  return trimTrailingSlashes(baseUrl).replace(/\/v1$/, '')
}

function nativeModel(id: string, name: string, extra: Partial<ModelInfo>): ModelInfo {
  const developer = preferredDeveloper(id)
  return {
    id,
    name,
    developer,
    isPreferred: Boolean(developer),
    isAvailable: true,
    capabilities: {},
    ...extra
  }
}

function toOllamaMessage(message: ChatMessage): Json {
  if (message.role === 'assistant' && message.toolCalls?.length) {
    return {
      role: 'assistant',
      content: message.content,
      tool_calls: message.toolCalls.map((call) => ({
        function: { name: call.name, arguments: JSON.parse(call.arguments || '{}') }
      }))
    }
  }
  return { role: message.role, content: message.content }
}

function buildOllamaRequestBody(request: ChatRequest): Json {
  const options: Json = {}
  if (request.temperature !== undefined) options.temperature = request.temperature
  if (request.topP !== undefined) options.top_p = request.topP
  if (request.seed !== undefined) options.seed = request.seed
  if (request.maxOutputTokens) options.num_predict = request.maxOutputTokens
  if (request.contextWindow) options.num_ctx = request.contextWindow

  const body: Json = {
    model: request.model,
    stream: true,
    options,
    messages: request.messages.map(toOllamaMessage)
  }
  if (request.jsonSchema) body.format = request.jsonSchema.schema
  if (request.tools?.length) {
    body.tools = request.tools.map((tool) => ({ type: 'function', function: tool }))
  }
  // Only GPT-OSS takes effort levels; other thinking models keep their default
  if (request.reasoningEffort && request.model.includes('gpt-oss')) {
    body.think = request.reasoningEffort
  }
  return body
}

/**
 * Ollama through its native API: unlike the OpenAI-compatible endpoint, it allows setting
 * the context window per request and reports model sizes and capabilities.
 */
class OllamaProvider implements LlmProvider {
  readonly id = 'ollama'
  readonly name = NATIVE_SERVER_NAMES.ollama
  readonly mode = 'native'
  readonly location = 'local'
  private readonly root: string
  private readonly headers: Record<string, string>

  constructor(baseUrl: string, apiKey: string) {
    this.root = serverRoot(baseUrl)
    this.headers = { 'Content-Type': 'application/json' }
    if (apiKey) this.headers.Authorization = `Bearer ${apiKey}`
  }

  private request(path: string, body: Json | null, signal?: AbortSignal): Promise<Response> {
    return fetchOrThrow(
      `${this.root}${path}`,
      {
        method: body ? 'POST' : 'GET',
        headers: this.headers,
        body: body && JSON.stringify(body),
        signal
      },
      `Could not reach Ollama at ${this.root}. Check that it is running and accepts requests from this page (OLLAMA_ORIGINS and the browser's local network permission).`
    )
  }

  async checkAvailability(signal?: AbortSignal) {
    try {
      await this.request('/api/version', null, signal)
      return { isAvailable: true }
    } catch (error) {
      return { isAvailable: false, reason: (error as Error).message }
    }
  }

  async listModels(signal?: AbortSignal): Promise<ModelInfo[]> {
    const tags = (await (await this.request('/api/tags', null, signal)).json()) as Json
    return Promise.all(
      (tags.models ?? []).map(async (entry: Json) => {
        // Details are optional: older servers do not report capabilities
        const details = (await this.request('/api/show', { model: entry.name }, signal)
          .then((response) => response.json())
          .catch(() => ({}))) as Json
        const capabilities: string[] = details.capabilities ?? []
        const contextKey = Object.keys(details.model_info ?? {}).find((key) =>
          key.endsWith('.context_length')
        )
        return nativeModel(entry.name, entry.name, {
          sizeBytes: entry.size,
          // Weights are loaded completely; context adds to it
          memoryBytes: entry.size,
          parameterSize: entry.details?.parameter_size,
          quantization: entry.details?.quantization_level,
          contextWindow: contextKey ? details.model_info[contextKey] : undefined,
          capabilities: {
            structuredOutput: 'schema',
            toolCalling: capabilities.includes('tools'),
            reasoning: capabilities.includes('thinking'),
            vision: capabilities.includes('vision')
          }
        })
      })
    )
  }

  async *streamChat(request: ChatRequest): AsyncGenerator<ChatEvent, void, void> {
    const response = await this.request(
      '/api/chat',
      buildOllamaRequestBody(request),
      request.signal
    )
    let toolCallCount = 0
    for await (const chunk of readJsonLines(response, request.signal)) {
      if (chunk.error) throw new LlmError('server', chunk.error)
      if (chunk.message?.thinking) yield { type: 'reasoning', text: chunk.message.thinking }
      if (chunk.message?.content) yield { type: 'text', text: chunk.message.content }
      for (const call of chunk.message?.tool_calls ?? []) {
        toolCallCount++
        yield {
          type: 'tool-call',
          toolCall: {
            id: `call_${toolCallCount}`,
            name: call.function.name,
            arguments: JSON.stringify(call.function.arguments ?? {})
          }
        }
      }
      if (!chunk.done) continue
      const stopReason = chunk.done_reason === 'length' ? 'length' : 'stop'
      yield {
        type: 'finish',
        finishReason: toolCallCount ? 'tool-calls' : stopReason,
        usage: { inputTokens: chunk.prompt_eval_count, outputTokens: chunk.eval_count }
      }
    }
  }
}

class LmStudioProvider extends OpenAiCompatibleProvider {
  readonly mode = 'native'

  constructor(baseUrl: string, apiKey: string) {
    super('lmstudio', NATIVE_SERVER_NAMES.lmstudio, baseUrl, apiKey)
  }

  protected override get unreachableHint(): string {
    return `Could not reach LM Studio at ${this.baseUrl}. Check that its local server is running with "Enable CORS" switched on, and that the browser may access the local network.`
  }

  /** The native model list adds sizes, context lengths, and capabilities to the OpenAI one. */
  override async listModels(signal?: AbortSignal): Promise<ModelInfo[]> {
    let body: Json
    try {
      const response = await fetchOrThrow(
        `${serverRoot(this.baseUrl)}/api/v1/models`,
        { signal },
        this.unreachableHint
      )
      body = (await response.json()) as Json
    } catch (error) {
      if (error instanceof LlmError && ['aborted', 'network'].includes(error.code)) throw error
      return super.listModels(signal)
    }
    return (body.models ?? [])
      .filter((entry: Json) => entry.type === 'llm')
      .map((entry: Json) =>
        nativeModel(entry.key, entry.display_name ?? entry.key, {
          sizeBytes: entry.size_bytes,
          memoryBytes: entry.size_bytes,
          parameterSize: entry.params_string,
          quantization: entry.quantization?.name ?? entry.quantization,
          contextWindow:
            entry.loaded_instances?.[0]?.config?.context_length ?? entry.max_context_length,
          capabilities: {
            structuredOutput: 'schema',
            toolCalling: entry.capabilities?.trained_for_tool_use,
            vision: entry.capabilities?.vision
          }
        })
      )
  }
}

class GenericNativeProvider extends OpenAiCompatibleProvider {
  readonly mode = 'native'

  constructor(kind: 'llamacpp' | 'openai-compatible', baseUrl: string, apiKey: string) {
    super(kind, NATIVE_SERVER_NAMES[kind], baseUrl, apiKey)
  }

  protected override describeModel(entry: Json): ModelInfo {
    // llama.cpp reports the loaded model's metadata
    return nativeModel(entry.id, String(entry.id).split(/[\\/]/).pop() ?? entry.id, {
      sizeBytes: entry.meta?.size,
      memoryBytes: entry.meta?.size,
      contextWindow: entry.meta?.n_ctx_train
    })
  }

  /** llama.cpp serves one model with a context size fixed at start-up. */
  override async listModels(signal?: AbortSignal): Promise<ModelInfo[]> {
    const models = await super.listModels(signal)
    if (this.id !== 'llamacpp') return models
    const properties = (await fetchOrThrow(`${serverRoot(this.baseUrl)}/props`, { signal }, '')
      .then((response) => response.json())
      .catch(() => ({}))) as Json
    const contextWindow = properties.default_generation_settings?.n_ctx
    return models.map((model) => ({
      ...model,
      contextWindow: contextWindow ?? model.contextWindow,
      capabilities: { ...model.capabilities, structuredOutput: 'schema' as const }
    }))
  }
}

export function createNativeProvider(
  kind: NativeServerKind,
  baseUrl: string,
  apiKey: string
): LlmProvider {
  if (kind === 'ollama') return new OllamaProvider(baseUrl, apiKey)
  if (kind === 'lmstudio') return new LmStudioProvider(baseUrl, apiKey)
  return new GenericNativeProvider(kind, baseUrl, apiKey)
}

async function respondsOk(url: string, signal: AbortSignal): Promise<Json | null> {
  try {
    const response = await fetch(url, { signal })
    return response.ok ? ((await response.json()) as Json) : null
  } catch {
    return null
  }
}

export interface NativeServer {
  kind: NativeServerKind
  baseUrl: string
  models: ModelInfo[]
}

/**
 * Identifies the server behind an endpoint and lists its models; `null` if nothing answers.
 * Only sends read requests and never changes the server's configuration.
 */
export async function probeNativeServer(
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<NativeServer | null> {
  const timeout = AbortSignal.timeout(PROBE_TIMEOUT_MS)
  const probeSignal = signal ? AbortSignal.any([signal, timeout]) : timeout
  const root = serverRoot(baseUrl)

  let kind: NativeServerKind = 'openai-compatible'
  if ((await respondsOk(`${root}/api/version`, probeSignal))?.version) kind = 'ollama'
  else if ((await respondsOk(`${root}/api/v1/models`, probeSignal))?.models) kind = 'lmstudio'
  else if ((await respondsOk(`${root}/props`, probeSignal))?.default_generation_settings) {
    kind = 'llamacpp'
  }

  try {
    const models = await createNativeProvider(kind, baseUrl, apiKey).listModels(probeSignal)
    return { kind, baseUrl, models }
  } catch {
    return null
  }
}

/** Looks for local inference servers at their default addresses. */
export async function discoverNativeServers(signal?: AbortSignal): Promise<NativeServer[]> {
  const servers = await Promise.all(
    DEFAULT_ENDPOINTS.map((baseUrl) => probeNativeServer(baseUrl, '', signal))
  )
  return servers.filter((server) => server !== null)
}

export type LocalNetworkPermission = 'granted' | 'denied' | 'prompt' | 'unknown'

/** State of the browser permission to reach servers on this device, where browsers expose it. */
export async function queryLocalNetworkPermission(): Promise<LocalNetworkPermission> {
  for (const name of ['loopback-network', 'local-network-access']) {
    try {
      return (await navigator.permissions.query({ name: name as PermissionName })).state
    } catch {
      // permission name not known to this browser
    }
  }
  return 'unknown'
}
