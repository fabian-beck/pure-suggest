import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  collectEvents,
  jsonResponse,
  mockFetchRoutes,
  streamResponse
} from '../../helpers/llmTestUtils.js'

import { createNativeProvider } from '@/llm/native.ts'

const sse = (...chunks) => chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)

describe('OpenAI-compatible provider', () => {
  let provider

  beforeEach(() => {
    provider = createNativeProvider('openai-compatible', 'http://localhost:1234/v1/', 'secret')
  })

  it('streams text, reasoning, tool calls, and usage as normalized events', async () => {
    mockFetchRoutes({
      '/chat/completions': streamResponse([
        ...sse(
          { choices: [{ delta: { reasoning_content: 'Hm' } }] },
          { choices: [{ delta: { content: 'Hel' } }] }
        ),
        // A chunk split in the middle of an event
        'data: {"choices":[{"delta":{"con',
        'tent":"lo"}}]}\n\n',
        ...sse(
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    { index: 0, id: 'c1', function: { name: 'find', arguments: '{"q":' } }
                  ]
                }
              }
            ]
          },
          {
            choices: [
              {
                delta: { tool_calls: [{ index: 0, function: { arguments: '"x"}' } }] },
                finish_reason: 'tool_calls'
              }
            ]
          },
          { choices: [], usage: { prompt_tokens: 12, completion_tokens: 5 } }
        ),
        'data: [DONE]\n\n'
      ])
    })

    const events = await collectEvents(
      provider.streamChat({ model: 'm', messages: [{ role: 'user', content: 'Hi' }] })
    )

    expect(events).toEqual([
      { type: 'reasoning', text: 'Hm' },
      { type: 'text', text: 'Hel' },
      { type: 'text', text: 'lo' },
      { type: 'tool-call', toolCall: { id: 'c1', name: 'find', arguments: '{"q":"x"}' } },
      { type: 'finish', finishReason: 'tool-calls', usage: { inputTokens: 12, outputTokens: 5 } }
    ])
  })

  it('sends sampling settings, schema, tools, and the server key', async () => {
    const fetchMock = mockFetchRoutes({
      '/chat/completions': () => streamResponse(['data: [DONE]\n\n'])
    })

    await collectEvents(
      provider.streamChat({
        model: 'm',
        messages: [
          {
            role: 'assistant',
            content: '',
            toolCalls: [{ id: 'c1', name: 'find', arguments: '{}' }]
          },
          { role: 'tool', toolCallId: 'c1', content: 'result' }
        ],
        temperature: 0.2,
        maxOutputTokens: 50,
        jsonSchema: { name: 'answer', schema: { type: 'object' } },
        tools: [{ name: 'find', description: 'Finds', parameters: { type: 'object' } }]
      })
    )

    const [url, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(url).toBe('http://localhost:1234/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer secret')
    expect(body).toMatchObject({
      stream: true,
      temperature: 0.2,
      max_tokens: 50,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'answer', strict: true, schema: { type: 'object' } }
      },
      tools: [{ type: 'function', function: { name: 'find' } }]
    })
    expect(body.messages[0].tool_calls[0]).toEqual({
      id: 'c1',
      type: 'function',
      function: { name: 'find', arguments: '{}' }
    })
    expect(body.messages[1]).toEqual({ role: 'tool', tool_call_id: 'c1', content: 'result' })
  })

  it('degrades gracefully when a server rejects optional features', async () => {
    const rejections = [
      { error: { message: "Unsupported parameter: 'temperature'" } },
      { error: { message: 'json_schema is not supported' } },
      { error: { message: 'response_format is not supported' } }
    ]
    const fetchMock = mockFetchRoutes({
      '/chat/completions': () =>
        rejections.length
          ? jsonResponse(rejections.shift(), 400)
          : streamResponse(['data: [DONE]\n\n'])
    })

    await collectEvents(
      provider.streamChat({
        model: 'm',
        messages: [],
        temperature: 0.5,
        jsonSchema: { name: 'answer', schema: {} }
      })
    )

    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))
    expect(bodies).toHaveLength(4)
    expect(bodies[1].temperature).toBeUndefined()
    expect(bodies[2].response_format).toEqual({ type: 'json_object' })
    expect(bodies[3].response_format).toBeUndefined()
  })

  it('normalizes failures into error codes', async () => {
    const request = { model: 'm', messages: [] }

    mockFetchRoutes({ '/chat/completions': jsonResponse({ error: { message: 'Bad key' } }, 401) })
    await expect(collectEvents(provider.streamChat(request))).rejects.toMatchObject({
      name: 'LlmError',
      code: 'authentication',
      message: 'Bad key',
      status: 401
    })

    mockFetchRoutes({
      '/chat/completions': jsonResponse(
        { error: { message: 'This exceeds the context window' } },
        400
      )
    })
    await expect(collectEvents(provider.streamChat(request))).rejects.toMatchObject({
      code: 'context-overflow'
    })

    mockFetchRoutes({})
    await expect(collectEvents(provider.streamChat(request))).rejects.toMatchObject({
      code: 'network',
      message: expect.stringContaining('CORS')
    })

    const controller = new AbortController()
    controller.abort()
    global.fetch = vi.fn(() => Promise.reject(new DOMException('Aborted', 'AbortError')))
    await expect(
      collectEvents(provider.streamChat({ ...request, signal: controller.signal }))
    ).rejects.toMatchObject({ code: 'aborted' })
  })
})
