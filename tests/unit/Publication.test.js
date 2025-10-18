import { describe, it, expect, beforeEach, vi } from 'vitest'

import Publication from '@/core/Publication.js'

// Mock dependencies
vi.mock('@/lib/Cache.js', () => ({
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
      ORCID_REGEX: /\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]/,
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

  describe('getTags - Concept Tags', () => {
    beforeEach(() => {
      publication = new Publication('10.1234/test')
    })

    it('should return base tags without concepts', () => {
      publication.isNew = 'published within this or the previous two calendar years'
      publication.isHighlyCited = 'more than 10 citations per year'
      publication.concepts = null

      const tags = publication.getTags()

      expect(tags).toHaveLength(2)
      expect(tags).toContainEqual({ value: 'isNew', name: 'New' })
      expect(tags).toContainEqual({ value: 'isHighlyCited', name: 'Highly cited' })
    })

    it('should include concept tags when present', () => {
      publication.concepts = [1, 3]

      const tags = publication.getTags()

      expect(tags).toContainEqual({ value: 'concept1', name: 'Concept 1' })
      expect(tags).toContainEqual({ value: 'concept3', name: 'Concept 3' })
    })

    it('should combine base tags and concept tags', () => {
      publication.isNew = 'published within this or the previous two calendar years'
      publication.concepts = [1, 2]

      const tags = publication.getTags()

      expect(tags.length).toBeGreaterThanOrEqual(3)
      expect(tags).toContainEqual({ value: 'isNew', name: 'New' })
      expect(tags).toContainEqual({ value: 'concept1', name: 'Concept 1' })
      expect(tags).toContainEqual({ value: 'concept2', name: 'Concept 2' })
    })

    it('should return only base tags when concepts is empty array', () => {
      publication.isSurvey = 'more than 50 references'
      publication.concepts = []

      const tags = publication.getTags()

      expect(tags).toHaveLength(1)
      expect(tags).toContainEqual({ value: 'isSurvey', name: 'Literature survey' })
    })

    it('should handle no tags at all', () => {
      publication.concepts = null

      const tags = publication.getTags()

      expect(tags).toEqual([])
    })
  })
})
