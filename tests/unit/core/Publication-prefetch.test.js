import { afterEach, describe, expect, it, vi } from 'vitest'

import { API_ENDPOINTS } from '@/constants/config.js'
import Publication from '@/core/Publication.js'

// Use the real Cache layer (cacheBulk/cachedFetch) with IndexedDB stubbed out,
// so cache hits/misses come purely from the mocked network.
vi.mock('idb-keyval', () => ({
  keys: vi.fn(() => Promise.resolve([])),
  get: vi.fn(() => Promise.resolve(undefined)),
  getMany: vi.fn((requestedKeys) => Promise.resolve(requestedKeys.map(() => undefined))),
  set: vi.fn(() => Promise.resolve()),
  setMany: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve())
}))

function jsonResponse(data) {
  return { ok: true, json: () => Promise.resolve(data) }
}

// Extracts the requested DOIs from a bulk request (GET query or POST body)
function doisFromRequest(url, options) {
  if (options?.body) return JSON.parse(options.body).dois
  return decodeURIComponent(new URL(url).searchParams.get('dois')).split(',')
}

// Answers any bulk request with one title per requested DOI
function bulkFetchMock() {
  return vi.fn((url, options) =>
    Promise.resolve(
      jsonResponse(doisFromRequest(url, options).map((doi) => ({ title: `Title ${doi}` })))
    )
  )
}

describe('Publication.prefetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('warms the per-DOI cache with one bulk request, making fetchData a cache hit', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([{ title: 'First' }, { title: 'Second' }])
    )
    vi.stubGlobal('fetch', fetchMock)

    const publications = [new Publication('10.1000/one'), new Publication('10.1000/two')]
    await Publication.prefetch(publications)

    // A single bulk request covered both DOIs
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [requestUrl] = fetchMock.mock.calls[0]
    expect(requestUrl).toContain('dois=')
    expect(requestUrl).toContain(API_ENDPOINTS.PUBLICATIONS)

    // Individual fetches now resolve from cache without further network calls
    await publications[0].fetchData()
    await publications[1].fetchData()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(publications[0].title).toBe('First')
    expect(publications[1].title).toBe('Second')
  })

  it('skips publications that were already fetched', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const publication = new Publication('10.1000/done')
    publication.wasFetched = true

    await Publication.prefetch([publication])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('splits large batches into chunked bulk requests', async () => {
    const fetchMock = bulkFetchMock()
    vi.stubGlobal('fetch', fetchMock)

    const publications = Array.from({ length: 24 }, (_, i) => new Publication(`10.1000/chunk-${i}`))
    await Publication.prefetch(publications)
    expect(fetchMock).toHaveBeenCalledTimes(3) // 10 + 10 + 4

    // All publications were cached, so individual fetches need no further network calls
    await Promise.all(publications.map((publication) => publication.fetchData()))
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(publications[23].title).toBe('Title 10.1000/chunk-23')
  })

  it('continues with remaining chunks when one bulk request fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = bulkFetchMock().mockResolvedValueOnce({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)

    const publications = Array.from({ length: 20 }, (_, i) => new Publication(`10.1000/fail-chunk-${i}`))
    await Publication.prefetch(publications)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(warnSpy).toHaveBeenCalledTimes(1)

    // The second chunk was still cached despite the first one failing
    await publications[19].fetchData()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(publications[19].title).toBe('Title 10.1000/fail-chunk-19')

    warnSpy.mockRestore()
  })

  it('degrades gracefully when the bulk request fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)

    const publication = new Publication('10.1000/fail')
    await expect(Publication.prefetch([publication])).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()
    expect(publication.wasFetched).toBe(false)

    warnSpy.mockRestore()
  })
})

describe('Publication.fetchAll', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads all publications with one bulk request per chunk and reports progress', async () => {
    const fetchMock = bulkFetchMock()
    vi.stubGlobal('fetch', fetchMock)

    const publications = Array.from({ length: 20 }, (_, i) => new Publication(`10.1000/all-${i}`))
    const loadedDois = []
    await Publication.fetchAll(publications, (publication) => loadedDois.push(publication.doi))

    // Only the two bulk requests hit the network; the individual fetches were cache hits
    expect(fetchMock).toHaveBeenCalledTimes(2)
    fetchMock.mock.calls.forEach(([url, options]) => {
      expect(options?.body || url).toContain('dois')
    })

    expect(loadedDois).toHaveLength(20)
    expect(publications.every((publication) => publication.wasFetched)).toBe(true)
    expect(publications[0].title).toBe('Title 10.1000/all-0')
  })
})
