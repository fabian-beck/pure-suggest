import { describe, it, expect, vi } from 'vitest'

// Import after mocking
import Publication from '@/core/Publication.js'

// Direct test of the HTML removal function by creating a mock module
const mockTextProcessing = {
  MAX_TITLE_LENGTH: 200,
  TITLE_TRUNCATION_POINT: 150,
  TITLE_TRUNCATION_SUFFIX: '...'
}

const mockTitleWordMap = {
  'of': 'of',
  'and': 'and',
  'the': 'the',
  'in': 'in',
  'on': 'on',
  'for': 'for'
}

// Mock the constants before importing Publication
vi.mock('@/constants/publication.js', () => ({
  CURRENT_YEAR: 2024,
  SCORING: { DEFAULT_BOOST_FACTOR: 1 },
  SURVEY_THRESHOLDS: {},
  CITATION_THRESHOLDS: {},
  PUBLICATION_AGE: {},
  TEXT_PROCESSING: mockTextProcessing,
  SURVEY_KEYWORDS: [],
  // eslint-disable-next-line sonarjs/slow-regex
  ORDINAL_REGEX: /\d+(st|nd|rd|th)/i,
  ROMAN_NUMERAL_REGEX: /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})(\?.?)$/i,
  ORCID_REGEX: /\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]/,
  TITLE_WORD_MAP: mockTitleWordMap,
  PUBLICATION_TAGS: {}
}))

// Mock Cache
vi.mock('@/lib/Cache.js', () => ({
  cachedFetch: vi.fn()
}))

// Helper function to test HTML removal - we'll test indirectly through processTitle
function testHtmlRemoval(inputTitle) {
  const publication = new Publication('10.1234/test')
  const data = { title: inputTitle }
  publication.processTitle(data)
  return publication.title
}

