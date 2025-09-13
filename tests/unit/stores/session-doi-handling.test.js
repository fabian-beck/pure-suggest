import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSessionStore } from '@/stores/session.js'

// Mock external dependencies
vi.mock('@/core/Publication.js', () => ({
  default: class MockPublication {
    constructor(doi) {
      this.doi = doi
    }
  }
}))

describe('Session Store - DOI Handling', () => {
  let sessionStore

  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStore = useSessionStore()
  })

  describe('addPublicationsToSelection', () => {
    it('should handle null and undefined DOIs without crashing', async () => {
      // Arrange: Mix of valid and invalid DOIs
      const mixedDois = [
        '10.1234/valid-doi-1',
        null,
        '10.1234/valid-doi-2', 
        undefined,
        '10.1234/valid-doi-3'
      ]
      
      // Act: This should not crash
      await sessionStore.addPublicationsToSelection(mixedDois)
      
      // Assert: Only valid DOIs should be added
      expect(sessionStore.selectedPublications).toHaveLength(3)
      expect(sessionStore.selectedPublications[0].doi).toBe('10.1234/valid-doi-1')
      expect(sessionStore.selectedPublications[1].doi).toBe('10.1234/valid-doi-2')
      expect(sessionStore.selectedPublications[2].doi).toBe('10.1234/valid-doi-3')
    })

    it('should handle empty string DOIs by filtering them out', async () => {
      // Arrange: Mix of valid DOIs and empty strings
      const doisWithEmpties = [
        '10.1234/valid',
        '',
        '   ', // whitespace only
        '10.1234/another-valid'
      ]
      
      // Act
      await sessionStore.addPublicationsToSelection(doisWithEmpties)
      
      // Assert: Only non-empty DOIs should be added
      expect(sessionStore.selectedPublications).toHaveLength(2)
      expect(sessionStore.selectedPublications[0].doi).toBe('10.1234/valid')
      expect(sessionStore.selectedPublications[1].doi).toBe('10.1234/another-valid')
    })

    it('should handle array with only invalid DOIs gracefully', async () => {
      // Arrange: Only invalid DOIs
      const invalidDois = [null, undefined, '', '   ']
      
      // Act
      await sessionStore.addPublicationsToSelection(invalidDois)
      
      // Assert: No publications should be added
      expect(sessionStore.selectedPublications).toHaveLength(0)
    })

    it('should still work normally with valid DOIs', async () => {
      // Arrange: Only valid DOIs
      const validDois = ['10.1234/test-1', '10.1234/test-2']
      
      // Act
      await sessionStore.addPublicationsToSelection(validDois)
      
      // Assert: All should be added normally
      expect(sessionStore.selectedPublications).toHaveLength(2)
      expect(sessionStore.selectedPublications[0].doi).toBe('10.1234/test-1')
      expect(sessionStore.selectedPublications[1].doi).toBe('10.1234/test-2')
    })
  })
})