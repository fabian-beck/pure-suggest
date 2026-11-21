import type Anthropic from '@anthropic-ai/sdk'

import { preferredDeveloper, type CloudService } from './catalog.ts'
import { OpenAiCompatibleProvider } from './openaiCompatible.ts'
import {
  LlmError,
  type Availability,
  type ChatEvent,
  type ChatMessage,
  type ChatRequest,
  type FinishReason,
  type LlmErrorCode,
  type LlmProvider,
  type ModelInfo,
  type ToolCall
} from './types.ts'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

// Entries of the services' model lists that are no chat models
const NON_CHAT_MODEL_PATTERN =
  /embed|whisper|tts|dall-e|image|audio|realtime|moderation|transcribe|sora|veo|imagen|babbage|davinci|aqa|ocr|live/i

class CloudOpenAiProvider extends OpenAiCompatibleProvider {
  readonly mode = 'cloud'

  constructor(service: CloudService, baseUrl: string, apiKey: string) {
    super(service.id, service.name, baseUrl, apiKey)
  }

  // OpenAI's current models only accept the newer name of the output limit
  protected override get outputLimitParameter(): string {
    return this.id === 'openai' ? 'max_completion_tokens' : 'max_tokens'
  }

  protected override describeModel(entry: Json): ModelInfo | null {
    const id = String(entry.id).replace(/^models\//, '') // Gemini prefixes its ids
    if (NON_CHAT_MODEL_PATTERN.test(id)) return null
    if (entry.capabilities && entry.capabilities.completion_chat === false) return null // Mistral
    const developer = preferredDeveloper(id)
    const supportedParameters: string[] | undefined = entry.supported_parameters // OpenRouter
    return {
      id,
      name: entry.display_name ?? entry.name ?? id,
      developer,
      isPreferred: Boolean(developer),
      isAvailable: true,
      contextWindow: entry.context_length ?? entry.max_context_length,
      capabilities: supportedParameters
        ? {
            structuredOutput: supportedParameters.includes('structured_outputs') ? 'schema' : 'none',
            toolCalling: supportedParameters.includes('tools'),
            reasoning: supportedParameters.includes('reasoning')
          }
        : {
            toolCalling: entry.capabilities?.function_calling,
            vision: entry.capabilities?.vision,
            // OpenAI's model list carries no capabilities; its reasoning models go by name
            reasoning: this.id === 'openai' ? /^(o\d|gpt-5)/.test(id) : undefined
          }
    }
  }
}

const ANTHROPIC_STOP_REASONS: Record<string, FinishReason> = {
  end_turn: 'stop',
  stop_sequence: 'stop',
  max_tokens: 'length',
  tool_use: 'tool-calls',
  refusal: 'content-filter'
}

const ANTHROPIC_MAX_OUTPUT_TOKENS = 16000

function toAnthropicMessage(message: ChatMessage): Anthropic.MessageParam {
  if (message.role === 'tool') {
    return {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: message.toolCallId, content: message.content }]
    }
  }
  if (message.role === 'assistant' && message.toolCalls?.length) {
    return {
      role: 'assistant',
      content: [
        ...(message.content ? [{ type: 'text' as const, text: message.content }] : []),
        ...message.toolCalls.map((call) => ({
          type: 'tool_use' as const,
          id: call.id,
          name: call.name,
          input: JSON.parse(call.arguments || '{}')
        }))
      ]
    }
  }
  return { role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content }
}

function buildAnthropicParams(request: ChatRequest): Anthropic.MessageStreamParams {
  // Sampling parameters are not sent: current Claude models reject non-default values
  const params: Anthropic.MessageStreamParams = {
    model: request.model,
    max_tokens: request.maxOutputTokens ?? ANTHROPIC_MAX_OUTPUT_TOKENS,
    messages: request.messages
      .filter((message) => message.role !== 'system')
      .map(toAnthropicMessage)
  }
  const system = request.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n')
  if (system) params.system = system
  if (request.tools?.length) {
    params.tools = request.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Tool.InputSchema
    }))
  }
  if (request.jsonSchema || request.reasoningEffort) {
    params.output_config = {}
    if (request.reasoningEffort) params.output_config.effort = request.reasoningEffort
    if (request.jsonSchema) {
      params.output_config.format = { type: 'json_schema', schema: request.jsonSchema.schema }
    }
  }
  return params
}

