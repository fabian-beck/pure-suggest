import { describe, it, expect, beforeEach, vi } from 'vitest'
import Publication from '@/Publication.js'

// Mock dependencies
vi.mock('@/Cache.js', () => ({
  cachedFetch: vi.fn()
}))

describe('Publication Bug Regression Tests', () => {
  let publication

  beforeEach(() => {
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
      ORCID_REGEX: /\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]{1}/,
      TITLE_WORD_MAP: {},
      PUBLICATION_TAGS: {}
    }))
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
})