import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useInterfaceStore } from '@/stores/interface.js'
import { useSessionStore } from '@/stores/session.js'

// Mock the interface store
vi.mock('@/stores/interface.js', () => ({
  useInterfaceStore: vi.fn(() => ({
    clear: vi.fn()
  }))
}))

// Mock the Cache module to avoid indexedDB issues
vi.mock('@/lib/Cache.js', () => ({
  clearCache: vi.fn()
}))

// Mock utilities
vi.mock('@/utils/bibtex.js', () => ({
  generateBibtex: vi.fn()
}))

vi.mock('@/lib/Util.js', () => ({
  shuffle: vi.fn((arr) => arr),
  saveAsFile: vi.fn()
}))

describe('Session Store - Suggested Publications Filtering', () => {
  let sessionStore
  let interfaceStore
  let mockPublication1, mockPublication2, mockPublication3

  beforeEach(() => {
    setActivePinia(createPinia())

    // Create mock interface store
    interfaceStore = {}

    // Mock the interface store to return our mock
    vi.mocked(useInterfaceStore).mockReturnValue(interfaceStore)

    sessionStore = useSessionStore()

    // Create mock publications
    mockPublication1 = {
      doi: '10.1234/pub1',
      year: '2023',
      score: 10,
      citationDois: ['10.1234/citation1'],
      referenceDois: ['10.1234/ref1'],
      getMetaString: vi.fn(() => 'Machine Learning Paper'),
      someTag: true
    }

    mockPublication2 = {
      doi: '10.1234/pub2',
      year: '2020',
      score: 15,
      citationDois: ['10.1234/citation2'],
      referenceDois: ['10.1234/ref2'],
      getMetaString: vi.fn(() => 'Deep Learning Research'),
      someTag: false
    }

    mockPublication3 = {
      doi: '10.1234/pub3',
      year: '2021',
      score: 5,
      citationDois: ['10.1234/citation3'],
      referenceDois: ['10.1234/ref3'],
      getMetaString: vi.fn(() => 'Computer Vision Study'),
      someTag: true
    }

    // Mock suggestion object with publications
    sessionStore.suggestion = {
      publications: [mockPublication1, mockPublication2, mockPublication3],
      totalSuggestions: 3
    }
  })

  describe('suggestedPublicationsFiltered', () => {
    it('should return all publications when no filters are active', () => {
      const filtered = sessionStore.suggestedPublicationsFiltered
      expect(filtered).toEqual([mockPublication1, mockPublication2, mockPublication3])
    })

    it('should return all publications in original order when no filters active', () => {
      const filtered = sessionStore.suggestedPublicationsFiltered
      expect(filtered).toEqual([mockPublication1, mockPublication2, mockPublication3])
    })

    it('should sort filtered publications to top when filter is active', () => {
      sessionStore.filter.string = 'Machine Learning'

      const filtered = sessionStore.suggestedPublicationsFiltered

      // mockPublication1 should match and be first, others should follow by score
      expect(filtered[0].doi).toBe(mockPublication1.doi) // matches filter
      expect(filtered[1].doi).toBe(mockPublication2.doi) // higher score (15)
      expect(filtered[2].doi).toBe(mockPublication3.doi) // lower score (5)
    })

    it('should sort by score within filtered and non-filtered groups', () => {
      sessionStore.filter.tags = ['someTag']

      const filtered = sessionStore.suggestedPublicationsFiltered

      // Both mockPublication1 and mockPublication3 have someTag=true
      // They should be sorted by score: mockPublication1 (10) before mockPublication3 (5)
      // Then mockPublication2 (no match) comes last
      expect(filtered[0].doi).toBe(mockPublication1.doi) // matches filter, score 10
      expect(filtered[1].doi).toBe(mockPublication3.doi) // matches filter, score 5
      expect(filtered[2].doi).toBe(mockPublication2.doi) // doesn't match filter
    })

    it('should handle year filters correctly', () => {
      sessionStore.filter.yearStart = '2021'
      sessionStore.filter.yearEnd = '2023'

      const filtered = sessionStore.suggestedPublicationsFiltered

      // mockPublication1 (2023) and mockPublication3 (2021) should match
      // mockPublication2 (2020) should not match
      expect(filtered[0].doi).toBe(mockPublication1.doi) // matches, score 10
      expect(filtered[1].doi).toBe(mockPublication3.doi) // matches, score 5
      expect(filtered[2].doi).toBe(mockPublication2.doi) // doesn't match, score 15
    })

    it('should handle DOI filters correctly', () => {
      sessionStore.filter.dois = ['10.1234/citation1']

      const filtered = sessionStore.suggestedPublicationsFiltered

      // Only mockPublication1 has the citation DOI
      expect(filtered[0].doi).toBe(mockPublication1.doi) // matches filter
      expect(filtered[1].doi).toBe(mockPublication2.doi) // doesn't match, higher score
      expect(filtered[2].doi).toBe(mockPublication3.doi) // doesn't match, lower score
    })

    it('should handle empty suggestions gracefully', () => {
      sessionStore.suggestion = null
      sessionStore.filter.string = 'anything'

      expect(sessionStore.suggestedPublicationsFiltered).toEqual([])
    })

    it('should handle suggestions with empty publications array', () => {
      sessionStore.suggestion = { publications: [], totalSuggestions: 0 }
      sessionStore.filter.string = 'anything'

      expect(sessionStore.suggestedPublicationsFiltered).toEqual([])
    })
  })

  describe('suggestedPublicationsFilteredCount', () => {
    it('should return 0 when no filters are active', () => {
      expect(sessionStore.suggestedPublicationsFilteredCount).toBe(0)
    })

    it('should return correct count when filter is active', () => {
      sessionStore.filter.string = 'Machine Learning'

      expect(sessionStore.suggestedPublicationsFilteredCount).toBe(1)
    })

    it('should return correct count with tag filter', () => {
      sessionStore.filter.tags = ['someTag']

      expect(sessionStore.suggestedPublicationsFilteredCount).toBe(2)
    })

    it('should return 0 when no suggestions exist', () => {
      sessionStore.suggestion = null
      sessionStore.filter.string = 'anything'

      expect(sessionStore.suggestedPublicationsFilteredCount).toBe(0)
    })

    it('should handle complex filter combinations', () => {
      sessionStore.filter.string = 'Learning'
      sessionStore.filter.yearStart = '2020'

      // mockPublication1 (Machine Learning, 2023) and mockPublication2 (Deep Learning, 2020) should match
      expect(sessionStore.suggestedPublicationsFilteredCount).toBe(2)
    })
  })

  describe('suggestedPublicationsNonFilteredCount', () => {
    it('should return 0 when no filters are active', () => {
      expect(sessionStore.suggestedPublicationsNonFilteredCount).toBe(0)
    })

    it('should return correct count when filter is active', () => {
      sessionStore.filter.string = 'Machine Learning'

      expect(sessionStore.suggestedPublicationsNonFilteredCount).toBe(2)
    })

    it('should return correct count with tag filter', () => {
      sessionStore.filter.tags = ['someTag']

      expect(sessionStore.suggestedPublicationsNonFilteredCount).toBe(1)
    })

    it('should return 0 when no suggestions exist', () => {
      sessionStore.suggestion = null
      sessionStore.filter.string = 'anything'

      expect(sessionStore.suggestedPublicationsNonFilteredCount).toBe(0)
    })

    it('should handle all publications matching filter', () => {
      sessionStore.filter.yearStart = '2020'
      sessionStore.filter.yearEnd = '2023'

      // All publications should match (2020, 2021, 2023 are all in range)
      expect(sessionStore.suggestedPublicationsNonFilteredCount).toBe(0)
    })
  })

  describe('integration with Filter class', () => {
    it('should work with complex filter combinations', () => {
      sessionStore.filter.string = 'Learning'
      sessionStore.filter.yearStart = '2020'
      sessionStore.filter.tags = ['someTag']

      const filtered = sessionStore.suggestedPublicationsFiltered

      // Only mockPublication1 should match all criteria:
      // - contains 'Learning' in meta string
      // - year 2023 >= 2020
      // - has someTag = true
      expect(sessionStore.suggestedPublicationsFilteredCount).toBe(1)
      expect(sessionStore.suggestedPublicationsNonFilteredCount).toBe(2)
      expect(filtered[0].doi).toBe(mockPublication1.doi)
    })

    it('should maintain original behavior when no active filters', () => {
      // No active filters

      const filtered = sessionStore.suggestedPublicationsFiltered

      expect(filtered).toEqual([mockPublication1, mockPublication2, mockPublication3])
      expect(sessionStore.suggestedPublicationsFilteredCount).toBe(0)
      expect(sessionStore.suggestedPublicationsNonFilteredCount).toBe(0)
    })

    it('should handle mixed filter types correctly', () => {
      sessionStore.filter.yearEnd = '2021'
      sessionStore.filter.dois = ['10.1234/citation3']

      const filtered = sessionStore.suggestedPublicationsFiltered

      // Only mockPublication3 should match both criteria:
      // - year 2021 <= 2021
      // - has citation DOI 10.1234/citation3
      expect(sessionStore.suggestedPublicationsFilteredCount).toBe(1)
      expect(sessionStore.suggestedPublicationsNonFilteredCount).toBe(2)
      expect(filtered[0].doi).toBe(mockPublication3.doi)
    })

    it('should handle no matches scenario', () => {
      sessionStore.filter.string = 'Quantum Physics'

      const filtered = sessionStore.suggestedPublicationsFiltered

      // No publications should match
      expect(sessionStore.suggestedPublicationsFilteredCount).toBe(0)
      expect(sessionStore.suggestedPublicationsNonFilteredCount).toBe(3)

      // All publications should be present, sorted by score descending
      expect(filtered[0].doi).toBe(mockPublication2.doi) // score 15
      expect(filtered[1].doi).toBe(mockPublication1.doi) // score 10
      expect(filtered[2].doi).toBe(mockPublication3.doi) // score 5
    })
  })

  describe('consistency with selected publications behavior', () => {
    it('should behave consistently with selected publications filtering', () => {
      // Set up same data for both selected and suggested
      sessionStore.selectedPublications = [mockPublication1, mockPublication2, mockPublication3]

      sessionStore.filter.string = 'Learning'

      const selectedFiltered = sessionStore.selectedPublicationsFiltered
      const suggestedFiltered = sessionStore.suggestedPublicationsFiltered

      // Both should have same filtering behavior
      expect(selectedFiltered.map((p) => p.doi)).toEqual(suggestedFiltered.map((p) => p.doi))
      expect(sessionStore.selectedPublicationsFilteredCount).toBe(
        sessionStore.suggestedPublicationsFilteredCount
      )
      expect(sessionStore.selectedPublicationsNonFilteredCount).toBe(
        sessionStore.suggestedPublicationsNonFilteredCount
      )
    })
  })
})
