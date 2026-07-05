import { afterEach, describe, expect, it, vi } from 'vitest'

import { API_ENDPOINTS } from '@/constants/config.js'
import Publication from '@/core/Publication.js'

// Use the real Cache layer (cacheBulk/cachedFetch) with IndexedDB stubbed out,
// so cache hits/misses come purely from the mocked network.
vi.mock('idb-keyval', () => ({
  keys: vi.fn(() => Promise.resolve([])),
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve())
}))

function jsonResponse(data) {
  return { ok: true, json: () => Promise.resolve(data) }
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
