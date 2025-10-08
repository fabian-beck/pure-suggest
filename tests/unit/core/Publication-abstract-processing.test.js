import { describe, it, expect, beforeEach, vi } from 'vitest'

import Publication from '@/core/Publication.js'

// Mock dependencies
vi.mock('@/lib/Cache.js', () => ({
  cachedFetch: vi.fn()
}))

describe('Publication Abstract Processing', () => {
  let publication

  beforeEach(() => {
    // Mock constants
    vi.doMock('@/constants/publication.js', () => ({
      CURRENT_YEAR: 2024,
      SCORING: { DEFAULT_BOOST_FACTOR: 1 },
      SURVEY_THRESHOLDS: {},
      CITATION_THRESHOLDS: {},
      PUBLICATION_AGE: {},
      TEXT_PROCESSING: {
        MAX_TITLE_LENGTH: 300,
        TITLE_TRUNCATION_POINT: 295,
        TITLE_TRUNCATION_SUFFIX: '[...]'
      },
      SURVEY_KEYWORDS: [],
      // eslint-disable-next-line sonarjs/slow-regex
      ORDINAL_REGEX: /\d+(?:st|nd|rd|th)/i,
      ROMAN_NUMERAL_REGEX: /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})(\?.?)$/i,
      ORCID_REGEX: /\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]/,
      TITLE_WORD_MAP: {
        'of': 'of',
        'and': 'and',
        'the': 'the'
      },
      PUBLICATION_TAGS: {}
    }))
    
    publication = new Publication('10.1234/test')
  })

  describe('abstract with leading "Abstract" keyword', () => {
    it('should remove "Abstract" from the beginning (exact case)', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'Abstract This is the actual abstract content.' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('This is the actual abstract content.')
      expect(publication.abstract).not.toMatch(/^Abstract/)
    })

    it('should remove "abstract" from the beginning (lowercase)', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'abstract This is the actual abstract content.' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('This is the actual abstract content.')
      expect(publication.abstract).not.toMatch(/^abstract/i)
    })

    it('should remove "ABSTRACT" from the beginning (uppercase)', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'ABSTRACT This is the actual abstract content.' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('This is the actual abstract content.')
      expect(publication.abstract).not.toMatch(/^ABSTRACT/)
    })

    it('should remove "Abstract:" with colon from the beginning', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'Abstract: This is the actual abstract content.' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('This is the actual abstract content.')
    })

    it('should remove "Abstract " with multiple spaces', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'Abstract   This is the actual abstract content.' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('This is the actual abstract content.')
    })

    it('should handle "Abstract" with various punctuation', () => {
      const testCases = [
        { input: 'Abstract. This is content.', expected: 'This is content.' },
        { input: 'Abstract - This is content.', expected: 'This is content.' },
        { input: 'Abstract– This is content.', expected: 'This is content.' }
      ]
      
      testCases.forEach(({ input, expected }) => {
        const data = { title: 'Test', abstract: input }
        publication.processTitle(data)
        expect(publication.abstract).toBe(expected)
      })
    })
  })

  describe('abstract without leading "Abstract" keyword', () => {
    it('should preserve abstract content without "Abstract" at the start', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'This is the actual abstract content without the keyword.' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('This is the actual abstract content without the keyword.')
    })

    it('should not remove "Abstract" from the middle of text', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'This abstract talks about Abstract concepts in science.' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('This abstract talks about Abstract concepts in science.')
      expect(publication.abstract).toContain('Abstract concepts')
    })

    it('should preserve abstract that ends with "Abstract"', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'This is an Abstract' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('This is an Abstract')
    })
  })

  describe('edge cases for abstract processing', () => {
    it('should handle null abstract', () => {
      const data = { 
        title: 'Test Title',
        abstract: null 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBeNull()
    })

    it('should handle undefined abstract', () => {
      const data = { 
        title: 'Test Title',
        abstract: undefined 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBeUndefined()
    })

    it('should handle empty string abstract', () => {
      const data = { 
        title: 'Test Title',
        abstract: '' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('')
    })

    it('should handle abstract that is only "Abstract"', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'Abstract' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('')
    })

    it('should handle abstract that is only "Abstract:"', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'Abstract:' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('')
    })

    it('should handle abstract with only whitespace after "Abstract"', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'Abstract   ' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('')
    })

    it('should preserve leading whitespace in content after removing "Abstract"', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'Abstract\nThis starts on a new line.' 
      }
      publication.processTitle(data)
      
      // Should preserve the newline and content structure
      expect(publication.abstract).toBe('This starts on a new line.')
    })

    it('should handle very long abstracts with "Abstract" prefix', () => {
      const longContent = 'A'.repeat(1000)
      const data = { 
        title: 'Test Title',
        abstract: `Abstract ${longContent}` 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe(longContent)
      expect(publication.abstract.length).toBe(1000)
    })
  })

  describe('real-world abstract examples', () => {
    it('should handle abstract from the issue screenshot', () => {
      const data = { 
        title: 'Dynamic Graph Visualization',
        abstract: 'Abstract Dynamic graph visualization focuses on the challenge of representing the evolution of relationships between entities in readable, scalable and effective diagrams.' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('Dynamic graph visualization focuses on the challenge of representing the evolution of relationships between entities in readable, scalable and effective diagrams.')
      expect(publication.abstract).not.toMatch(/^Abstract\s/)
    })

    it('should handle abstract with complex formatting', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'Abstract: We present a novel approach to solving complex problems. This work demonstrates significant improvements over previous methods.' 
      }
      publication.processTitle(data)
      
      expect(publication.abstract).toBe('We present a novel approach to solving complex problems. This work demonstrates significant improvements over previous methods.')
    })
  })

  describe('integration with title processing', () => {
    it('should process both title and abstract correctly', () => {
      const data = { 
        title: 'Test Title',
        abstract: 'Abstract This is the abstract.',
        year: 2024
      }
      publication.processTitle(data)
      
      expect(publication.title).toBe('Test Title')
      expect(publication.abstract).toBe('This is the abstract.')
      expect(publication.year).toBe(2024)
    })
  })
})
