import { afterEach, describe, expect, it, vi } from 'vitest'

import { cachedFetch } from '@/lib/Cache.js'

vi.mock('idb-keyval', () => ({
  keys: vi.fn(() => Promise.resolve([])),
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve())
}))

function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function jsonResponse(data) {
  return { ok: true, json: () => Promise.resolve(data) }
}

describe('cachedFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shares one network request among concurrent calls for the same URL', async () => {
    const request = deferred()
    const fetchMock = vi.fn(() => request.promise)
    vi.stubGlobal('fetch', fetchMock)

    const results = []
    const first = cachedFetch('https://api.test/dedup', (data) => results.push(data))
    const second = cachedFetch('https://api.test/dedup', (data) => results.push(data))
    request.resolve(jsonResponse({ value: 42 }))
    await Promise.all([first, second])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(results).toEqual([{ value: 42 }, { value: 42 }])
  })

  it('does not process data for concurrent calls when the shared request fails', async () => {
    const request = deferred()
    const fetchMock = vi.fn(() => request.promise)
    vi.stubGlobal('fetch', fetchMock)

    const results = []
    const first = cachedFetch('https://api.test/fail', (data) => results.push(data))
    const second = cachedFetch('https://api.test/fail', (data) => results.push(data))
    request.reject(new Error('network down'))
    await Promise.all([first, second])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(results).toEqual([])
  })

  it('retries after a failed request instead of reusing it', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    const results = []
    await cachedFetch('https://api.test/retry', (data) => results.push(data))
    expect(results).toEqual([])

    await cachedFetch('https://api.test/retry', (data) => results.push(data))
    expect(results).toEqual([{ ok: 1 }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('lets noCache requests reach the network despite an in-flight request', async () => {
    const staleRequest = deferred()
    const freshRequest = deferred()
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(freshRequest.promise)
    vi.stubGlobal('fetch', fetchMock)

    const results = []
    const first = cachedFetch('https://api.test/fresh?doi=x', (data) => results.push(data))
    const second = cachedFetch(
      'https://api.test/fresh?doi=x&noCache=true',
      (data) => results.push(data),
      undefined,
      true
    )
    staleRequest.resolve(jsonResponse({ stale: true }))
    freshRequest.resolve(jsonResponse({ fresh: true }))
    await Promise.all([first, second])

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenLastCalledWith('https://api.test/fresh?doi=x&noCache=true', {})
    expect(results).toContainEqual({ fresh: true })
  })

  it('stores noCache responses under the canonical URL for future cache hits', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ v: 'fresh' }))
    vi.stubGlobal('fetch', fetchMock)

    const results = []
    await cachedFetch(
      'https://api.test/canon?doi=y&noCache=true',
      (data) => results.push(data),
      undefined,
      true
    )
    await cachedFetch('https://api.test/canon?doi=y', (data) => results.push(data))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(results).toEqual([{ v: 'fresh' }, { v: 'fresh' }])
  })

  it('falls back to the network when no cache entry exists', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ found: true }))
    vi.stubGlobal('fetch', fetchMock)

    const results = []
    await cachedFetch('https://api.test/miss', (data) => results.push(data))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(results).toEqual([{ found: true }])
  })
})
