import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  collectEvents,
  jsonResponse,
  mockFetchRoutes,
  streamResponse
} from '../../helpers/llmTestUtils.js'

import { CLOUD_SERVICES } from '@/llm/catalog.ts'
import { createCloudProvider } from '@/llm/cloud.ts'

const anthropic = vi.hoisted(() => ({ stream: vi.fn(), options: null }))

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    constructor(status, message) {
      super(message)
      this.status = status
    }
  }
  class AuthenticationError extends APIError {}
  class Anthropic {
    static APIError = APIError
    static AuthenticationError = AuthenticationError
    static APIUserAbortError = class extends Error {}
    static PermissionDeniedError = class extends APIError {}
    static NotFoundError = class extends APIError {}
    static RateLimitError = class extends APIError {}
    static BadRequestError = class extends APIError {}
    static InternalServerError = class extends APIError {}
    static APIConnectionError = class extends APIError {}
    constructor(options) {
      anthropic.options = options
      this.messages = { stream: anthropic.stream }
    }
  }
  return { default: Anthropic }
})

const service = (id) => CLOUD_SERVICES.find((candidate) => candidate.id === id)

describe('cloud providers', () => {
  beforeEach(() => {
    anthropic.stream.mockReset()
  })

  it('lists only chat models and marks cloud processing as remote', async () => {
    mockFetchRoutes({
      '/v1beta/openai/models': jsonResponse({
        data: [{ id: 'models/gemini-flash-latest' }, { id: 'models/gemini-embedding-001' }]
      })
    })
    const provider = createCloudProvider(service('google'), '', 'key')

    const models = await provider.listModels()

    expect(provider.mode).toBe('cloud')
    expect(provider.location).toBe('remote')
    expect(models.map((model) => model.id)).toEqual(['gemini-flash-latest'])
    expect(models[0].developer).toBe('Google')
  })

  it('uses the output limit name OpenAI models require', async () => {
    const fetchMock = mockFetchRoutes({
      '/chat/completions': streamResponse(['data: [DONE]\n\n'])
    })

    await collectEvents(
      createCloudProvider(service('openai'), '', 'key').streamChat({
        model: 'gpt-5.4',
        messages: [],
        maxOutputTokens: 300
      })
    )

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.max_completion_tokens).toBe(300)
    expect(body.max_tokens).toBeUndefined()
  })

  it('calls Anthropic through its SDK with schema output and without sampling parameters', async () => {
    anthropic.stream.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: '{"a":1}' } }
      },
      finalMessage: () =>
        Promise.resolve({
          content: [{ type: 'text', text: '{"a":1}' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 20, output_tokens: 6 }
        })
    })
    const provider = createCloudProvider(service('anthropic'), '', 'sk-ant')

    const events = await collectEvents(
      provider.streamChat({
        model: 'claude-opus-5-5',
        messages: [
          { role: 'system', content: 'Be brief.' },
          { role: 'user', content: 'Hi' }
        ],
        temperature: 0.3,
        reasoningEffort: 'low',
        jsonSchema: { name: 'answer', schema: { type: 'object' } }
      })
    )

    expect(anthropic.options).toEqual({ apiKey: 'sk-ant', dangerouslyAllowBrowser: true })
    const [params] = anthropic.stream.mock.calls[0]
    expect(params).toMatchObject({
      model: 'claude-opus-5-5',
      system: 'Be brief.',
      messages: [{ role: 'user', content: 'Hi' }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: { type: 'object' } } }
    })
    expect(params.temperature).toBeUndefined()
    expect(events).toEqual([
      { type: 'text', text: '{"a":1}' },
      { type: 'finish', finishReason: 'stop', usage: { inputTokens: 20, outputTokens: 6 } }
    ])
  })

  it('normalizes Anthropic errors and reports refusals', async () => {
    const provider = createCloudProvider(service('anthropic'), '', 'bad')
    const { default: sdk } = await import('@anthropic-ai/sdk')

    anthropic.stream.mockImplementation(() => {
      throw new sdk.AuthenticationError(401, 'invalid x-api-key')
    })
    await expect(
      collectEvents(provider.streamChat({ model: 'm', messages: [] }))
    ).rejects.toMatchObject({ name: 'LlmError', code: 'authentication', status: 401 })

    anthropic.stream.mockReturnValue({
      async *[Symbol.asyncIterator]() {},
      finalMessage: () =>
        Promise.resolve({ content: [], stop_reason: 'refusal', usage: { input_tokens: 1, output_tokens: 0 } })
    })
    const events = await collectEvents(provider.streamChat({ model: 'm', messages: [] }))
    expect(events.at(-1).finishReason).toBe('content-filter')
  })
})
