import {
  LlmError,
  type ChatEvent,
  type ChatRequest,
  type ChatResult,
  type LlmProvider
} from './types.ts'

// Answers shorter than this (in seconds and tokens) are too noisy to derive a speed from
const MIN_MEASURED_SECONDS = 0.5
const MIN_MEASURED_TOKENS = 8

/** Rough token count of a text for budgeting prompts, erring on the high side. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

/**
 * Runs a chat request to completion on any provider, forwarding the streamed events and
 * measuring the generation speed.
 */
export async function completeChat(
  provider: LlmProvider,
  request: ChatRequest,
  onEvent?: (event: ChatEvent) => void
): Promise<ChatResult> {
  const result: ChatResult = {
    text: '',
    reasoning: '',
    toolCalls: [],
    finishReason: 'unknown',
    usage: {}
  }
  let firstOutputAt = 0
  let isFinished = false

  for await (const event of provider.streamChat(request)) {
    if (event.type === 'text' || event.type === 'reasoning') {
      firstOutputAt ||= performance.now()
      if (event.type === 'text') result.text += event.text
      else result.reasoning += event.text
    } else if (event.type === 'tool-call') result.toolCalls.push(event.toolCall)
    else {
      isFinished = true
      result.finishReason = event.finishReason
      result.usage = event.usage
    }
    onEvent?.(event)
  }
  if (!isFinished) {
    throw new LlmError('invalid-response', `${provider.name} ended the answer unexpectedly.`)
  }

  const seconds = firstOutputAt ? (performance.now() - firstOutputAt) / 1000 : 0
  const outputTokens = result.usage.outputTokens ?? estimateTokens(result.text + result.reasoning)
  if (seconds >= MIN_MEASURED_SECONDS && outputTokens >= MIN_MEASURED_TOKENS) {
    result.tokensPerSecond = outputTokens / seconds
  }
  return result
}

/**
 * Extracts the JSON object from a model answer. Models without constrained output tend to
 * wrap JSON in code fences or explanations, so the outermost object in the text is used.
 */
export function parseJsonAnswer(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {
      // reported below
    }
  }
  throw new LlmError('invalid-response', 'The model did not answer with valid JSON.')
}
