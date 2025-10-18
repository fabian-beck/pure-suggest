import { describe, it, expect, beforeEach, vi } from 'vitest'

import Filter from '@/core/Filter.js'

describe('Filter', () => {
  let filter
  let mockPublication

  beforeEach(() => {
    filter = new Filter()
    mockPublication = {
      doi: '10.1234/test-doi',
      year: '2023',
      citationDois: ['10.1234/citation1', '10.1234/citation2'],
      referenceDois: ['10.1234/ref1', '10.1234/ref2'],
      getMetaString: vi.fn(() => 'Machine Learning Test Paper Author Name'),
      someTag: true,
      otherTag: false
    }
  })

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(filter.string).toBe('')
      expect(filter.yearStart).toBeUndefined()
      expect(filter.yearEnd).toBeUndefined()
      expect(filter.tags).toEqual([])
      expect(filter.doi).toBe('')
      expect(filter.dois).toEqual([])
      expect(filter.isActive).toBe(true)
      expect(filter.applyToSelected).toBe(true)
      expect(filter.applyToSuggested).toBe(true)
    })
  })

  describe('matchesString', () => {
    it('should return true when filter string is empty', () => {
      filter.string = ''
      expect(filter.matchesString(mockPublication)).toBe(true)
    })

    it('should match case-insensitively', () => {
      filter.string = 'MACHINE learning'
      expect(filter.matchesString(mockPublication)).toBe(true)
    })

    it('should match partial strings', () => {
      filter.string = 'Test Paper'
      expect(filter.matchesString(mockPublication)).toBe(true)
    })

    it('should return false when no match found', () => {
      filter.string = 'Quantum Physics'
      expect(filter.matchesString(mockPublication)).toBe(false)
    })

    it('should handle special characters in search', () => {
      mockPublication.getMetaString = vi.fn(() => 'C++ Programming & Development')
      filter.string = 'C++'
      expect(filter.matchesString(mockPublication)).toBe(true)
    })

    it('should handle empty meta string', () => {
      mockPublication.getMetaString = vi.fn(() => '')
      filter.string = 'anything'
      expect(filter.matchesString(mockPublication)).toBe(false)
    })

    it('should handle null/undefined meta string', () => {
      mockPublication.getMetaString = vi.fn(() => null)
      filter.string = 'anything'
      expect(() => filter.matchesString(mockPublication)).toThrow()
    })
  })

  describe('isSpecificYearActive', () => {
    it('should return true for valid years within range', () => {
      expect(filter.isSpecificYearActive(2023)).toBe(true)
      expect(filter.isSpecificYearActive(1000)).toBe(true)
      expect(filter.isSpecificYearActive(9999)).toBe(true)
    })

    it('should return false for years outside range and invalid inputs', () => {
      expect(filter.isSpecificYearActive(999)).toBe(false)
      expect(filter.isSpecificYearActive(10000)).toBe(false)
      expect(filter.isSpecificYearActive(null)).toBe(false)
      expect(filter.isSpecificYearActive(NaN)).toBe(false)
    })
  })

  describe('isYearActive', () => {
    it('should return true when yearStart is active', () => {
      filter.yearStart = '2020'
      expect(filter.isYearActive()).toBe(true)
    })

    it('should return true when yearEnd is active', () => {
      filter.yearEnd = '2025'
      expect(filter.isYearActive()).toBe(true)
    })

    it('should return true when both are active', () => {
      filter.yearStart = '2020'
      filter.yearEnd = '2025'
      expect(filter.isYearActive()).toBe(true)
    })

    it('should return false when neither is active', () => {
      filter.yearStart = '999'
      filter.yearEnd = '10001'
      expect(filter.isYearActive()).toBe(false)
    })

    it('should handle string to number conversion', () => {
      filter.yearStart = 'not a number'
      filter.yearEnd = ''
      expect(filter.isYearActive()).toBe(false)
    })
  })

  describe('matchesYearStart', () => {
    it('should return true when year filter is inactive', () => {
      filter.yearStart = '999'
      expect(filter.matchesYearStart(mockPublication)).toBe(true)
    })

    it('should return true when publication year >= start year', () => {
      filter.yearStart = '2020'
      mockPublication.year = '2023'
      expect(filter.matchesYearStart(mockPublication)).toBe(true)
    })

    it('should return true when publication year equals start year', () => {
      filter.yearStart = '2023'
      mockPublication.year = '2023'
      expect(filter.matchesYearStart(mockPublication)).toBe(true)
    })

    it('should return false when publication year < start year', () => {
      filter.yearStart = '2025'
      mockPublication.year = '2023'
      expect(filter.matchesYearStart(mockPublication)).toBe(false)
    })

    it('should handle non-numeric publication years', () => {
      filter.yearStart = '2020'
      mockPublication.year = 'not a year'
      expect(filter.matchesYearStart(mockPublication)).toBe(false)
    })
  })

  describe('matchesYearEnd', () => {
    it('should return true when year filter is inactive', () => {
      filter.yearEnd = '10001'
      expect(filter.matchesYearEnd(mockPublication)).toBe(true)
    })

    it('should return true when publication year <= end year', () => {
      filter.yearEnd = '2025'
      mockPublication.year = '2023'
      expect(filter.matchesYearEnd(mockPublication)).toBe(true)
    })

    it('should return true when publication year equals end year', () => {
      filter.yearEnd = '2023'
      mockPublication.year = '2023'
      expect(filter.matchesYearEnd(mockPublication)).toBe(true)
    })

    it('should return false when publication year > end year', () => {
      filter.yearEnd = '2020'
      mockPublication.year = '2023'
      expect(filter.matchesYearEnd(mockPublication)).toBe(false)
    })
  })

  describe('matchesYear', () => {
    it('should return false when publication has no year', () => {
      mockPublication.year = null
      expect(filter.matchesYear(mockPublication)).toBe(false)

      mockPublication.year = undefined
      expect(filter.matchesYear(mockPublication)).toBe(false)

      mockPublication.year = ''
      expect(filter.matchesYear(mockPublication)).toBe(false)
    })

    it('should return true when both start and end match', () => {
      filter.yearStart = '2020'
      filter.yearEnd = '2025'
      mockPublication.year = '2023'
      expect(filter.matchesYear(mockPublication)).toBe(true)
    })

    it('should return false when start matches but end does not', () => {
      filter.yearStart = '2020'
      filter.yearEnd = '2022'
      mockPublication.year = '2023'
      expect(filter.matchesYear(mockPublication)).toBe(false)
    })

    it('should return false when end matches but start does not', () => {
      filter.yearStart = '2024'
      filter.yearEnd = '2025'
      mockPublication.year = '2023'
      expect(filter.matchesYear(mockPublication)).toBe(false)
    })
  })

  describe('matchesTag', () => {
    it('should return true when tags filter is empty', () => {
      filter.tags = []
      expect(filter.matchesTag(mockPublication)).toBe(true)
    })

    it('should return true when publication has any of the selected tags', () => {
      filter.tags = ['someTag']
      expect(filter.matchesTag(mockPublication)).toBe(true)
    })

    it('should return true when publication has at least one of multiple tags', () => {
      filter.tags = ['someTag', 'otherTag']
      expect(filter.matchesTag(mockPublication)).toBe(true)
    })

    it('should return false when publication has none of the selected tags', () => {
      filter.tags = ['otherTag']
      expect(filter.matchesTag(mockPublication)).toBe(false)
    })

    it('should return false when publication does not have any tag properties', () => {
      filter.tags = ['nonExistentTag']
      expect(filter.matchesTag(mockPublication)).toBe(false)
    })

    it('should return false when publication has none of multiple tags', () => {
      filter.tags = ['nonExistentTag', 'anotherNonExistentTag']
      expect(filter.matchesTag(mockPublication)).toBe(false)
    })

    describe('concept tags', () => {
      it('should return true when publication has matching concept (string format)', () => {
        mockPublication.concepts = ['C1 - VISUAL', 'C2 - DATA']
        filter.tags = ['conceptC1']
        expect(filter.matchesTag(mockPublication)).toBe(true)
      })

      it('should return true when publication has matching concept (number format)', () => {
        mockPublication.concepts = [1, 2]
        filter.tags = ['concept1']
        expect(filter.matchesTag(mockPublication)).toBe(true)
      })

      it('should return false when publication does not have matching concept', () => {
        mockPublication.concepts = ['C1 - VISUAL', 'C2 - DATA']
        filter.tags = ['conceptC3']
        expect(filter.matchesTag(mockPublication)).toBe(false)
      })

      it('should return false when publication has no concepts', () => {
        mockPublication.concepts = null
        filter.tags = ['conceptC1']
        expect(filter.matchesTag(mockPublication)).toBe(false)
      })

      it('should return false when publication has empty concepts array', () => {
        mockPublication.concepts = []
        filter.tags = ['conceptC1']
        expect(filter.matchesTag(mockPublication)).toBe(false)
      })

      it('should return true when publication has at least one matching concept', () => {
        mockPublication.concepts = ['C1 - VISUAL', 'C2 - DATA']
        filter.tags = ['conceptC1', 'conceptC3']
        expect(filter.matchesTag(mockPublication)).toBe(true)
      })

      it('should match concept with complex name format', () => {
        mockPublication.concepts = ['C1 - NEUROMORPHIC COMPUTING']
        filter.tags = ['conceptC1']
        expect(filter.matchesTag(mockPublication)).toBe(true)
      })

      it('should work with mixed tag types (regular and concept)', () => {
        mockPublication.concepts = ['C1 - VISUAL']
        mockPublication.someTag = true
        filter.tags = ['conceptC1', 'someTag']
        expect(filter.matchesTag(mockPublication)).toBe(true)
      })

      it('should not match when only concept tag is set but publication does not have it', () => {
        mockPublication.concepts = ['C2 - DATA']
        mockPublication.someTag = true
        filter.tags = ['conceptC1']
        expect(filter.matchesTag(mockPublication)).toBe(false)
      })
    })
  })

  describe('DOI management', () => {
    describe('addDoi', () => {
      it('should add and handle duplicate DOIs', () => {
        filter.addDoi('10.1234/test')
        expect(filter.dois).toEqual(['10.1234/test'])

        filter.addDoi('10.1234/test') // duplicate
        expect(filter.dois).toEqual(['10.1234/test'])

        filter.addDoi('10.1234/new')
        expect(filter.dois).toEqual(['10.1234/test', '10.1234/new'])
      })
    })

    describe('removeDoi', () => {
      it('should remove DOI and handle non-existent gracefully', () => {
        filter.dois = ['10.1234/test1', '10.1234/test2']
        filter.removeDoi('10.1234/test1')
        expect(filter.dois).toEqual(['10.1234/test2'])

        filter.removeDoi('10.1234/nonexistent')
        expect(filter.dois).toEqual(['10.1234/test2'])
      })
    })

    describe('toggleDoi', () => {
      it('should toggle DOI presence', () => {
        filter.toggleDoi('10.1234/test')
        expect(filter.dois).toEqual(['10.1234/test'])

        filter.toggleDoi('10.1234/test')
        expect(filter.dois).toEqual([])
      })
    })
  })

  describe('matchesDois', () => {
    it('should return true when DOI filter is empty', () => {
      expect(filter.matchesDois(mockPublication)).toBe(true)
    })

    it('should return true when publication has matching citation DOI', () => {
      filter.dois = ['10.1234/citation1']
      expect(filter.matchesDois(mockPublication)).toBe(true)
    })

    it('should return true when publication has matching reference DOI', () => {
      filter.dois = ['10.1234/ref1']
      expect(filter.matchesDois(mockPublication)).toBe(true)
    })

    it('should return true when publication DOI matches filter DOI', () => {
      filter.dois = ['10.1234/test-doi']
      expect(filter.matchesDois(mockPublication)).toBe(true)
    })

    it('should return true when any filter DOI matches', () => {
      filter.dois = ['10.1234/nonexistent', '10.1234/citation1']
      expect(filter.matchesDois(mockPublication)).toBe(true)
    })

    it('should return false when no DOIs match', () => {
      filter.dois = ['10.1234/nonexistent']
      expect(filter.matchesDois(mockPublication)).toBe(false)
    })

    it('should handle publications with missing DOI arrays', () => {
      mockPublication.citationDois = undefined
      mockPublication.referenceDois = null
      filter.dois = ['10.1234/test']
      expect(() => filter.matchesDois(mockPublication)).toThrow()
    })

    it('should handle empty publication DOI arrays', () => {
      mockPublication.citationDois = []
      mockPublication.referenceDois = []
      filter.dois = ['10.1234/test']
      expect(filter.matchesDois(mockPublication)).toBe(false)
    })
  })

  describe('matches (integration)', () => {
    beforeEach(() => {
      // Reset to passing state
      filter.string = ''
      filter.tags = []
      filter.dois = []
      mockPublication.year = '2023'
    })

    it('should return true when all filters pass', () => {
      expect(filter.matches(mockPublication)).toBe(true)
    })

    it('should return false when string filter fails', () => {
      filter.string = 'nonexistent'
      expect(filter.matches(mockPublication)).toBe(false)
    })

    it('should return false when tag filter fails', () => {
      filter.tags = ['nonExistentTag']
      expect(filter.matches(mockPublication)).toBe(false)
    })

    it('should return false when year filter fails', () => {
      mockPublication.year = null
      expect(filter.matches(mockPublication)).toBe(false)
    })

    it('should return false when DOI filter fails', () => {
      filter.dois = ['10.1234/nonexistent']
      expect(filter.matches(mockPublication)).toBe(false)
    })

    it('should handle complex combined filters', () => {
      filter.string = 'Machine'
      filter.tags = ['someTag']
      filter.yearStart = '2020'
      filter.yearEnd = '2025'
      filter.dois = ['10.1234/citation1']

      expect(filter.matches(mockPublication)).toBe(true)
    })
  })

  describe('hasActiveFilters', () => {
    it('should return false when no filters are set', () => {
      expect(filter.hasActiveFilters()).toBe(false)
    })

    it('should return true when string filter is set', () => {
      filter.string = 'test'
      expect(filter.hasActiveFilters()).toBe(true)
    })

    it('should return true when tag filter is set', () => {
      filter.tags = ['someTag']
      expect(filter.hasActiveFilters()).toBe(true)
    })

    it('should return true when year filter is active', () => {
      filter.yearStart = '2020'
      expect(filter.hasActiveFilters()).toBe(true)
    })

    it('should return true when DOI filter has entries', () => {
      filter.dois = ['10.1234/test']
      expect(filter.hasActiveFilters()).toBe(true)
    })

    it('should return false when year values are set but not active', () => {
      filter.yearStart = '999'
      filter.yearEnd = '10001'
      expect(filter.hasActiveFilters()).toBe(false)
    })

    it('should return true when multiple filters are active', () => {
      filter.string = 'test'
      filter.tag = 'someTag'
      filter.yearStart = '2020'
      filter.dois = ['10.1234/test']
      expect(filter.hasActiveFilters()).toBe(true)
    })

    it('should return false when filters are set but isActive is false', () => {
      filter.string = 'test'
      filter.tag = 'someTag'
      filter.yearStart = '2020'
      filter.dois = ['10.1234/test']
      filter.isActive = false
      expect(filter.hasActiveFilters()).toBe(false)
    })

    it('should return false when filters are active but neither publication type is selected', () => {
      filter.string = 'test'
      filter.isActive = true
      filter.applyToSelected = false
      filter.applyToSuggested = false
      expect(filter.hasActiveFilters()).toBe(false)
    })

    it('should return true when filters are active and at least one publication type is selected', () => {
      filter.string = 'test'
      filter.isActive = true
      filter.applyToSelected = true
      filter.applyToSuggested = false
      expect(filter.hasActiveFilters()).toBe(true)
    })
  })

  describe('isActive toggle functionality', () => {
    it('should return true for all publications when isActive is false', () => {
      filter.string = 'nonmatching'
      filter.tag = 'nonmatching'
      filter.yearStart = '1800'
      filter.yearEnd = '1850'
      filter.isActive = false

      expect(filter.matches(mockPublication)).toBe(true)
    })

    it('should apply filters normally when isActive is true', () => {
      filter.string = 'nonmatching'
      filter.isActive = true

      expect(filter.matches(mockPublication)).toBe(false)
    })

    it('should toggle filtering behavior when isActive changes', () => {
      filter.string = 'nonmatching'

      // With isActive true, should not match
      filter.isActive = true
      expect(filter.matches(mockPublication)).toBe(false)

      // With isActive false, should match all
      filter.isActive = false
      expect(filter.matches(mockPublication)).toBe(true)
    })
  })

  describe('Tag management', () => {
    describe('addTag', () => {
      it('should add and handle duplicate tags', () => {
        filter.addTag('isHighlyCited')
        expect(filter.tags).toEqual(['isHighlyCited'])

        filter.addTag('isHighlyCited') // duplicate
        expect(filter.tags).toEqual(['isHighlyCited'])

        filter.addTag('isSurvey')
        expect(filter.tags).toEqual(['isHighlyCited', 'isSurvey'])
      })
    })

    describe('removeTag', () => {
      it('should remove tag and handle non-existent gracefully', () => {
        filter.tags = ['isHighlyCited', 'isSurvey']
        filter.removeTag('isHighlyCited')
        expect(filter.tags).toEqual(['isSurvey'])

        filter.removeTag('nonexistent')
        expect(filter.tags).toEqual(['isSurvey'])
      })
    })

    describe('toggleTag', () => {
      it('should toggle tag presence', () => {
        filter.toggleTag('isHighlyCited')
        expect(filter.tags).toEqual(['isHighlyCited'])

        filter.toggleTag('isHighlyCited')
        expect(filter.tags).toEqual([])
      })

      it('should toggle multiple different tags', () => {
        filter.toggleTag('isHighlyCited')
        expect(filter.tags).toEqual(['isHighlyCited'])

        filter.toggleTag('isSurvey')
        expect(filter.tags).toEqual(['isHighlyCited', 'isSurvey'])

        filter.toggleTag('isHighlyCited')
        expect(filter.tags).toEqual(['isSurvey'])
      })
    })
  })
})
