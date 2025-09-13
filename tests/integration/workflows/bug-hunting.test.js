import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupTestEnvironment, createMockPublication, waitForAsyncOperations } from '../utils/test-helpers.js'

// Mock external dependencies
vi.mock('@/lib/Cache.js', () => ({
  clearCache: vi.fn(),
  getFromCache: vi.fn(),
  setInCache: vi.fn(),
  cachedFetch: vi.fn().mockResolvedValue({})
}))

vi.mock('@/services/SuggestionService.js', () => ({
  SuggestionService: {
    computeSuggestions: vi.fn().mockResolvedValue({
      publications: []
    })
  }
}))

describe('Integration Edge Cases and Robustness Tests', () => {
  let sessionStore, interfaceStore, appState

  beforeEach(() => {
    const testEnv = setupTestEnvironment()
    sessionStore = testEnv.sessionStore
    interfaceStore = testEnv.interfaceStore
    appState = testEnv.appState

    // Mock interface store methods
    interfaceStore.showErrorMessage = vi.fn()
    interfaceStore.startLoading = vi.fn()
    interfaceStore.endLoading = vi.fn()

    // Reset mocks
    vi.clearAllMocks()
  })

  describe('Race Condition Bug Hunting', () => {
    it('should handle rapid successive suggestion updates without race conditions', async () => {
      // This test explores if rapid successive calls to updateSuggestions cause race conditions
      
      // Arrange: Create multiple publications
      const publications = [
        createMockPublication({ doi: '10.1234/pub-1' }),
        createMockPublication({ doi: '10.1234/pub-2' }),
        createMockPublication({ doi: '10.1234/pub-3' })
      ]
      
      // Mock slow suggestion computation
      const { SuggestionService } = await import('@/services/SuggestionService.js')
      let callCount = 0
      SuggestionService.computeSuggestions.mockImplementation(async () => {
        callCount++
        const delay = Math.random() * 100 // Random delay to simulate real conditions
        await new Promise(resolve => setTimeout(resolve, delay))
        return {
          publications: [
            createMockPublication({ 
              doi: `10.1234/suggestion-${callCount}`,
              title: `Suggestion from call ${callCount}`
            })
          ]
        }
      })
      
      // Add publications to trigger multiple suggestion updates
      sessionStore.selectedPublications.push(...publications)
      
      // Act: Trigger multiple rapid suggestion updates (potential race condition)
      const promises = [
        appState.updateSuggestions(),
        appState.updateSuggestions(),
        appState.updateSuggestions()
      ]
      
      await Promise.all(promises)
      await waitForAsyncOperations(200)
      
      // Assert: Only one set of suggestions should be present (last one wins)
      // If there's a race condition, we might see inconsistent state
      expect(sessionStore.suggestedPublications).toHaveLength(1)
      
      // The suggestion service should have been called (but implementation should handle overlaps)
      expect(SuggestionService.computeSuggestions).toHaveBeenCalled()
    })

    it('should handle publication addition during suggestion computation', async () => {
      // This explores potential race between adding publications and computing suggestions
      
      // Arrange: Mock slow suggestion computation
      const { SuggestionService } = await import('@/services/SuggestionService.js')
      let computationStarted = false
      let computationFinished = false
      
      SuggestionService.computeSuggestions.mockImplementation(async () => {
        computationStarted = true
        await new Promise(resolve => setTimeout(resolve, 100))
        computationFinished = true
        return { publications: [createMockPublication({ doi: '10.1234/result' })] }
      })
      
      // Add first publication
      sessionStore.selectedPublications.push(createMockPublication({ doi: '10.1234/first' }))
      
      // Act: Start suggestion computation
      const suggestionPromise = appState.updateSuggestions()
      
      // While computation is running, add another publication
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(computationStarted).toBe(true)
      expect(computationFinished).toBe(false)
      
      // Add second publication during computation
      sessionStore.selectedPublications.push(createMockPublication({ doi: '10.1234/second' }))
      
      await suggestionPromise
      await waitForAsyncOperations()
      
      // Assert: State should be consistent
      expect(sessionStore.selectedPublications).toHaveLength(2)
      expect(sessionStore.suggestedPublications).toHaveLength(1)
    })
  })

  describe('State Consistency Testing', () => {
    it('should maintain state consistency when suggestion computation fails', async () => {
      // This verifies that failed suggestion computation doesn't corrupt state
      
      // Arrange: Add some initial state
      sessionStore.selectedPublications.push(createMockPublication({ doi: '10.1234/initial' }))
      sessionStore.excludedPublicationsDois.push('10.1234/excluded')
      sessionStore.setBoostKeywordString('initial keywords')
      
      const initialSelectedCount = sessionStore.selectedPublications.length
      const initialExcludedCount = sessionStore.excludedPublicationsDois.length
      const initialKeywords = sessionStore.boostKeywordString
      
      // Mock suggestion service to fail
      const { SuggestionService } = await import('@/services/SuggestionService.js')
      SuggestionService.computeSuggestions.mockRejectedValueOnce(new Error('Computation failed'))
      
      // Act: Try to update suggestions (should fail)
      try {
        await appState.updateSuggestions()
      } catch (error) {
        // Expected to fail
      }
      
      await waitForAsyncOperations()
      
      // Assert: Original state should be preserved (no partial corruption)
      expect(sessionStore.selectedPublications).toHaveLength(initialSelectedCount)
      expect(sessionStore.excludedPublicationsDois).toHaveLength(initialExcludedCount)
      expect(sessionStore.boostKeywordString).toBe(initialKeywords)
      
      // Suggestions should be empty or unchanged
      expect(sessionStore.suggestedPublications).toHaveLength(0)
    })
  })

  describe('Memory and Performance Bug Hunting', () => {
    it('should handle memory pressure with large publication sets', async () => {
      // This explores potential memory leaks or performance issues with large datasets
      
      const largePublicationCount = 500
      const publications = Array.from({ length: largePublicationCount }, (_, i) => 
        createMockPublication({
          doi: `10.1234/large-dataset-${i}`,
          title: `Publication ${i} with a very long title that might cause memory issues if not handled properly`,
          year: 2000 + (i % 24),
          authors: Array.from({ length: Math.min(10, i % 10 + 1) }, (_, j) => ({
            given: `Author${j}`,
            family: `Lastname${i}-${j}`
          }))
        })
      )
      
      // Record initial memory state (approximate)
      const initialPublicationCount = sessionStore.selectedPublications.length
      
      // Act: Add large number of publications
      sessionStore.selectedPublications.push(...publications)
      
      // Force garbage collection if available (not available in all environments)
      if (global.gc) {
        global.gc()
      }
      
      await waitForAsyncOperations()
      
      // Assert: System should still be responsive
      expect(sessionStore.selectedPublications).toHaveLength(initialPublicationCount + largePublicationCount)
      
      // Test that basic operations still work
      expect(sessionStore.selectedPublicationsDois).toHaveLength(initialPublicationCount + largePublicationCount)
      
      // Test filtering still works
      const yearFilteredCount = sessionStore.selectedPublications.filter(pub => pub.year > 2020).length
      expect(yearFilteredCount).toBeGreaterThan(0)
      
      // Test clearing works
      sessionStore.clear()
      expect(sessionStore.selectedPublications).toHaveLength(0)
    })

    it('should handle rapid publication additions and removals', async () => {
      // This explores potential issues with rapid state changes
      
      const operationCount = 100
      const publications = Array.from({ length: operationCount }, (_, i) => 
        createMockPublication({ doi: `10.1234/rapid-${i}` })
      )
      
      // Act: Rapidly add and remove publications
      for (let i = 0; i < operationCount; i++) {
        sessionStore.selectedPublications.push(publications[i])
        
        if (i % 10 === 0) {
          // Occasionally remove some publications
          sessionStore.selectedPublications.splice(0, Math.min(5, sessionStore.selectedPublications.length))
        }
        
        if (i % 20 === 0) {
          // Occasionally clear excluded list
          sessionStore.excludedPublicationsDois = []
        }
        
        // Add some excluded DOIs
        sessionStore.excludedPublicationsDois.push(`10.1234/excluded-${i}`)
      }
      
      await waitForAsyncOperations()
      
      // Assert: State should be consistent
      expect(Array.isArray(sessionStore.selectedPublications)).toBe(true)
      expect(Array.isArray(sessionStore.excludedPublicationsDois)).toBe(true)
      
      // No duplicates in selected publications
      const dois = sessionStore.selectedPublications.map(p => p.doi)
      const uniqueDois = [...new Set(dois)]
      expect(dois).toHaveLength(uniqueDois.length)
      
      // No duplicates in excluded DOIs
      const uniqueExcluded = [...new Set(sessionStore.excludedPublicationsDois)]
      expect(sessionStore.excludedPublicationsDois).toHaveLength(uniqueExcluded.length)
    })
  })


  describe('DOI Normalization Testing', () => {
    it('should normalize DOI formats consistently', async () => {
      // This verifies DOI normalization behavior
      
      const testDois = [
        '10.1234/normal',           // Normal
        'DOI:10.1234/with-prefix',  // With doi: prefix  
        '10.1234/UPPERCASE',        // Uppercase
        '10.1234/with-special!@#$%^&*()', // Special characters
      ]
      
      const initialCount = sessionStore.selectedPublications.length
      
      // Act: Add DOIs
      await sessionStore.addPublicationsToSelection(testDois)
      await waitForAsyncOperations()
      
      // Assert: System should handle these DOIs and normalize them
      expect(sessionStore.selectedPublications.length).toBeGreaterThan(initialCount)
      
      // Check that all publications have valid DOI format
      sessionStore.selectedPublications.forEach(pub => {
        expect(typeof pub.doi).toBe('string')
        expect(pub.doi.length).toBeGreaterThan(0)
        // Should be normalized to lowercase
        expect(pub.doi).toBe(pub.doi.toLowerCase())
      })
      
      // The system should maintain consistency
      expect(sessionStore.selectedPublications.length).toBe(sessionStore.selectedPublicationsDois.length)
    })
  })
})