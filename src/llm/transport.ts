import { LlmError, type LlmErrorCode } from './types.ts'

const CONTEXT_OVERFLOW_PATTERN =
  /context (length|window|size)|too many tokens|maximum.{0,20}tokens|prompt is too long|exceeds? the (available )?context/i

function codeFromStatus(status: number, message: string): LlmErrorCode {
  if (CONTEXT_OVERFLOW_PATTERN.test(message) || status === 413) return 'context-overflow'
  if (status === 401) return 'authentication'
  if (status === 403) return 'permission'
  if (status === 404) return 'model-not-found'
  if (status === 429) return 'rate-limit'
  if (status === 400 || status === 422) return 'invalid-request'
  if (status === 503 || status === 529) return 'unavailable'
  if (status >= 500) return 'server'
  return 'unknown'
}

/**
 * Sends a request and normalizes all failures: aborts, unreachable servers (which browsers
 * cannot tell apart from blocked cross-origin requests), and error responses.
 * @param unreachableHint What to tell the user if the server cannot be reached.
 */
export async function fetchOrThrow(
  url: string,
  init: RequestInit,
  unreachableHint: string
): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    if (init.signal?.aborted) throw new LlmError('aborted', 'The request was cancelled.')
    throw new LlmError('network', unreachableHint, undefined, error)
  }
  if (response.ok) return response

  const body = await response.text().catch(() => '')
  let message = body.slice(0, 300)
  try {
    const parsed = JSON.parse(body)
    // OpenAI-style {error: {message}}, Anthropic {error: {message}}, Ollama {error: "..."}
    const detail = parsed.error?.message ?? parsed.error ?? parsed.message ?? parsed.detail
    if (typeof detail === 'string') message = detail
    else if (detail) message = JSON.stringify(detail).slice(0, 300)
  } catch {
    // keep the raw text
  }
  throw new LlmError(
    codeFromStatus(response.status, message),
    message || `Request failed with status ${response.status}.`,
    response.status
  )
}

/** Yields the lines of a streamed response body. */
async function* readLines(response: Response, signal?: AbortSignal): AsyncGenerator<string, void, void> {
  if (!response.body) throw new LlmError('invalid-response', 'The server sent an empty response.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const lines = buffer.split(/\r?\n/)
      buffer = done ? '' : (lines.pop() ?? '')
      yield* lines
      if (done) return
    }
  } catch (error) {
    if (signal?.aborted) throw new LlmError('aborted', 'The request was cancelled.')
    if (error instanceof LlmError) throw error
    throw new LlmError('network', 'The connection was lost while receiving the answer.', undefined, error)
  } finally {
    reader.cancel().catch(() => {})
  }
}

/** Yields the `data` payloads of a server-sent event stream. */
export async function* readServerSentEvents(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<string, void, void> {
  for await (const line of readLines(response, signal)) {
    if (line.startsWith('data:')) yield line.slice(5).trim()
  }
}

/** Yields the objects of a stream of newline-delimited JSON. */
export async function* readJsonLines(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<Record<string, any>, void, void> { // eslint-disable-line @typescript-eslint/no-explicit-any
  for await (const line of readLines(response, signal)) {
    if (line.trim()) yield JSON.parse(line)
  }
}

/** Removes trailing slashes, so that paths can be appended to a base URL. */
export function trimTrailingSlashes(url: string): string {
  let end = url.length
  while (url[end - 1] === '/') end--
  return url.slice(0, end)
}

/** Whether a URL points to this device, so that data sent to it does not leave the machine. */
export function isLoopbackUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === 'localhost' || hostname === '[::1]' || /^127(\.\d{1,3}){3}$/.test(hostname)
  } catch {
    return false
  }
}
