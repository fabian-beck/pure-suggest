import { afterEach, describe, expect, it, vi } from 'vitest'

import { cacheBulk, cachedFetch } from '@/lib/Cache.js'

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
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/fresh?doi=x&noCache=true', {})
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/fresh?doi=x', {})
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

describe('cacheBulk', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches all uncached URLs in a single bulk call and writes them back', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const urls = ['https://api.test/bulk?doi=a', 'https://api.test/bulk?doi=b']
    const bulkFetch = vi.fn(async (missed) => {
      expect(missed).toEqual(urls)
      return new Map([
        [urls[0], { doi: 'a' }],
        [urls[1], { doi: 'b' }]
      ])
    })

    await cacheBulk(urls, bulkFetch)
    expect(bulkFetch).toHaveBeenCalledTimes(1)

    // Written-back entries turn later single fetches into cache hits (no network)
    const results = []
    await cachedFetch(urls[0], (data) => results.push(data))
    await cachedFetch(urls[1], (data) => results.push(data))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(results).toEqual([{ doi: 'a' }, { doi: 'b' }])
  })

  it('skips URLs already cached and only requests the misses', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const cachedUrl = 'https://api.test/skip?doi=cached'
    const missUrl = 'https://api.test/skip?doi=miss'

    // Prime the cache for one URL via a bulk call
    await cacheBulk([cachedUrl], async () => new Map([[cachedUrl, { doi: 'cached' }]]))

    const bulkFetch = vi.fn(async (missed) => {
      expect(missed).toEqual([missUrl])
      return new Map([[missUrl, { doi: 'miss' }]])
    })
    await cacheBulk([cachedUrl, missUrl], bulkFetch)
    expect(bulkFetch).toHaveBeenCalledTimes(1)
  })

  it('does nothing when every URL is already cached', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const url = 'https://api.test/allcached?doi=x'
    await cacheBulk([url], async () => new Map([[url, { doi: 'x' }]]))

    const bulkFetch = vi.fn()
    await cacheBulk([url], bulkFetch)
    expect(bulkFetch).not.toHaveBeenCalled()
  })
})
