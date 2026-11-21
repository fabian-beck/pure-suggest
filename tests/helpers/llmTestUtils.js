import { vi } from 'vitest'

/** Fetch response whose body streams the given text chunks. */
export function streamResponse(chunks) {
  const encoder = new TextEncoder()
  return {
    ok: true,
    status: 200,
    body: new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
        controller.close()
      }
    })
  }
}

export function jsonResponse(body, status = 200) {
  return {
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body))
  }
}

/** Replaces fetch by a mock answering by URL suffix; unknown URLs fail like unreachable servers. */
export function mockFetchRoutes(routes) {
  global.fetch = vi.fn((url) => {
    const route = Object.keys(routes).find((suffix) => String(url).endsWith(suffix))
    if (!route) return Promise.reject(new TypeError('Failed to fetch'))
    const response = routes[route]
    return Promise.resolve(typeof response === 'function' ? response() : response)
  })
  return global.fetch
}

export async function collectEvents(stream) {
  const events = []
  for await (const event of stream) events.push(event)
  return events
}

/** Minimal provider answering every chat request with the given events. */
export function createFakeProvider(events) {
  return {
    id: 'fake',
    name: 'Fake',
    mode: 'native',
    location: 'local',
    streamChat: vi.fn(async function* () {
      yield* events
    })
  }
}