describe('Publication HTML Tag Removal', () => {

  describe('basic HTML tag removal', () => {
    it('should remove simple HTML tags', () => {
      const cleanedTitle = testHtmlRemoval('A Study of <b>Machine Learning</b> Methods')
      
      expect(cleanedTitle).toBe('A Study of Machine Learning Methods')
      expect(cleanedTitle).not.toContain('<b>')
      expect(cleanedTitle).not.toContain('</b>')
    })

    it('should remove multiple different tags', () => {
      const cleanedTitle = testHtmlRemoval('Research on <i>Neural</i> <b>Networks</b> and <u>Deep Learning</u>')
      
      expect(cleanedTitle).toBe('Research on Neural Networks and Deep Learning')
      expect(cleanedTitle).not.toContain('<i>')
      expect(cleanedTitle).not.toContain('</i>')
      expect(cleanedTitle).not.toContain('<b>')
      expect(cleanedTitle).not.toContain('</b>')
      expect(cleanedTitle).not.toContain('<u>')
      expect(cleanedTitle).not.toContain('</u>')
    })

    it('should remove self-closing tags', () => {
      const cleanedTitle = testHtmlRemoval('Data Analysis<br/>and Visualization<hr/>')
      
      expect(cleanedTitle).toBe('Data Analysisand Visualization')
      expect(cleanedTitle).not.toContain('<br/>')
      expect(cleanedTitle).not.toContain('<hr/>')
    })

    it('should remove tags with attributes', () => {
      const cleanedTitle = testHtmlRemoval('A <span class="highlight">comprehensive</span> review')
      
      expect(cleanedTitle).toBe('A comprehensive review')
      expect(cleanedTitle).not.toContain('<span class="highlight">')
      expect(cleanedTitle).not.toContain('</span>')
    })

    it('should handle empty tags', () => {
      const cleanedTitle = testHtmlRemoval('Study<></> of algorithms')
      
      expect(cleanedTitle).toBe('Study of algorithms')
      expect(cleanedTitle).not.toContain('<>')
      expect(cleanedTitle).not.toContain('</>')
    })

    it('should remove tags with complex attributes', () => {
      const cleanedTitle = testHtmlRemoval('Analysis <a href="http://example.com" target="_blank">link</a> here')
      
      expect(cleanedTitle).toBe('Analysis link here')
      expect(cleanedTitle).not.toContain('<a href')
      expect(cleanedTitle).not.toContain('</a>')
    })
  })

  describe('edge cases for HTML tag removal', () => {
    it('should handle malformed tags gracefully', () => {
      const cleanedTitle = testHtmlRemoval('Text with <malformed tag content')
      
      // Current regex /<[^>]*>/g should remove <malformed tag content even without closing >
      // This documents current behavior
      expect(cleanedTitle).toBeDefined()
      expect(cleanedTitle).toContain('Text with')
    })

    it('should handle nested tags', () => {
      const cleanedTitle = testHtmlRemoval('Text with <div><span>nested</span> content</div>')
      
      expect(cleanedTitle).toBe('Text with nested content')
      expect(cleanedTitle).not.toContain('<div>')
      expect(cleanedTitle).not.toContain('<span>')
      expect(cleanedTitle).not.toContain('</span>')
      expect(cleanedTitle).not.toContain('</div>')
    })

    it('should handle tags with special characters in attributes', () => {
      const cleanedTitle = testHtmlRemoval('Research <span data-value="test&amp;data">important</span> findings')
      
      expect(cleanedTitle).toBe('Research important findings')
      expect(cleanedTitle).not.toContain('<span')
      expect(cleanedTitle).not.toContain('</span>')
    })

    it('should handle multiple consecutive tags', () => {
      const cleanedTitle = testHtmlRemoval('Text</b></i></u> with multiple closing tags')
      
      expect(cleanedTitle).toBe('Text with multiple closing tags')
      expect(cleanedTitle).not.toContain('</b>')
      expect(cleanedTitle).not.toContain('</i>')
      expect(cleanedTitle).not.toContain('</u>')
    })

    it('should handle performance stress test - many tags', () => {
      const manyTags = Array(50).fill('<span>word</span>').join(' ')
      const cleanedTitle = testHtmlRemoval(`Research ${manyTags} conclusion`)
      
      expect(cleanedTitle).toContain('Research')
      expect(cleanedTitle).toContain('conclusion')
      expect(cleanedTitle).toContain('word')
      expect(cleanedTitle).not.toContain('<span>')
      expect(cleanedTitle).not.toContain('</span>')
    })

    it('should handle potential backtracking scenario - repeated angle brackets', () => {
      const cleanedTitle = testHtmlRemoval('Text with <<<>>> multiple brackets')
      
      expect(cleanedTitle).toBeDefined()
      expect(cleanedTitle).toContain('Text with')
      expect(cleanedTitle).toContain('multiple brackets')
    })

    it('should handle tags with newlines and whitespace', () => {
      const cleanedTitle = testHtmlRemoval('Text with <div\\n  class="test"\\n  id="example">content</div> here')
      
      expect(cleanedTitle).toBe('Text with content here')
      expect(cleanedTitle).not.toContain('<div')
      expect(cleanedTitle).not.toContain('</div>')
    })
  })

  describe('integration with cleanTitle function', () => {
    it('should work as part of the full cleaning process', () => {
      const cleanedTitle = testHtmlRemoval('A <b>Comprehensive</b> Study  of   <i>Machine Learning</i>')
      
      // Should remove HTML tags but preserve original whitespace structure
      expect(cleanedTitle).toBe('A Comprehensive Study  of   Machine Learning')
      expect(cleanedTitle).not.toContain('<b>')
      expect(cleanedTitle).not.toContain('<i>')
      // Note: multiple spaces are preserved in current implementation
    })

    it('should handle empty result after tag removal', () => {
      const cleanedTitle = testHtmlRemoval('<div></div><span></span>')
      
      expect(cleanedTitle).toBe('')
    })

    it('should preserve text content while removing tags', () => {
      const cleanedTitle = testHtmlRemoval('<script>alert("test")</script>Important Research<style>body{}</style>')
      
      expect(cleanedTitle).toContain('Important Research')
      expect(cleanedTitle).toContain('Alert("test")')  // Script content preserved and capitalized
      expect(cleanedTitle).toContain('body{}')         // Style content preserved
      expect(cleanedTitle).not.toContain('<script>')
      expect(cleanedTitle).not.toContain('</script>')
      expect(cleanedTitle).not.toContain('<style>')
      expect(cleanedTitle).not.toContain('</style>')
    })
  })
})