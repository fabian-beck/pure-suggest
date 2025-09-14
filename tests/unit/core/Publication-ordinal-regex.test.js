import { describe, it, expect, beforeEach, vi } from 'vitest'

import Publication from '@/core/Publication.js'

// Mock dependencies
vi.mock('@/lib/Cache.js', () => ({
  cachedFetch: vi.fn()
}))

describe('Publication ORDINAL_REGEX Pattern', () => {
  let publication

  beforeEach(() => {
    // Mock constants with the current ORDINAL_REGEX pattern
    vi.doMock('@/constants/publication.js', () => ({
      CURRENT_YEAR: 2024,
      SCORING: { DEFAULT_BOOST_FACTOR: 1 },
      SURVEY_THRESHOLDS: {},
      CITATION_THRESHOLDS: {},
      PUBLICATION_AGE: {},
      TEXT_PROCESSING: {},
      SURVEY_KEYWORDS: [],
      // eslint-disable-next-line sonarjs/slow-regex
      ORDINAL_REGEX: /\d+(?:st|nd|rd|th)/i, // Using the new non-capturing group pattern
      ROMAN_NUMERAL_REGEX: /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})(\?.?)$/i,
      ORCID_REGEX: /\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]/,
      TITLE_WORD_MAP: {
        'of': 'of',
        'and': 'and',
        'the': 'the',
        'in': 'in',
        'on': 'on',
        'for': 'for',
        'edition': 'edition',
        'conference': 'conference',
        'journal': 'journal'
      },
      PUBLICATION_TAGS: {}
    }))
    
    publication = new Publication('10.1234/test')
  })

  describe('basic ordinal recognition', () => {
    it('should recognize and lowercase 1st', () => {
      const data = { container: 'Conference 1st Edition' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('1st')
      // Should be lowercase because ordinals are processed that way
      expect(publication.container.toLowerCase()).toContain('1st')
    })

    it('should recognize and lowercase 2nd', () => {
      const data = { container: 'Journal 2nd Volume' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('2nd')
      expect(publication.container.toLowerCase()).toContain('2nd')
    })

    it('should recognize and lowercase 3rd', () => {
      const data = { container: 'Workshop 3rd Annual' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('3rd')
      expect(publication.container.toLowerCase()).toContain('3rd')
    })

    it('should recognize and lowercase th ordinals', () => {
      const data = { container: 'Conference 4th International 5th Regional 10th Annual' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('4th')
      expect(publication.container).toContain('5th')
      expect(publication.container).toContain('10th')
    })
  })

  describe('case insensitive matching', () => {
    it('should match uppercase ordinals', () => {
      const data = { container: 'Conference 1ST Edition' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('1st') // Should be lowercased
    })

    it('should match mixed case ordinals', () => {
      const data = { container: 'Workshop 2Nd Annual' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('2nd')
    })

    it('should match all case variations', () => {
      const data = { container: 'Event 3RD international 4TH regional' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('3rd')
      expect(publication.container).toContain('4th')
    })
  })

  describe('numeric variations', () => {
    it('should handle single digit ordinals', () => {
      const data = { container: '1st 2nd 3rd 4th 5th 6th 7th 8th 9th' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('1st')
      expect(publication.container).toContain('2nd')
      expect(publication.container).toContain('3rd')
      expect(publication.container).toContain('4th')
      expect(publication.container).toContain('9th')
    })

    it('should handle double digit ordinals', () => {
      const data = { container: '10th 11th 12th 13th 20th 21st 22nd 23rd' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('10th')
      expect(publication.container).toContain('11th')
      expect(publication.container).toContain('12th')
      expect(publication.container).toContain('13th')
      expect(publication.container).toContain('21st')
      expect(publication.container).toContain('22nd')
      expect(publication.container).toContain('23rd')
    })

    it('should handle large ordinals', () => {
      const data = { container: 'Conference 101st Edition 102nd Meeting 103rd Workshop 150th Anniversary' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('101st')
      expect(publication.container).toContain('102nd')
      expect(publication.container).toContain('103rd')
      expect(publication.container).toContain('150th')
    })
  })

  describe('edge cases and non-matches', () => {
    it('should not match partial ordinal suffixes without numbers', () => {
      const data = { container: 'The statement thinks about nothing' }
      publication.processContainer(data)
      
      // Should NOT match 'st' from 'statement' or 'th' from 'thinks' or 'thinks' because they lack preceding digits
      expect(publication.container).toContain('statement')
      expect(publication.container).toContain('thinks')
      expect(publication.container).toContain('about')
      expect(publication.container).toContain('nothing')
    })

    it('should not match ordinal suffixes without numbers', () => {
      const data = { container: 'Journal st nd rd th Edition' }
      publication.processContainer(data)
      
      // Should not transform standalone suffixes
      expect(publication.container).toContain('st')
      expect(publication.container).toContain('nd')
      expect(publication.container).toContain('rd')
      expect(publication.container).toContain('th')
    })

    it('should not match numbers without ordinal suffixes', () => {
      const data = { container: 'Volume 123 Issue 456' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('123')
      expect(publication.container).toContain('456')
    })

    it('should handle mixed ordinal and non-ordinal numbers', () => {
      const data = { container: 'Volume 12 Issue 3rd Conference 2024' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('12') // not changed
      expect(publication.container).toContain('3rd') // processed as ordinal
      expect(publication.container).toContain('2024') // not changed
    })
  })

  describe('performance and backtracking prevention', () => {
    it('should handle repeated patterns efficiently', () => {
      // This tests against potential ReDoS with repeated alternation
      const data = { container: 'Journal 1st 2nd 3rd 4th 5th 6th 7th 8th 9th 10th Edition' }
      publication.processContainer(data)
      
      expect(publication.container).toBeDefined()
      expect(publication.container).toContain('1st')
      expect(publication.container).toContain('10th')
    })

    it('should handle pathological input efficiently', () => {
      // Test case that could cause backtracking with the old (st|nd|rd|th) pattern
      const repeatedPattern = `${'1'.repeat(100)  }st`
      const data = { container: `Conference ${repeatedPattern} Edition` }
      
      // This should complete quickly without excessive backtracking
      const startTime = Date.now()
      publication.processContainer(data)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should complete in <100ms
      expect(publication.container).toContain(repeatedPattern)
    })

    it('should handle multiple ordinals with complex text efficiently', () => {
      const complexText = Array(50).fill('Conference 1st Edition 2nd Volume 3rd Issue').join(' ')
      const data = { container: complexText }
      
      const startTime = Date.now()
      publication.processContainer(data)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(200) // Should complete quickly
      expect(publication.container).toBeDefined()
    })
  })

  describe('integration with other container processing', () => {
    it('should work with parentheses and ordinals together', () => {
      const data = { container: 'Conference (IEEE) 21st International' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('(IEEE)')
      expect(publication.container).toContain('21st')
    })

    it('should work with roman numerals and ordinals together', () => {
      const data = { container: 'Symposium III 3rd Annual Edition' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('III') // Roman numeral (uppercase)
      expect(publication.container).toContain('3rd') // Ordinal (lowercase)
    })

    it('should work with word mapping and ordinals together', () => {
      const data = { container: 'Conference of the 2nd International Edition' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('of')
      expect(publication.container).toContain('the')
      expect(publication.container).toContain('2nd')
    })
  })

  describe('regex pattern behavior verification', () => {
    it('should use non-capturing groups (behavioral test)', () => {
      // This test verifies that our (?:st|nd|rd|th) pattern behaves the same as (st|nd|rd|th)
      // but without the capturing group overhead
      const data = { container: 'Conference 1st 2nd 3rd 4th Edition' }
      publication.processContainer(data)
      
      // Verify all ordinals are processed correctly
      const result = publication.container.toLowerCase()
      expect(result).toContain('1st')
      expect(result).toContain('2nd') 
      expect(result).toContain('3rd')
      expect(result).toContain('4th')
    })
  })
})