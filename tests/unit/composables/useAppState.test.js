import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppState } from '@/composables/useAppState.js'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useAuthorStore } from '@/stores/author.js'
import { useQueueStore } from '@/stores/queue.js'

// Mock all the dependencies
vi.mock('@/lib/Cache.js', () => ({
  clearCache: vi.fn()
}))

vi.mock('@/services/SuggestionService.js', () => ({
  SuggestionService: {
    computeSuggestions: vi.fn().mockResolvedValue({
      publications: []
    })
  }
}))

describe('useAppState - Session Loading', () => {
  let sessionStore, interfaceStore, authorStore, queueStore, appState

  beforeEach(() => {
    setActivePinia(createPinia())
    
    sessionStore = useSessionStore()
    interfaceStore = useInterfaceStore()
    authorStore = useAuthorStore()
    queueStore = useQueueStore()
    
    appState = useAppState()
    
    // Mock interface store methods
    interfaceStore.showErrorMessage = vi.fn()
    interfaceStore.startLoading = vi.fn()
    interfaceStore.endLoading = vi.fn()
    
    // Mock author store methods
    authorStore.computeSelectedPublicationsAuthors = vi.fn()
    
    // Mock sessionStore methods that have side effects
    sessionStore.addPublicationsToSelection = vi.fn()
  })

  describe('loadSession', () => {
    it('should restore session name when loading session with name property', () => {
      // Arrange: Start with empty session name
      sessionStore.sessionName = ''
      
      const sessionData = {
        name: 'My Research Project',
        selected: ['10.1234/pub1'],
        excluded: ['10.1234/pub2'],
        boost: 'machine learning'
      }
      
      // Act: Load the session
      appState.loadSession(sessionData)
      
      // Assert: Session name should be restored
      expect(sessionStore.sessionName).toBe('My Research Project')
    })

    it('should handle loading session without name property gracefully', () => {
      // Arrange: Set initial session name
      sessionStore.sessionName = 'Current Session'
      
      const sessionData = {
        selected: ['10.1234/pub1'],
        excluded: ['10.1234/pub2'],
        boost: 'machine learning'
      }
      
      // Act: Load session without name property
      appState.loadSession(sessionData)
      
      // Assert: Should not change current session name
      expect(sessionStore.sessionName).toBe('Current Session')
    })

    it('should set empty session name when name property is empty string', () => {
      // Arrange: Set initial session name
      sessionStore.sessionName = 'Current Session'
      
      const sessionData = {
        name: '',
        selected: ['10.1234/pub1'],
        excluded: [],
        boost: ''
      }
      
      // Act: Load session with empty name
      appState.loadSession(sessionData)
      
      // Assert: Should set session name to empty string
      expect(sessionStore.sessionName).toBe('')
    })

    it('should handle null session name gracefully', () => {
      // Arrange: Set initial session name
      sessionStore.sessionName = 'Current Session'
      
      const sessionData = {
        name: null,
        selected: ['10.1234/pub1'],
        excluded: [],
        boost: ''
      }
      
      // Act: Load session with null name
      appState.loadSession(sessionData)
      
      // Assert: Should not change current session name when null
      expect(sessionStore.sessionName).toBe('Current Session')
    })
  })

  describe('importSessionWithConfirmation', () => {
    it('should be exposed by useAppState', () => {
      expect(appState.importSessionWithConfirmation).toBeDefined()
      expect(typeof appState.importSessionWithConfirmation).toBe('function')
    })

    it('should show confirmation dialog with file input', () => {
      // Mock the showConfirmDialog method
      interfaceStore.showConfirmDialog = vi.fn()
      
      appState.importSessionWithConfirmation()
      
      expect(interfaceStore.showConfirmDialog).toHaveBeenCalled()
      const [message, callback, title] = interfaceStore.showConfirmDialog.mock.calls[0]
      
      expect(message).toContain('Choose an exported session JSON file')
      expect(message).toContain('input type="file"')
      expect(title).toBe('Import session')
    })

    it('should show warning message when session is not empty', () => {
      // Manually add publications to make the session non-empty
      // (We can't use the mocked method as it doesn't actually update state)
      sessionStore.selectedPublications = [
        { doi: '10.1234/test1' },
        { doi: '10.1234/test2' }
      ]
      
      interfaceStore.showConfirmDialog = vi.fn()
      
      appState.importSessionWithConfirmation()
      
      expect(interfaceStore.showConfirmDialog).toHaveBeenCalled()
      const [message] = interfaceStore.showConfirmDialog.mock.calls[0]
      
      expect(message).toContain('This will clear and replace the current session')
      expect(message).toContain('Choose an exported session JSON file')
      
      // Clean up
      sessionStore.clear()
    })

    it('should not show warning message when session is empty', () => {
      // Ensure session is empty
      sessionStore.clear()
      queueStore.clear()

      interfaceStore.showConfirmDialog = vi.fn()
      
      appState.importSessionWithConfirmation()
      
      expect(interfaceStore.showConfirmDialog).toHaveBeenCalled()
      const [message] = interfaceStore.showConfirmDialog.mock.calls[0]
      
      expect(message).not.toContain('This will clear and replace the current session')
      expect(message).toContain('Choose an exported session JSON file')
    })
  })
})