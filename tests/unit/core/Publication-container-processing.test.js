import { describe, it, expect, beforeEach, vi } from 'vitest'

import Publication from '@/core/Publication.js'

// Mock dependencies
vi.mock('@/lib/Cache.js', () => ({
  cachedFetch: vi.fn()
}))

describe('Publication Container Processing', () => {
  let publication

  beforeEach(() => {
    publication = new Publication('10.1234/test')
  })

  describe('parentheses detection in container names', () => {
    it('should detect and uppercase simple parentheses content', () => {
      const data = { container: 'Journal (ABC) of Science' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('(ABC)')
    })

    it('should handle multiple words with parentheses', () => {
      const data = { container: 'Conference (IEEE) on Networks (ACM) Society' }
      publication.processContainer(data)
      
      // Should uppercase both parentheses content
      expect(publication.container).toContain('(IEEE)')
      expect(publication.container).toContain('(ACM)')
    })

    it('should handle parentheses with special characters', () => {
      const data = { container: 'Journal (Vol.1) Edition' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('(VOL.1)')
    })

    it('should handle empty parentheses', () => {
      const data = { container: 'Journal () of Science' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('()')
    })

    it('should handle single character in parentheses', () => {
      const data = { container: 'Journal (A) Series' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('(A)')
    })

    it('should handle parentheses with numbers', () => {
      const data = { container: 'Conference (2024) Proceedings' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('(2024)')
    })

    it('should not match unmatched opening parenthesis', () => {
      const data = { container: 'Journal (ABC of Science' }
      publication.processContainer(data)
      
      // Should not transform incomplete parentheses
      expect(publication.container).toContain('(ABC')
      expect(publication.container).not.toContain('(ABC OF SCIENCE')
    })

    it('should not match unmatched closing parenthesis', () => {
      const data = { container: 'Journal ABC) of Science' }
      publication.processContainer(data)
      
      // Should not transform incomplete parentheses
      expect(publication.container).toContain('ABC)')
    })

    it('should handle nested parentheses safely', () => {
      const data = { container: 'Journal (ABC(DEF)) Edition' }
      publication.processContainer(data)
      
      // Current regex /\(.+\)/ would match the whole thing
      // This test documents current behavior and will help verify any changes
      expect(publication.container).toBeDefined()
    })

    it('should handle parentheses spanning multiple words in single word context', () => {
      // Since the processing splits by spaces, parentheses content should be within single words
      const data = { container: 'Journal (Multi-word) Edition' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('(MULTI-WORD)')
    })
  })

  describe('integration with other container processing', () => {
    it('should work alongside ordinal processing', () => {
      const data = { container: 'Conference (IEEE) 2nd Edition' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('(IEEE)')
      expect(publication.container).toContain('2nd') // ordinal should be lowercase
    })

    it('should work alongside roman numeral processing', () => {
      const data = { container: 'Journal (ACM) Volume III' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('(ACM)')
      expect(publication.container).toContain('III') // roman should be uppercase
    })

    it('should work with title word mapping', () => {
      const data = { container: 'Journal (IEEE) of Computer Science' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('(IEEE)')
      expect(publication.container).toContain('of') // should use word map
    })
  })

  describe('edge cases for parentheses regex', () => {
    it('should handle parentheses with backtracking potential - repeated characters', () => {
      const data = { container: 'Journal (AAAAA) Edition' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('(AAAAA)')
    })

    it('should handle parentheses with alternating patterns', () => {
      const data = { container: 'Journal (ABABABAB) Conference' }
      publication.processContainer(data)
      
      expect(publication.container).toContain('(ABABABAB)')
    })

    it('should handle long parentheses content efficiently', () => {
      const longContent = 'A'.repeat(100)
      const data = { container: `Journal (${longContent}) Publication` }
      publication.processContainer(data)
      
      expect(publication.container).toContain(`(${longContent.toUpperCase()})`)
    })
  })
})