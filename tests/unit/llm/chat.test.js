import { describe, it, expect, vi } from 'vitest'

import { createFakeProvider } from '../../helpers/llmTestUtils.js'

import { completeChat, parseJsonAnswer } from '@/llm/chat.ts'

describe('completeChat', () => {
  it('collects the streamed answer and measures the generation speed', async () => {
    const now = vi.spyOn(performance, 'now')
    now.mockReturnValueOnce(1000).mockReturnValue(3000)
    const provider = createFakeProvider([
      { type: 'reasoning', text: 'thinking' },
      { type: 'text', text: 'Hello ' },
      { type: 'text', text: 'world' },
      { type: 'tool-call', toolCall: { id: '1', name: 'find', arguments: '{}' } },
      { type: 'finish', finishReason: 'stop', usage: { inputTokens: 10, outputTokens: 40 } }
    ])
    const onEvent = vi.fn()

    const result = await completeChat(provider, { model: 'm', messages: [] }, onEvent)

    expect(result).toMatchObject({
      text: 'Hello world',
      reasoning: 'thinking',
      toolCalls: [{ name: 'find' }],
      finishReason: 'stop',
      tokensPerSecond: 20
    })
    expect(onEvent).toHaveBeenCalledTimes(5)
    now.mockRestore()
  })

  it('rejects answers that end without completion', async () => {
    const provider = createFakeProvider([{ type: 'text', text: 'Hel' }])

    await expect(completeChat(provider, { model: 'm', messages: [] })).rejects.toMatchObject({
      code: 'invalid-response'
    })
  })
})

describe('parseJsonAnswer', () => {
  it('extracts JSON from answers of models without constrained output', () => {
    expect(parseJsonAnswer('Sure!\n```json\n{"recommendations": []}\n```')).toEqual({
      recommendations: []
    })
    expect(() => parseJsonAnswer('I cannot do that.')).toThrow('valid JSON')
  })
})
