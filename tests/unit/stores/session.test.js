import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'
import Filter from '@/Filter.js'

// Mock the interface store
vi.mock('@/stores/interface.js', () => ({
  useInterfaceStore: vi.fn(() => ({
    clear: vi.fn()
  }))
}))

// Mock the Cache module to avoid indexedDB issues
vi.mock('@/Cache.js', () => ({
  clearCache: vi.fn()
}))

// Mock utilities
vi.mock('@/utils/bibtex.js', () => ({
  generateBibtex: vi.fn()
}))

vi.mock('@/Util.js', () => ({
  shuffle: vi.fn(arr => arr),
  saveAsFile: vi.fn()
}))

describe('Session Store - Selected Publications Filtering', () => {
  let sessionStore
  let interfaceStore
  let mockPublication1, mockPublication2, mockPublication3

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Create mock interface store
    interfaceStore = {
      clear: vi.fn()
    }
    
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
    
    // Add publications to selected
    sessionStore.selectedPublications = [mockPublication1, mockPublication2, mockPublication3]
  })

  describe('selectedPublicationsFiltered', () => {
    it('should return all publications when no filters are active', () => {
      const filtered = sessionStore.selectedPublicationsFiltered
      expect(filtered).toEqual([mockPublication1, mockPublication2, mockPublication3])
    })

    it('should sort filtered publications to top when filter is active', () => {
      sessionStore.filter.string = 'Machine Learning'
      
      const filtered = sessionStore.selectedPublicationsFiltered
      
      // mockPublication1 should match and be first, others should follow by score
      expect(filtered[0].doi).toBe(mockPublication1.doi) // matches filter
      expect(filtered[1].doi).toBe(mockPublication2.doi) // higher score (15)
      expect(filtered[2].doi).toBe(mockPublication3.doi) // lower score (5)
    })

    it('should sort by score within filtered and non-filtered groups', () => {
      sessionStore.filter.tag = 'someTag'
      
      const filtered = sessionStore.selectedPublicationsFiltered
      
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
      
      const filtered = sessionStore.selectedPublicationsFiltered
      
      // mockPublication1 (2023) and mockPublication3 (2021) should match
      // mockPublication2 (2020) should not match
      expect(filtered[0].doi).toBe(mockPublication1.doi) // matches, score 10
      expect(filtered[1].doi).toBe(mockPublication3.doi) // matches, score 5
      expect(filtered[2].doi).toBe(mockPublication2.doi) // doesn't match, score 15
    })

    it('should handle DOI filters correctly', () => {
      sessionStore.filter.dois = ['10.1234/citation1']
      
      const filtered = sessionStore.selectedPublicationsFiltered
      
      // Only mockPublication1 has the citation DOI
      expect(filtered[0].doi).toBe(mockPublication1.doi) // matches filter
      expect(filtered[1].doi).toBe(mockPublication2.doi) // doesn't match, higher score
      expect(filtered[2].doi).toBe(mockPublication3.doi) // doesn't match, lower score
    })
  })

  describe('selectedPublicationsFilteredCount', () => {
    it('should return 0 when no filters are active', () => {
      expect(sessionStore.selectedPublicationsFilteredCount).toBe(0)
    })

    it('should return correct count when filter is active', () => {
      sessionStore.filter.string = 'Machine Learning'
      
      expect(sessionStore.selectedPublicationsFilteredCount).toBe(1)
    })

    it('should return correct count with tag filter', () => {
      sessionStore.filter.tag = 'someTag'
      
      expect(sessionStore.selectedPublicationsFilteredCount).toBe(2)
    })
  })

  describe('selectedPublicationsNonFilteredCount', () => {
    it('should return 0 when no filters are active', () => {
      expect(sessionStore.selectedPublicationsNonFilteredCount).toBe(0)
    })

    it('should return correct count when filter is active', () => {
      sessionStore.filter.string = 'Machine Learning'
      
      expect(sessionStore.selectedPublicationsNonFilteredCount).toBe(2)
    })

    it('should return correct count with tag filter', () => {
      sessionStore.filter.tag = 'someTag'
      
      expect(sessionStore.selectedPublicationsNonFilteredCount).toBe(1)
    })
  })

  describe('integration with Filter class', () => {
    it('should work with complex filter combinations', () => {
      sessionStore.filter.string = 'Learning'
      sessionStore.filter.yearStart = '2020'
      sessionStore.filter.tag = 'someTag'
      
      const filtered = sessionStore.selectedPublicationsFiltered
      
      // Only mockPublication1 should match all criteria:
      // - contains 'Learning' in meta string
      // - year 2023 >= 2020
      // - has someTag = true
      expect(sessionStore.selectedPublicationsFilteredCount).toBe(1)
      expect(sessionStore.selectedPublicationsNonFilteredCount).toBe(2)
      expect(filtered[0].doi).toBe(mockPublication1.doi)
    })

    it('should handle empty selected publications array', () => {
      sessionStore.selectedPublications = []
      sessionStore.filter.string = 'anything'
      
      expect(sessionStore.selectedPublicationsFiltered).toEqual([])
      expect(sessionStore.selectedPublicationsFilteredCount).toBe(0)
      expect(sessionStore.selectedPublicationsNonFilteredCount).toBe(0)
    })
  })
})