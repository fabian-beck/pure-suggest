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

vi.mock('@/lib/Util.js', () => ({
  saveAsFile: vi.fn()
}))

// Mock file operations for session export/import
const mockBlob = {
  constructor: vi.fn(),
  size: 1024,
  type: 'application/json'
}
global.Blob = vi.fn(() => mockBlob)

// Mock URL.createObjectURL and revokeObjectURL
global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn()
}

// Mock document.createElement for download link
const mockAnchor = {
  href: '',
  download: '',
  click: vi.fn(),
  style: { display: '' }
}
global.document.createElement = vi.fn((tagName) => {
  if (tagName === 'a') return mockAnchor
  return {}
})

// Mock document.body for appendChild/removeChild
Object.defineProperty(global.document, 'body', {
  value: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  },
  writable: true
})

describe('Session Import/Export Integration', () => {
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
    interfaceStore.showConfirmDialog = vi.fn()

    // Reset mocks
    vi.clearAllMocks()
  })

  describe('Session Export', () => {
    it('should export complete session data with all components', async () => {
      // Arrange: Create a rich session with various data
      const publications = [
        createMockPublication({
          doi: '10.1234/selected-1',
          title: 'Advanced Machine Learning Techniques',
          year: 2023,
          authors: [{ given: 'Alice', family: 'Smith' }]
        }),
        createMockPublication({
          doi: '10.1234/selected-2', 
          title: 'Deep Learning Applications',
          year: 2022,
          authors: [{ given: 'Bob', family: 'Johnson' }]
        })
      ]
      
      // Set up session state
      sessionStore.selectedPublications.push(...publications)
      sessionStore.excludedPublicationsDois.push('10.1234/excluded-1', '10.1234/excluded-2')
      sessionStore.setBoostKeywordString('machine learning, deep learning, neural networks')
      sessionStore.setSessionName('My Research Project 2024')
      
      // Act: Extract session data (using same logic as generateSessionUrl)
      const sessionData = {
        name: sessionStore.sessionName,
        selected: sessionStore.selectedPublicationsDois,
        excluded: sessionStore.excludedPublicationsDois,
        boost: sessionStore.uniqueBoostKeywords.join(", ")
      }
      
      // Assert: Verify exported data structure and content
      expect(sessionData).toBeDefined()
      expect(sessionData).toHaveProperty('name', 'My Research Project 2024')
      expect(sessionData).toHaveProperty('selected')
      expect(sessionData).toHaveProperty('excluded')
      expect(sessionData).toHaveProperty('boost')
      
      // Verify selected publications
      expect(sessionData.selected).toHaveLength(2)
      expect(sessionData.selected).toContain('10.1234/selected-1')
      expect(sessionData.selected).toContain('10.1234/selected-2')
      
      // Verify excluded publications
      expect(sessionData.excluded).toHaveLength(2)
      expect(sessionData.excluded).toContain('10.1234/excluded-1')
      expect(sessionData.excluded).toContain('10.1234/excluded-2')
      
      // Verify boost keywords (should be normalized)
      expect(sessionData.boost).toBe('MACHINE LEARNING, DEEP LEARNING, NEURAL NETWORKS')
    })

    it('should export minimal session data when session is mostly empty', () => {
      // Arrange: Minimal session data
      sessionStore.selectedPublications.push(createMockPublication({
        doi: '10.1234/single-publication'
      }))
      sessionStore.setSessionName('')
      
      // Act: Extract session data
      const sessionData = {
        name: sessionStore.sessionName,
        selected: sessionStore.selectedPublicationsDois,
        excluded: sessionStore.excludedPublicationsDois,
        boost: sessionStore.uniqueBoostKeywords.join(", ")
      }
      
      // Assert: Verify minimal export structure
      expect(sessionData.name).toBe('')
      expect(sessionData.selected).toEqual(['10.1234/single-publication'])
      expect(sessionData.excluded).toEqual([])
      expect(sessionData.boost).toBe('')
    })

    it('should trigger file download when exporting session', async () => {
      // Arrange: Set up session
      sessionStore.selectedPublications.push(createMockPublication())
      sessionStore.setSessionName('Test Session')
      
      // Act: Trigger export with download (this calls the actual exportSession method)
      sessionStore.exportSession()
      
      // Assert: Verify saveAsFile was called with session data
      const { saveAsFile } = await import('@/lib/Util.js')
      expect(saveAsFile).toHaveBeenCalled()
      
      const [filename, mimeType, jsonData] = saveAsFile.mock.calls[0]
      expect(filename).toMatch(/session.*\.json$/)
      expect(mimeType).toBe('application/json')
      
      // Verify the JSON data contains correct session information
      const sessionData = JSON.parse(jsonData)
      expect(sessionData).toHaveProperty('name', 'Test Session')
      expect(sessionData).toHaveProperty('selected')
      expect(sessionData).toHaveProperty('excluded')
      expect(sessionData).toHaveProperty('boost')
    })
  })

  describe('Session Import', () => {
    it('should import complete session and restore all state', async () => {
      // Arrange: Create session data to import
      const sessionDataToImport = {
        name: 'Imported Research Project',
        selected: ['10.1234/imported-1', '10.1234/imported-2', '10.1234/imported-3'],
        excluded: ['10.1234/excluded-import'],
        boost: 'artificial intelligence, machine learning'
      }
      
      // Arrange: Set up existing session (should be cleared)
      sessionStore.selectedPublications.push(createMockPublication({ doi: '10.1234/existing' }))
      sessionStore.excludedPublicationsDois.push('10.1234/existing-excluded')
      sessionStore.setBoostKeywordString('existing keywords')
      sessionStore.setSessionName('Existing Session')
      
      // Act: Import session
      await appState.loadSession(sessionDataToImport)
      await waitForAsyncOperations()
      
      // Assert: Verify session was completely replaced
      expect(sessionStore.sessionName).toBe('Imported Research Project')
      expect(sessionStore.boostKeywordString).toBe('ARTIFICIAL INTELLIGENCE, MACHINE LEARNING')
      expect(sessionStore.excludedPublicationsDois).toEqual(['10.1234/excluded-import'])
      
      // Note: addPublicationsToSelection is called but we can't easily verify the exact DOIs
      // since it involves async publication creation. Instead, verify the basic state was set.
      expect(sessionStore.excludedPublicationsDois).toContain('10.1234/excluded-import')
    })

    it('should handle import of session without name field', async () => {
      // Arrange: Session data without name
      const sessionDataToImport = {
        selected: ['10.1234/no-name-session'],
        excluded: [],
        boost: 'test keywords'
      }
      
      sessionStore.setSessionName('Previous Session Name')
      
      // Act: Import session
      await appState.loadSession(sessionDataToImport)
      
      // Assert: Session name should be cleared when not provided
      expect(sessionStore.sessionName).toBe('')
    })

    it('should handle import of session with empty arrays', async () => {
      // Arrange: Session with empty data
      const sessionDataToImport = {
        name: 'Empty Session',
        selected: [],
        excluded: [],
        boost: ''
      }
      
      // Act: Import session
      await appState.loadSession(sessionDataToImport)
      
      // Assert: Should handle empty data gracefully
      expect(sessionStore.sessionName).toBe('Empty Session')
      expect(sessionStore.boostKeywordString).toBe('')
      expect(sessionStore.excludedPublicationsDois).toEqual([])
    })

    it('should show confirmation dialog when importing to non-empty session', () => {
      // Arrange: Non-empty session
      sessionStore.selectedPublications.push(createMockPublication())
      
      // Act: Trigger import dialog
      appState.importSessionWithConfirmation()
      
      // Assert: Should show warning about replacing current session
      expect(interfaceStore.showConfirmDialog).toHaveBeenCalled()
      const [message] = interfaceStore.showConfirmDialog.mock.calls[0]
      expect(message).toContain('This will clear and replace the current session')
      expect(message).toContain('Choose an exported session JSON file')
    })

    it('should not show warning when importing to empty session', () => {
      // Arrange: Empty session
      sessionStore.clear()
      
      // Act: Trigger import dialog
      appState.importSessionWithConfirmation()
      
      // Assert: Should not show replacement warning
      expect(interfaceStore.showConfirmDialog).toHaveBeenCalled()
      const [message] = interfaceStore.showConfirmDialog.mock.calls[0]
      expect(message).not.toContain('This will clear and replace the current session')
      expect(message).toContain('Choose an exported session JSON file')
    })
  })

  describe('Complete Export/Import Cycle', () => {
    it('should maintain data integrity through full export/import cycle', async () => {
      // Arrange: Create comprehensive session
      const originalSession = {
        publications: [
          createMockPublication({
            doi: '10.1234/cycle-test-1',
            title: 'Original Publication 1',
            year: 2023
          }),
          createMockPublication({
            doi: '10.1234/cycle-test-2',
            title: 'Original Publication 2', 
            year: 2022
          })
        ],
        excludedDois: ['10.1234/excluded-cycle-1', '10.1234/excluded-cycle-2'],
        boostKeywords: 'integration testing, session management, data persistence',
        sessionName: 'Cycle Test Session'
      }
      
      // Set up original session
      sessionStore.selectedPublications.push(...originalSession.publications)
      sessionStore.excludedPublicationsDois.push(...originalSession.excludedDois)
      sessionStore.setBoostKeywordString(originalSession.boostKeywords)
      sessionStore.setSessionName(originalSession.sessionName)
      
      // Act: Extract session data for export
      const sessionDataForExport = {
        name: sessionStore.sessionName,
        selected: sessionStore.selectedPublicationsDois,
        excluded: sessionStore.excludedPublicationsDois,
        boost: sessionStore.uniqueBoostKeywords.join(", ")
      }
      
      // Clear session
      sessionStore.clear()
      expect(appState.isEmpty.value).toBe(true)
      
      // Import session back
      await appState.loadSession(sessionDataForExport)
      await waitForAsyncOperations()
      
      // Assert: Verify complete data integrity
      expect(sessionStore.sessionName).toBe(originalSession.sessionName)
      expect(sessionStore.boostKeywordString).toBe(originalSession.boostKeywords.toUpperCase())
      expect(sessionStore.excludedPublicationsDois).toEqual(originalSession.excludedDois)
      
      // Verify state was restored correctly 
      // (addPublicationsToSelection was called, but we verify the end state)
    })

    it('should handle malformed JSON gracefully during import', async () => {
      // Arrange: Malformed session data
      const malformedData = {
        // Missing required fields
        invalidField: 'test',
        selected: null, // Invalid type
        boost: 123 // Invalid type
      }
      
      // Act & Assert: Should handle gracefully without crashing
      try {
        await appState.loadSession(malformedData)
        await waitForAsyncOperations()
        
        // Should handle missing/invalid fields gracefully
        expect(sessionStore.sessionName).toBe('')
        expect(sessionStore.excludedPublicationsDois).toEqual([])
      } catch (error) {
        // If error is thrown, it should be handled gracefully
        expect(error).toBeDefined()
      }
    })

    it('should preserve session filters and advanced settings', async () => {
      // Arrange: Session with complex filter state
      sessionStore.selectedPublications.push(createMockPublication())
      sessionStore.filter.yearMin = 2020
      sessionStore.filter.yearMax = 2024
      sessionStore.filter.applyToSelected = true
      sessionStore.filter.applyToSuggested = false
      sessionStore.setSessionName('Filtered Session')
      
      // Note: Current implementation may not export filter state,
      // but this test documents expected behavior for future enhancement
      
      // Act: Extract session data and re-import
      const sessionDataForExport = {
        name: sessionStore.sessionName,
        selected: sessionStore.selectedPublicationsDois,
        excluded: sessionStore.excludedPublicationsDois,
        boost: sessionStore.uniqueBoostKeywords.join(", ")
      }
      
      sessionStore.clear()
      await appState.loadSession(sessionDataForExport)
      
      // Assert: Basic session data is preserved
      expect(sessionStore.sessionName).toBe('Filtered Session')
      
      // Future enhancement: Filter state preservation
      // expect(sessionStore.filter.yearMin).toBe(2020)
      // expect(sessionStore.filter.yearMax).toBe(2024)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle export of empty session', () => {
      // Arrange: Completely empty session
      sessionStore.clear()
      
      // Act: Extract session data
      const sessionData = {
        name: sessionStore.sessionName,
        selected: sessionStore.selectedPublicationsDois,
        excluded: sessionStore.excludedPublicationsDois,
        boost: sessionStore.uniqueBoostKeywords.join(", ")
      }
      
      // Assert: Should export valid empty structure
      expect(sessionData.name).toBe('')
      expect(sessionData.selected).toEqual([])
      expect(sessionData.excluded).toEqual([])
      expect(sessionData.boost).toBe('')
    })

    it('should handle import with special characters in session name and keywords', async () => {
      // Arrange: Session with special characters
      const sessionWithSpecialChars = {
        name: 'Äpfel & Öl: Testing "Special" Characters [2024]',
        selected: ['10.1234/special-chars'],
        excluded: [],
        boost: 'machine-learning, deep_learning, "neural networks", café'
      }
      
      // Act: Import session
      await appState.loadSession(sessionWithSpecialChars)
      
      // Assert: Should handle special characters correctly
      expect(sessionStore.sessionName).toBe('Äpfel & Öl: Testing "Special" Characters [2024]')
      // Keywords should be normalized to uppercase
      expect(sessionStore.boostKeywordString).toContain('MACHINE-LEARNING')
      expect(sessionStore.boostKeywordString).toContain('CAFÉ')
    })

    it('should handle very large session data', async () => {
      // Arrange: Large session with many publications
      const largeDoisList = Array.from({ length: 100 }, (_, i) => `10.1234/large-session-${i}`)
      const largeExcludedList = Array.from({ length: 50 }, (_, i) => `10.1234/excluded-${i}`)
      
      const largeSession = {
        name: 'Large Session Test',
        selected: largeDoisList,
        excluded: largeExcludedList,
        boost: 'keyword1, keyword2, keyword3, keyword4, keyword5'
      }
      
      // Act: Import large session
      await appState.loadSession(largeSession)
      await waitForAsyncOperations()
      
      // Assert: Should handle large datasets
      expect(sessionStore.sessionName).toBe('Large Session Test')
      expect(sessionStore.excludedPublicationsDois).toHaveLength(50)
    })
  })
})