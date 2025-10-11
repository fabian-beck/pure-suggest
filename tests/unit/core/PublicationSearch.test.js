import { describe, it, expect, vi, beforeEach } from 'vitest'

import PublicationSearch from '@/core/PublicationSearch.js'

// Mock the Cache module
vi.mock('@/lib/Cache.js', () => ({
  cachedFetch: vi.fn((url, callback) => {
    // Simulate different responses based on the URL
    if (url.includes('api.openalex.org')) {
      // OpenAlex response
      callback({
        results: [
          { doi: 'https://doi.org/10.1234/openalex-1', title: 'OpenAlex Result 1' },
          { doi: 'https://doi.org/10.1234/openalex-2', title: 'OpenAlex Result 2' }
        ]
      })
    } else if (url.includes('api.crossref.org')) {
      // CrossRef response
      callback({
        message: {
          items: [
            { DOI: '10.1234/crossref-1', title: 'CrossRef Result 1' },
            { DOI: '10.1234/crossref-2', title: 'CrossRef Result 2' }
          ]
        }
      })
    }
    return Promise.resolve()
  })
}))

// Mock the Publication class
vi.mock('@/core/Publication.js', () => ({
  default: class MockPublication {
    constructor(doi) {
      this.doi = doi
    }
    fetchData() {}
  }
}))

describe('PublicationSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should create instance with query and default provider', () => {
      const search = new PublicationSearch('test query')
      expect(search.query).toBe('test query')
      expect(search.provider).toBe('openalex')
    })

    it('should create instance with query and specified provider', () => {
      const search = new PublicationSearch('test query', 'crossref')
      expect(search.query).toBe('test query')
      expect(search.provider).toBe('crossref')
    })
  })

  describe('DOI Detection', () => {
    it('should detect and extract DOIs from input', async () => {
      const search = new PublicationSearch('10.1234/test-doi')
      const result = await search.execute()
      
      expect(result.type).toBe('doi')
      expect(result.results).toHaveLength(1)
      expect(result.results[0].doi).toBe('10.1234/test-doi')
    })

    it('should detect multiple DOIs', async () => {
      const search = new PublicationSearch('10.1234/doi-1 and 10.5678/doi-2')
      const result = await search.execute()
      
      expect(result.type).toBe('doi')
      expect(result.results.length).toBeGreaterThanOrEqual(1)
    })

    it('should not perform search when DOIs are found', async () => {
      const search = new PublicationSearch('10.1234/test-doi', 'openalex')
      const result = await search.execute()
      
      expect(result.type).toBe('doi')
      // Search should not have been called
      const { cachedFetch } = await import('@/lib/Cache.js')
      const calls = cachedFetch.mock.calls.filter(call => 
        call[0].includes('api.openalex.org') || call[0].includes('api.crossref.org')
      )
      expect(calls).toHaveLength(0)
    })
  })

  describe('OpenAlex Search', () => {
    it('should use OpenAlex API when provider is openalex', async () => {
      const search = new PublicationSearch('visualization', 'openalex')
      const result = await search.execute()
      
      expect(result.type).toBe('search')
      
      const { cachedFetch } = await import('@/lib/Cache.js')
      const openAlexCalls = cachedFetch.mock.calls.filter(call => 
        call[0].includes('api.openalex.org')
      )
      expect(openAlexCalls).toHaveLength(1)
      expect(openAlexCalls[0][0]).toContain('search=visualization')
      expect(openAlexCalls[0][0]).toContain('mailto=fabian.beck@uni-bamberg.de')
    })

    it('should extract DOI from OpenAlex response', async () => {
      const search = new PublicationSearch('test', 'openalex')
      const result = await search.execute()
      
      expect(result.results).toHaveLength(2)
      expect(result.results[0].doi).toBe('10.1234/openalex-1')
      expect(result.results[1].doi).toBe('10.1234/openalex-2')
    })

    it('should use default provider openalex when not specified', async () => {
      const search = new PublicationSearch('test')
      await search.execute()
      
      const { cachedFetch } = await import('@/lib/Cache.js')
      const openAlexCalls = cachedFetch.mock.calls.filter(call => 
        call[0].includes('api.openalex.org')
      )
      expect(openAlexCalls).toHaveLength(1)
    })
  })

  describe('CrossRef Search', () => {
    it('should use CrossRef API when provider is crossref', async () => {
      const search = new PublicationSearch('visualization', 'crossref')
      const result = await search.execute()
      
      expect(result.type).toBe('search')
      
      const { cachedFetch } = await import('@/lib/Cache.js')
      const crossrefCalls = cachedFetch.mock.calls.filter(call => 
        call[0].includes('api.crossref.org')
      )
      expect(crossrefCalls).toHaveLength(1)
      expect(crossrefCalls[0][0]).toContain('query=visualization')
      expect(crossrefCalls[0][0]).toContain('mailto=fabian.beck@uni-bamberg.de')
    })

    it('should extract DOI from CrossRef response', async () => {
      const search = new PublicationSearch('test', 'crossref')
      const result = await search.execute()
      
      expect(result.results).toHaveLength(2)
      expect(result.results[0].doi).toBe('10.1234/crossref-1')
      expect(result.results[1].doi).toBe('10.1234/crossref-2')
    })
  })

  describe('Query Processing', () => {
    it('should handle special characters in query', async () => {
      const search = new PublicationSearch('test & query!', 'openalex')
      await search.execute()
      
      const { cachedFetch } = await import('@/lib/Cache.js')
      const calls = cachedFetch.mock.calls.filter(call => 
        call[0].includes('api.openalex.org')
      )
      // Query should be URL encoded
      expect(calls[0][0]).toContain('search=')
    })
  })
})