/** Claude through Anthropic's Messages API, called directly from the browser with the user's key. */
class AnthropicProvider implements LlmProvider {
  readonly id = 'anthropic'
  readonly name = 'Anthropic'
  readonly mode = 'cloud'
  readonly location = 'remote'
  private readonly apiKey: string
  private client?: Promise<Anthropic>

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /** The SDK is only loaded once Anthropic is actually used. */
  private getClient(): Promise<Anthropic> {
    this.client ??= import('@anthropic-ai/sdk').then(
      (sdk) => new sdk.default({ apiKey: this.apiKey, dangerouslyAllowBrowser: true })
    )
    return this.client
  }

  private async toLlmError(error: unknown, signal?: AbortSignal): Promise<LlmError> {
    if (error instanceof LlmError) return error
    const { default: sdk } = await import('@anthropic-ai/sdk')
    if (signal?.aborted || error instanceof sdk.APIUserAbortError) {
      return new LlmError('aborted', 'The request was cancelled.')
    }
    let code: LlmErrorCode = 'unknown'
    if (error instanceof sdk.AuthenticationError) code = 'authentication'
    else if (error instanceof sdk.PermissionDeniedError) code = 'permission'
    else if (error instanceof sdk.NotFoundError) code = 'model-not-found'
    else if (error instanceof sdk.RateLimitError) code = 'rate-limit'
    else if (error instanceof sdk.BadRequestError) code = 'invalid-request'
    else if (error instanceof sdk.InternalServerError) code = 'server'
    else if (error instanceof sdk.APIConnectionError) code = 'network'
    const status = error instanceof sdk.APIError ? error.status : undefined
    return new LlmError(code, (error as Error).message, status, error)
  }

  async checkAvailability(signal?: AbortSignal): Promise<Availability> {
    try {
      await this.listModels(signal)
      return { isAvailable: true }
    } catch (error) {
      return { isAvailable: false, reason: (error as Error).message }
    }
  }

  async listModels(signal?: AbortSignal): Promise<ModelInfo[]> {
    try {
      const client = await this.getClient()
      const models: ModelInfo[] = []
      for await (const model of client.models.list({ limit: 100 }, { signal })) {
        const capabilities = model.capabilities
        models.push({
          id: model.id,
          name: model.display_name,
          developer: 'Anthropic',
          isPreferred: true,
          isAvailable: true,
          contextWindow: model.max_input_tokens ?? undefined,
          capabilities: {
            structuredOutput: capabilities?.structured_outputs?.supported ? 'schema' : 'none',
            toolCalling: true,
            reasoning: capabilities?.effort?.supported,
            vision: capabilities?.image_input?.supported
          }
        })
      }
      return models
    } catch (error) {
      throw await this.toLlmError(error, signal)
    }
  }

  async *streamChat(request: ChatRequest): AsyncGenerator<ChatEvent, void, void> {
    const params = buildAnthropicParams(request)
    try {
      const client = await this.getClient()
      const stream = client.messages.stream(params, { signal: request.signal })
      for await (const event of stream) {
        if (event.type !== 'content_block_delta') continue
        if (event.delta.type === 'text_delta') yield { type: 'text', text: event.delta.text }
        else if (event.delta.type === 'thinking_delta' && event.delta.thinking) {
          yield { type: 'reasoning', text: event.delta.thinking }
        }
      }
      const message = await stream.finalMessage()
      for (const block of message.content) {
        if (block.type !== 'tool_use') continue
        const toolCall: ToolCall = {
          id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input)
        }
        yield { type: 'tool-call', toolCall }
      }
      yield {
        type: 'finish',
        finishReason: ANTHROPIC_STOP_REASONS[message.stop_reason ?? ''] ?? 'unknown',
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens
        }
      }
    } catch (error) {
      throw await this.toLlmError(error, request.signal)
    }
  }
}

export function createCloudProvider(
  service: CloudService,
  customBaseUrl: string,
  apiKey: string
): LlmProvider {
  if (service.api === 'anthropic') return new AnthropicProvider(apiKey)
  return new CloudOpenAiProvider(service, service.baseUrl || customBaseUrl, apiKey)
}
