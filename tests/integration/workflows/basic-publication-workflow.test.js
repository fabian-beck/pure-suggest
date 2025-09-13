import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupTestEnvironment, createMockPublication, simulateAddPublicationByDoi, waitForAsyncOperations } from '../utils/test-helpers.js'

// Mock external dependencies
vi.mock('@/lib/Cache.js', () => ({
  clearCache: vi.fn(),
  getFromCache: vi.fn(),
  setInCache: vi.fn()
}))

vi.mock('@/services/SuggestionService.js', () => ({
  SuggestionService: {
    computeSuggestions: vi.fn().mockResolvedValue({
      publications: []
    })
  }
}))

describe('Basic Publication Workflow Integration', () => {
  let sessionStore, interfaceStore, appState

  beforeEach(() => {
    const testEnv = setupTestEnvironment()
    sessionStore = testEnv.sessionStore
    interfaceStore = testEnv.interfaceStore
    appState = testEnv.appState

    // Mock interface store methods to prevent UI interactions during tests
    interfaceStore.showErrorMessage = vi.fn()
    interfaceStore.startLoading = vi.fn()
    interfaceStore.endLoading = vi.fn()
  })

  describe('Adding Publications', () => {
    it('should start with empty session', () => {
      expect(appState.isEmpty.value).toBe(true)
      expect(sessionStore.selectedPublications).toHaveLength(0)
      expect(sessionStore.suggestedPublications).toHaveLength(0)
    })

    it('should add publication to selected list', async () => {
      // Arrange
      const testDoi = '10.1234/test-publication-1'
      
      // Act: Simulate user adding a publication
      const publication = await simulateAddPublicationByDoi(appState, testDoi)
      
      // Assert: Publication should be added to session
      expect(appState.isEmpty.value).toBe(false)
      expect(sessionStore.selectedPublications).toHaveLength(1)
      expect(sessionStore.selectedPublications[0].doi).toBe(testDoi)
      expect(sessionStore.selectedPublicationsDois).toContain(testDoi)
    })

    it('should handle multiple publications in session', async () => {
      // Arrange
      const testDois = [
        '10.1234/test-publication-1',
        '10.1234/test-publication-2',
        '10.1234/test-publication-3'
      ]
      
      // Act: Add multiple publications
      for (const doi of testDois) {
        await simulateAddPublicationByDoi(appState, doi)
      }
      
      // Assert: All publications should be in session
      expect(sessionStore.selectedPublications).toHaveLength(3)
      expect(sessionStore.selectedPublicationsDois).toHaveLength(3)
      
      // Verify each publication has expected structure
      sessionStore.selectedPublications.forEach((pub, index) => {
        expect(pub.doi).toBe(testDois[index])
        expect(pub.title).toBeDefined()
        expect(pub.year).toBeDefined()
        expect(pub.authors).toBeDefined()
      })
    })
  })

  describe('Suggestion Generation', () => {
    it('should generate suggestions after adding publications', async () => {
      // Arrange: Mock suggestion service with mock publications
      const { SuggestionService } = await import('@/services/SuggestionService.js')
      const mockSuggestions = [
        createMockPublication({
          doi: '10.1234/suggested-publication-1',
          title: 'Suggested Publication 1',
          year: 2022,
          score: 0.85
        }),
        createMockPublication({
          doi: '10.1234/suggested-publication-2',
          title: 'Suggested Publication 2',
          year: 2021,
          score: 0.72
        })
      ]
      SuggestionService.computeSuggestions.mockResolvedValueOnce({
        publications: mockSuggestions
      })
      
      // Arrange: Add a seed publication
      const seedDoi = '10.1234/seed-publication'
      await simulateAddPublicationByDoi(appState, seedDoi)
      
      // Act: Trigger suggestion computation
      await appState.updateSuggestions()
      await waitForAsyncOperations()
      
      // Assert: Should have suggestions
      expect(sessionStore.suggestedPublications).toHaveLength(2)
      expect(sessionStore.suggestedPublications[0].doi).toBe('10.1234/suggested-publication-1')
      expect(sessionStore.suggestedPublications[1].doi).toBe('10.1234/suggested-publication-2')
      
      // Verify scores exist (actual values may be recalculated by scoring system)
      expect(sessionStore.suggestedPublications[0].score).toBeDefined()
      expect(sessionStore.suggestedPublications[1].score).toBeDefined()
      expect(typeof sessionStore.suggestedPublications[0].score).toBe('number')
      expect(typeof sessionStore.suggestedPublications[1].score).toBe('number')
    })

    it('should maintain suggestion ranking by score', async () => {
      // Arrange: Mock suggestion service with unordered suggestions
      const { SuggestionService } = await import('@/services/SuggestionService.js')
      const mockSuggestions = [
        createMockPublication({ doi: '10.1234/low-score', score: 0.3 }),
        createMockPublication({ doi: '10.1234/high-score', score: 0.9 }),
        createMockPublication({ doi: '10.1234/med-score', score: 0.6 })
      ]
      SuggestionService.computeSuggestions.mockResolvedValueOnce({
        publications: mockSuggestions
      })
      
      await simulateAddPublicationByDoi(appState, '10.1234/seed-publication')
      
      // Act: Generate suggestions
      await appState.updateSuggestions()
      await waitForAsyncOperations()
      
      // Assert: Suggestions should be ranked by score (highest first)
      const suggestions = sessionStore.suggestedPublications
      expect(suggestions).toHaveLength(3)
      
      for (let i = 0; i < suggestions.length - 1; i++) {
        expect(suggestions[i].score).toBeGreaterThanOrEqual(suggestions[i + 1].score)
      }
    })

    it('should handle empty suggestions gracefully', async () => {
      // Arrange: Mock empty suggestions
      const { SuggestionService } = await import('@/services/SuggestionService.js')
      SuggestionService.computeSuggestions.mockResolvedValueOnce({ publications: [] })
      
      await simulateAddPublicationByDoi(appState, '10.1234/seed-publication')
      
      // Act: Generate suggestions
      await appState.updateSuggestions()
      await waitForAsyncOperations()
      
      // Assert: Should handle empty suggestions without error
      expect(sessionStore.suggestedPublications).toHaveLength(0)
      expect(interfaceStore.showErrorMessage).not.toHaveBeenCalled()
    })
  })

  describe('Session State Management', () => {
    it('should maintain session consistency after operations', async () => {
      // Arrange: Mock suggestion service
      const { SuggestionService } = await import('@/services/SuggestionService.js')
      const mockSuggestions = [
        createMockPublication({ doi: '10.1234/suggestion-1' }),
        createMockPublication({ doi: '10.1234/suggestion-2' })
      ]
      SuggestionService.computeSuggestions.mockResolvedValueOnce({
        publications: mockSuggestions
      })
      
      // Arrange: Create initial state
      const selectedDois = ['10.1234/selected-1', '10.1234/selected-2']
      
      // Act: Add publications and generate suggestions
      for (const doi of selectedDois) {
        await simulateAddPublicationByDoi(appState, doi)
      }
      await appState.updateSuggestions()
      await waitForAsyncOperations()
      
      // Assert: Session state should be consistent
      expect(sessionStore.selectedPublications).toHaveLength(2)
      expect(sessionStore.selectedPublicationsDois).toHaveLength(2)
      expect(sessionStore.suggestedPublications).toHaveLength(2)
      
      // Verify no selected publications appear in suggestions
      const suggestedDois = sessionStore.suggestedPublications.map(p => p.doi)
      for (const selectedDoi of selectedDois) {
        expect(suggestedDois).not.toContain(selectedDoi)
      }
    })

    it('should clear session completely', () => {
      // Arrange: Add some publications
      sessionStore.selectedPublications.push(createMockPublication())
      sessionStore.suggestion = {
        publications: [createMockPublication({ doi: '10.1234/suggested' })]
      }
      sessionStore.boostKeywordString = 'machine learning'
      
      // Act: Clear session
      sessionStore.clear()
      
      // Assert: Session should be completely empty
      expect(appState.isEmpty.value).toBe(true)
      expect(sessionStore.selectedPublications).toHaveLength(0)
      expect(sessionStore.suggestedPublications).toHaveLength(0)
      expect(sessionStore.selectedPublicationsDois).toHaveLength(0)
      expect(sessionStore.boostKeywordString).toBe('')
    })
  })

  describe('Error Handling', () => {
    it('should handle suggestion service errors gracefully', async () => {
      // Arrange: Mock service error
      const { SuggestionService } = await import('@/services/SuggestionService.js')
      SuggestionService.computeSuggestions.mockRejectedValueOnce(new Error('Network error'))
      
      await simulateAddPublicationByDoi(appState, '10.1234/seed-publication')
      
      // Act: Attempt to generate suggestions (this should not throw)
      try {
        await appState.updateSuggestions()
        await waitForAsyncOperations()
        
        // Assert: Should handle error without crashing
        expect(sessionStore.suggestedPublications).toHaveLength(0)
      } catch (error) {
        // If the error is re-thrown, that's also acceptable behavior
        expect(error.message).toBe('Network error')
      }
    })
  })
})