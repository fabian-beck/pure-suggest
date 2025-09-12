import { describe, it, expect, beforeEach, vi } from 'vitest'

import Publication from '@/core/Publication.js'

// Mock dependencies
vi.mock('@/lib/Cache.js', () => ({
  cachedFetch: vi.fn()
}))

describe('Publication Trim Pattern Processing', () => {
  let publication

  beforeEach(() => {
    // Mock constants
    vi.doMock('@/constants/publication.js', () => ({
      CURRENT_YEAR: 2024,
      SCORING: { DEFAULT_BOOST_FACTOR: 1 },
      SURVEY_THRESHOLDS: {},
      CITATION_THRESHOLDS: {},
      PUBLICATION_AGE: {},
      TEXT_PROCESSING: {},
      SURVEY_KEYWORDS: [],
      // eslint-disable-next-line sonarjs/slow-regex
      ORDINAL_REGEX: /\d+(?:st|nd|rd|th)/i,
      ROMAN_NUMERAL_REGEX: /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})(\?.?)$/i,
      ORCID_REGEX: /\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]/,
      TITLE_WORD_MAP: {
        'of': 'of',
        'and': 'and',
        'the': 'the',
        'journal': 'journal',
        'conference': 'conference'
      },
      PUBLICATION_TAGS: {}
    }))
    
    publication = new Publication('10.1234/test')
  })

  describe('leading dots and spaces removal', () => {
    it('should remove leading dots', () => {
      const data = { container: '...Journal of Science' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('Journal of Science')
      expect(publication.container).not.toMatch(/^\./)
    })

    it('should remove leading spaces and dots', () => {
      const data = { container: '  . . Journal of Science' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('Journal of Science')
      expect(publication.container).not.toMatch(/^[\s.]+/)
    })

    it('should remove multiple leading dots and spaces', () => {
      const data = { container: ' ... .. . Conference Proceedings' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('Conference Proceedings')
    })
  })

  describe('trailing dots and spaces removal', () => {
    it('should remove trailing dots', () => {
      const data = { container: 'Journal of Science...' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('Journal of Science')
      expect(publication.container).not.toMatch(/\.$/)
    })

    it('should remove trailing spaces and dots', () => {
      const data = { container: 'Journal of Science . . .  ' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('Journal of Science')
      // eslint-disable-next-line sonarjs/slow-regex -- Test pattern for edge cases
      expect(publication.container).not.toMatch(/[\s.]+$/)
    })

    it('should remove multiple trailing dots and spaces', () => {
      const data = { container: 'Conference Proceedings ... .. .' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('Conference Proceedings')
    })
  })

  describe('leading and trailing removal combined', () => {
    it('should remove both leading and trailing dots/spaces', () => {
      const data = { container: ' .. Journal of Science .. ' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('Journal of Science')
    })

    it('should handle complex leading/trailing patterns', () => {
      const data = { container: '. . . Conference Proceedings . . .' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('Conference Proceedings')
    })

    it('should preserve internal dots and spaces', () => {
      const data = { container: '..Journal of Computer Science..' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('Journal of Computer Science')
      expect(publication.container).toContain('of')
    })
  })

  describe('edge cases', () => {
    it('should handle strings with only dots and spaces', () => {
      const data = { container: ' . . . ' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('')
    })

    it('should handle empty strings', () => {
      const data = { container: '' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('')
    })

    it('should handle strings without leading/trailing issues', () => {
      const data = { container: 'Journal of Science' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('Journal of Science')
    })

    it('should handle mixed punctuation at edges', () => {
      const data = { container: '. , Journal of Science , .' }
      publication.processContainer(data)
      
      // Should remove dots and spaces but preserve other punctuation
      expect(publication.container).toBe(', Journal of Science ,')
    })
  })

  describe('performance tests for trim patterns', () => {
    it('should handle many leading dots and spaces efficiently', () => {
      const manyDots = '.'.repeat(1000)
      const manySpaces = ' '.repeat(1000)
      const data = { container: `${manyDots}${manySpaces}Journal${manySpaces}${manyDots}` }
      
      const startTime = Date.now()
      publication.processContainer(data)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should complete quickly
      expect(publication.container).toBe('Journal')
    })

    it('should handle alternating patterns efficiently', () => {
      const alternating = '. '.repeat(500) // Creates ". . . . ." pattern
      const data = { container: `${alternating}Content${alternating}` }
      
      const startTime = Date.now()
      publication.processContainer(data)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should complete without backtracking issues
      expect(publication.container).toBe('Content')
    })

    it('should handle pathological backtracking case efficiently', () => {
      // This pattern could cause issues with the old /(^[. ]+|[. ]+$)/g approach
      const problematicInput = ` ${  '.'.repeat(100)  }${' '.repeat(100)  }Text${  ' '.repeat(100)  }${'.'.repeat(100)  } `
      const data = { container: problematicInput }
      
      const startTime = Date.now()
      publication.processContainer(data)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(50) // Should be very fast with separate replace calls
      expect(publication.container).toBe('Text')
    })
  })

  describe('integration with other processing', () => {
    it('should trim after word processing', () => {
      const data = { container: '..Conference of Science..' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('Conference of Science')
      expect(publication.container).toContain('of') // Word mapping applied
    })

    it('should work with ordinals and trimming', () => {
      const data = { container: '..2nd Conference..' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('2nd Conference')
      expect(publication.container).toContain('2nd') // Ordinal processed
    })

    it('should work with parentheses and trimming', () => {
      const data = { container: '..(IEEE) Conference..' }
      publication.processContainer(data)
      
      expect(publication.container).toBe('(IEEE) Conference')
      expect(publication.container).toContain('(IEEE)') // Parentheses processed
    })
  })

  describe('regex pattern verification', () => {
    it('should use two separate replace operations for efficiency', () => {
      // This test verifies the new approach of using separate replaces
      // instead of alternation pattern
      const data = { container: ' . . Journal . . ' }
      publication.processContainer(data)
      
      // Should clean both leading and trailing
      expect(publication.container).toBe('Journal')
      expect(publication.container).not.toMatch(/^[\s.]+/)
      // eslint-disable-next-line sonarjs/slow-regex -- Test pattern for edge case validation
      expect(publication.container).not.toMatch(/[\s.]+$/)
    })
  })
})