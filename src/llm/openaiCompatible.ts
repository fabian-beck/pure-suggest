import {
  fetchOrThrow,
  isLoopbackUrl,
  readServerSentEvents,
  trimTrailingSlashes
} from './transport.ts'
import {
  LlmError,
  type Availability,
  type ChatEvent,
  type ChatMessage,
  type ChatRequest,
  type FinishReason,
  type InferenceMode,
  type LlmProvider,
  type ModelInfo,
  type ProcessingLocation,
  type ToolCall
} from './types.ts'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const FINISH_REASONS: Record<string, FinishReason> = {
  stop: 'stop',
  length: 'length',
  tool_calls: 'tool-calls',
  content_filter: 'content-filter'
}

// Optional request fields that some servers and models reject; dropped one at a time on
// rejection, as OpenAI-compatible servers differ too much to know their support in advance
const OPTIONAL_PARAMETERS = [
  'temperature',
  'top_p',
  'seed',
  'reasoning_effort',
  'stream_options'
] as const

function toWireMessage(message: ChatMessage): Json {
  if (message.role === 'tool') {
    return { role: 'tool', tool_call_id: message.toolCallId, content: message.content }
  }
  if (message.role === 'assistant' && message.toolCalls?.length) {
    return {
      role: 'assistant',
      content: message.content,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: call.arguments }
      }))
    }
  }
  return { role: message.role, content: message.content }
}

function parseChunk(data: string): Json {
  let chunk: Json
  try {
    chunk = JSON.parse(data)
  } catch {
    return {} // keep-alive comments and partial lines carry no content
  }
  if (chunk.error) {
    throw new LlmError('server', chunk.error.message ?? JSON.stringify(chunk.error))
  }
  return chunk
}

/** Tool calls arrive in fragments addressed by index; arguments are concatenated. */
function mergeToolCallParts(toolCalls: ToolCall[], parts: Json[]): void {
  for (const part of parts) {
    const call = (toolCalls[part.index ?? 0] ??= { id: '', name: '', arguments: '' })
    if (part.id) call.id = part.id
    if (part.function?.name) call.name = part.function.name
    if (part.function?.arguments) call.arguments += part.function.arguments
  }
}

/**
 * Chat completions against any server speaking the OpenAI REST dialect: local servers
 * (LM Studio, llama.cpp), cloud services, and user-configured endpoints.
 */
export abstract class OpenAiCompatibleProvider implements LlmProvider {
  readonly id: string
  readonly name: string
  abstract readonly mode: InferenceMode
  readonly location: ProcessingLocation
  protected readonly baseUrl: string
  private readonly apiKey: string

  constructor(id: string, name: string, baseUrl: string, apiKey: string) {
    this.id = id
    this.name = name
    this.baseUrl = trimTrailingSlashes(baseUrl)
    this.apiKey = apiKey
    this.location = isLoopbackUrl(this.baseUrl) ? 'local' : 'remote'
  }

  /** Name of the request field limiting the answer length. */
  protected get outputLimitParameter(): string {
    return 'max_tokens'
  }

  protected get unreachableHint(): string {
    return this.location === 'local'
      ? `Could not reach ${this.name} at ${this.baseUrl}. Check that the server is running and accepts requests from this page (CORS and the browser's local network permission).`
      : `Could not reach ${this.name}. Check your internet connection.`
  }

  protected request(path: string, init: RequestInit): Promise<Response> {
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) }
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`
    return fetchOrThrow(`${this.baseUrl}${path}`, { ...init, headers }, this.unreachableHint)
  }

  async checkAvailability(signal?: AbortSignal): Promise<Availability> {
    try {
      await this.listModels(signal)
      return { isAvailable: true }
    } catch (error) {
      return { isAvailable: false, reason: (error as Error).message }
    }
  }

  /** Turns an entry of the model list into a model description; `null` skips the entry. */
  protected describeModel(entry: Json): ModelInfo | null {
    return {
      id: entry.id,
      name: entry.id,
      isPreferred: false,
      isAvailable: true,
      capabilities: {}
    }
  }

  async listModels(signal?: AbortSignal): Promise<ModelInfo[]> {
    const response = await this.request('/models', { signal })
    const body = (await response.json().catch(() => null)) as Json | null
    if (!Array.isArray(body?.data)) {
      throw new LlmError('invalid-response', `${this.name} did not return a model list.`)
    }
    return body.data
      .map((entry: Json) => this.describeModel(entry))
      .filter((model: ModelInfo | null) => model !== null)
  }

  protected buildRequestBody(request: ChatRequest): Json {
    const body: Json = {
      model: request.model,
      messages: request.messages.map(toWireMessage),
      stream: true,
      stream_options: { include_usage: true }
    }
    if (request.temperature !== undefined) body.temperature = request.temperature
    if (request.topP !== undefined) body.top_p = request.topP
    if (request.seed !== undefined) body.seed = request.seed
    if (request.reasoningEffort) body.reasoning_effort = request.reasoningEffort
    if (request.maxOutputTokens) body[this.outputLimitParameter] = request.maxOutputTokens
    if (request.jsonSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: { name: request.jsonSchema.name, strict: true, schema: request.jsonSchema.schema }
      }
    }
    if (request.tools?.length) {
      body.tools = request.tools.map((tool) => ({ type: 'function', function: tool }))
    }
    return body
  }

  /**
   * Sends the chat request and, if the server rejects it as invalid, retries with the
   * rejected optional feature removed: first the named sampling parameter, then schema
   * constraints (falling back to plain JSON mode, then to prompt-only JSON).
   */
  private async sendChatRequest(body: Json, signal?: AbortSignal): Promise<Response> {
    for (;;) {
      try {
        return await this.request('/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal
        })
      } catch (error) {
        if (!(error instanceof LlmError) || error.code !== 'invalid-request') throw error
        const rejected = OPTIONAL_PARAMETERS.find(
          (parameter) => parameter in body && error.message.includes(parameter)
        )
        if (rejected) delete body[rejected]
        else if (body.response_format?.type === 'json_schema') {
          body.response_format = { type: 'json_object' }
        } else if (body.response_format) delete body.response_format
        else throw error
      }
    }
  }

  async *streamChat(request: ChatRequest): AsyncGenerator<ChatEvent, void, void> {
    const response = await this.sendChatRequest(this.buildRequestBody(request), request.signal)
    const toolCalls: ToolCall[] = []
    let finishReason: FinishReason = 'unknown'
    let usage = {}

    for await (const data of readServerSentEvents(response, request.signal)) {
      if (data === '[DONE]') break
      const chunk = parseChunk(data)
      if (chunk.usage) {
        usage = {
          inputTokens: chunk.usage.prompt_tokens,
          outputTokens: chunk.usage.completion_tokens
        }
      }
      const choice = chunk.choices?.[0]
      if (!choice) continue
      const delta = choice.delta ?? {}
      const reasoning = delta.reasoning_content ?? delta.reasoning
      if (typeof reasoning === 'string' && reasoning) yield { type: 'reasoning', text: reasoning }
      if (typeof delta.content === 'string' && delta.content) {
        yield { type: 'text', text: delta.content }
      }
      mergeToolCallParts(toolCalls, delta.tool_calls ?? [])
      if (choice.finish_reason) {
        finishReason = FINISH_REASONS[choice.finish_reason] ?? 'unknown'
      }
    }

    for (const toolCall of toolCalls.filter(Boolean)) yield { type: 'tool-call', toolCall }
    yield { type: 'finish', finishReason, usage }
  }
}
