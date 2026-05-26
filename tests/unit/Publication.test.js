import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import Publication from '@/core/Publication.js'
import { cachedFetch } from '@/lib/Cache.js'

// Mock dependencies
vi.mock('@/lib/Cache.js', () => ({
  cachedFetch: vi.fn()
}))

describe('Publication Bug Regression Tests', () => {
  let publication
  let consoleErrorSpy

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Reset current year constant for predictable tests
    vi.doMock('@/constants/publication.js', () => ({
      CURRENT_YEAR: 2024,
      SCORING: {
        DEFAULT_BOOST_FACTOR: 1
      },
      SURVEY_THRESHOLDS: {},
      CITATION_THRESHOLDS: {},
      PUBLICATION_AGE: {},
      TEXT_PROCESSING: {},
      SURVEY_KEYWORDS: [],
      ORDINAL_REGEX: /\d+/,
      ROMAN_NUMERAL_REGEX: /[IVX]+/,
      ORCID_REGEX: /\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]/,
      TITLE_WORD_MAP: {},
      PUBLICATION_TAGS: {}
    }))
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    vi.useRealTimers()
  })

  describe('citationsPerYear calculation - Bug Fix Regression', () => {
    beforeEach(() => {
      publication = new Publication('10.1234/test')
    })

    it('should handle missing year data without NaN', () => {
      publication.year = null
      publication.citationDois = ['10.1234/citation1']

      const result = publication.citationsPerYear
      expect(result).toBe(1) // Should be 1 citation / 1 year (fallback), not NaN
      expect(Number.isNaN(result)).toBe(false)
    })

    it('should handle undefined year without NaN', () => {
      publication.year = undefined
      publication.citationDois = ['10.1234/citation1', '10.1234/citation2']

      const result = publication.citationsPerYear
      expect(result).toBe(2) // Should be 2 citations / 1 year (fallback), not NaN
      expect(Number.isNaN(result)).toBe(false)
    })

    it('should handle future publication years gracefully', () => {
      publication.year = 2025 // Future year
      publication.citationDois = ['10.1234/citation1']

      const result = publication.citationsPerYear
      expect(result).toBe(1) // Should use Math.max(1, negative_value) = 1
      expect(Number.isNaN(result)).toBe(false)
    })
  })

  describe('fetchData diagnostics', () => {
    it('should retry a failed default metadata load once after a delay', async () => {
      vi.useFakeTimers()
      cachedFetch.mockResolvedValue()
      publication = new Publication('10.1234/MISSING')

      const fetchPromise = publication.fetchData()

      await vi.advanceTimersByTimeAsync(999)
      expect(cachedFetch).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1)
      await fetchPromise

      expect(cachedFetch).toHaveBeenCalledTimes(2)
      expect(cachedFetch.mock.calls[0][3]).toBe(false)
      expect(cachedFetch.mock.calls[1][0]).toContain('&noCache=true')
      expect(cachedFetch.mock.calls[1][3]).toBe(true)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Publication] Unable to load metadata for DOI "10.1234/missing".',
        expect.objectContaining({
          doi: '10.1234/missing',
          url: expect.stringContaining('doi=10.1234/missing'),
          noCache: true,
          reason: 'No metadata response was processed.',
          attempts: expect.arrayContaining([
            expect.objectContaining({ attempt: 1, noCache: false }),
            expect.objectContaining({ attempt: 2, noCache: true })
          ])
        })
      )
    })

    it('should include the API response when metadata has no usable title', async () => {
      vi.useFakeTimers()
      const response = {
        author: 'Doe, Jane',
        year: 2024
      }
      cachedFetch.mockImplementation(async (_url, callback) => {
        callback(response)
      })
      publication = new Publication('10.1234/no-title')

      const fetchPromise = publication.fetchData()
      await vi.advanceTimersByTimeAsync(1000)
      await fetchPromise

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Publication] Unable to load metadata for DOI "10.1234/no-title".',
        expect.objectContaining({
          doi: '10.1234/no-title',
          response,
          reason: 'The response was processed but no title was available.'
        })
      )
    })

    it('should not log an error when the automatic retry loads a title', async () => {
      vi.useFakeTimers()
      cachedFetch.mockImplementation(async (_url, callback) => {
        const response =
          cachedFetch.mock.calls.length === 1
            ? {
                author: 'Doe, Jane',
                year: 2024
              }
            : {
                title: 'Recovered Publication',
                year: 2024
              }
        callback(response)
      })
      publication = new Publication('10.1234/recovered')

      const fetchPromise = publication.fetchData()
      await vi.advanceTimersByTimeAsync(1000)
      await fetchPromise

      expect(cachedFetch).toHaveBeenCalledTimes(2)
      expect(consoleErrorSpy).not.toHaveBeenCalled()
      expect(publication.title).toBe('Recovered Publication')
    })

    it('should not log an error when metadata includes a title', async () => {
      cachedFetch.mockImplementation(async (_url, callback) => {
        callback({
          title: 'Loaded Publication',
          year: 2024
        })
      })
      publication = new Publication('10.1234/loaded')

      await publication.fetchData()

      expect(consoleErrorSpy).not.toHaveBeenCalled()
      expect(publication.title).toBe('Loaded Publication')
    })
  })
})
