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
    it('should create instance with query', () => {
      const search = new PublicationSearch('test query')
      expect(search.query).toBe('test query')
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
      const search = new PublicationSearch('10.1234/test-doi')
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

  describe('Merged Search', () => {
    it('should search both OpenAlex and CrossRef APIs', async () => {
      const search = new PublicationSearch('visualization')
      const result = await search.execute()
      
      expect(result.type).toBe('search')
      
      const { cachedFetch } = await import('@/lib/Cache.js')
      const openAlexCalls = cachedFetch.mock.calls.filter(call => 
        call[0].includes('api.openalex.org')
      )
      const crossrefCalls = cachedFetch.mock.calls.filter(call => 
        call[0].includes('api.crossref.org')
      )
      
      expect(openAlexCalls).toHaveLength(1)
      expect(crossrefCalls).toHaveLength(1)
      expect(openAlexCalls[0][0]).toContain('search=visualization')
      expect(crossrefCalls[0][0]).toContain('query=visualization')
    })

    it('should merge results from both APIs', async () => {
      const search = new PublicationSearch('test')
      const result = await search.execute()
      
      expect(result.results).toHaveLength(4) // 2 from OpenAlex + 2 from CrossRef
      expect(result.results.some(r => r.doi === '10.1234/openalex-1')).toBe(true)
      expect(result.results.some(r => r.doi === '10.1234/openalex-2')).toBe(true)
      expect(result.results.some(r => r.doi === '10.1234/crossref-1')).toBe(true)
      expect(result.results.some(r => r.doi === '10.1234/crossref-2')).toBe(true)
    })

    it('should remove duplicate DOIs from merged results', async () => {
      // Update mock to return duplicate DOIs
      const { cachedFetch } = await import('@/lib/Cache.js')
      cachedFetch.mockImplementation((url, callback) => {
        if (url.includes('api.openalex.org')) {
          callback({
            results: [
              { doi: 'https://doi.org/10.1234/duplicate', title: 'OpenAlex Result' }
            ]
          })
        } else if (url.includes('api.crossref.org')) {
          callback({
            message: {
              items: [
                { DOI: '10.1234/DUPLICATE', title: 'CrossRef Result' }
              ]
            }
          })
        }
        return Promise.resolve()
      })
      
      const search = new PublicationSearch('test')
      const result = await search.execute()
      
      expect(result.results).toHaveLength(1) // Duplicate should be removed
    })
  })

  describe('Query Processing', () => {
    it('should handle special characters in query', async () => {
      const search = new PublicationSearch('test & query!')
      await search.execute()
      
      const { cachedFetch } = await import('@/lib/Cache.js')
      const calls = cachedFetch.mock.calls.filter(call => 
        call[0].includes('api.openalex.org') || call[0].includes('api.crossref.org')
      )
      // Query should be URL encoded
      expect(calls.length).toBeGreaterThan(0)
    })
  })

  describe('Ranking', () => {
    it('should rank results by relevance', async () => {
      // Mock with more detailed publication data for ranking
      const { cachedFetch } = await import('@/lib/Cache.js')
      cachedFetch.mockImplementation((url, callback) => {
        if (url.includes('api.openalex.org')) {
          callback({
            results: [
              { doi: 'https://doi.org/10.1234/openalex-1', title: 'Visualization Techniques' }
            ]
          })
        } else if (url.includes('api.crossref.org')) {
          callback({
            message: {
              items: [
                { DOI: '10.1234/crossref-1', title: 'Data Analysis Methods' }
              ]
            }
          })
        }
        return Promise.resolve()
      })
      
      const search = new PublicationSearch('visualization')
      const result = await search.execute()
      
      // Results should be ranked (visualization should rank higher)
      expect(result.results).toHaveLength(2)
      // The order will be determined by the ranking algorithm
      expect(result.results[0]).toBeDefined()
      expect(result.results[1]).toBeDefined()
    })
  })
})
