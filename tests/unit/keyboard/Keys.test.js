import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { onKey } from '../../../src/Keys.js'
import { useSessionStore } from '../../../src/stores/session.js'
import { useInterfaceStore } from '../../../src/stores/interface.js'
import { useQueueStore } from '../../../src/stores/queue.js'
import Filter from '../../../src/Filter.js'

// Mock useAppState
const mockClearSession = vi.fn()
const mockUpdateQueued = vi.fn()
const mockIsEmpty = { value: false }
vi.mock('../../../src/composables/useAppState.js', () => ({
  useAppState: () => ({
    clearSession: mockClearSession,
    updateQueued: mockUpdateQueued,
    isEmpty: mockIsEmpty
  })
}))

// Simple DOM element mock
const createMockElement = (id, nodeName = 'DIV') => ({
  id,
  nodeName,
  focus: vi.fn(),
  blur: vi.fn(),
  getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 100 }),
  getElementsByClassName: vi.fn(() => []),
  nextElementSibling: null,
  previousElementSibling: null,
  parentNode: null
})

describe('Keys Module - Keyboard Event Handling', () => {
  let pinia
  let sessionStore
  let interfaceStore
  let queueStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    interfaceStore = useInterfaceStore()
    queueStore = useQueueStore()
    
    // Reset stores to empty state
    sessionStore.selectedPublications = []
    sessionStore.excludedPublicationsDois = []
    sessionStore.activePublication = null
    sessionStore.filter = new Filter()
    queueStore.selectedQueue = []
    queueStore.excludedQueue = []
    
    // Add isEmpty computed property
    Object.defineProperty(sessionStore, 'isEmpty', {
      get() {
        return sessionStore.selectedPublications.length === 0 && 
               sessionStore.excludedPublicationsDois.length === 0 &&
               queueStore.selectedQueue.length === 0 &&
               queueStore.excludedQueue.length === 0
      },
      configurable: true
    })
    
    // Mock interface store methods
    interfaceStore.openFilterMenu = vi.fn()
    interfaceStore.closeFilterMenu = vi.fn()
    interfaceStore.activatePublicationComponent = vi.fn()
    
    // Reset all modal states to false
    interfaceStore.confirmDialog.isShown = false
    interfaceStore.infoDialog.isShown = false
    interfaceStore.isSearchModalDialogShown = false
    interfaceStore.isAuthorModalDialogShown = false
    interfaceStore.isExcludedModalDialogShown = false
    interfaceStore.isQueueModalDialogShown = false
    interfaceStore.isAboutModalDialogShown = false
    interfaceStore.isKeyboardControlsModalDialogShown = false
    interfaceStore.isFilterMenuOpen = false
    
    // Mock DOM
    Object.defineProperty(document, 'activeElement', {
      value: { nodeName: 'BODY', className: '' },
      configurable: true,
      writable: true
    })
    document.getElementById = vi.fn((id) => createMockElement(id))
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('Basic Key Handling', () => {
    const createKeyEvent = (key, options = {}) => ({
      key,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
      repeat: false,
      ...options
    })

    it('should ignore events with modifier keys', () => {
      const ctrlEvent = createKeyEvent('f', { ctrlKey: true })
      const shiftEvent = createKeyEvent('f', { shiftKey: true })
      const metaEvent = createKeyEvent('f', { metaKey: true })
      
      onKey(ctrlEvent)
      onKey(shiftEvent)
      onKey(metaEvent)
      
      expect(interfaceStore.openFilterMenu).not.toHaveBeenCalled()
      expect(ctrlEvent.preventDefault).not.toHaveBeenCalled()
      expect(shiftEvent.preventDefault).not.toHaveBeenCalled()
      expect(metaEvent.preventDefault).not.toHaveBeenCalled()
    })

    it('should ignore repeated events (except arrow keys)', () => {
      const repeatEvent = createKeyEvent('f', { repeat: true })
      onKey(repeatEvent)
      
      expect(interfaceStore.openFilterMenu).not.toHaveBeenCalled()
      expect(repeatEvent.preventDefault).not.toHaveBeenCalled()
    })

    it('should not process keys when input is focused', () => {
      Object.defineProperty(document, 'activeElement', {
        value: { nodeName: 'INPUT', type: 'text', className: '' },
        configurable: true
      })
      const event = createKeyEvent('f')
      
      onKey(event)
      
      expect(interfaceStore.openFilterMenu).not.toHaveBeenCalled()
      expect(event.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('Filter Menu (f key)', () => {
    it('should open filter menu when pressing f with publications', () => {
      // Add a publication so session is not empty
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
      
      const event = { key: 'f', preventDefault: vi.fn() }
      onKey(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(interfaceStore.openFilterMenu).toHaveBeenCalled()
    })

    it('should not open filter menu when session is empty', () => {
      // Ensure session is empty
      sessionStore.selectedPublications = []
      sessionStore.excludedPublicationsDois = []
      queueStore.selectedQueue = []
      queueStore.excludedQueue = []
      mockIsEmpty.value = true
      
      const event = { key: 'f', preventDefault: vi.fn() }
      onKey(event)
      
      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(interfaceStore.openFilterMenu).not.toHaveBeenCalled()
      
      // Reset for other tests
      mockIsEmpty.value = false
    })

    it('should not open filter menu when overlay is shown', () => {
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
      interfaceStore.confirmDialog.isShown = true // This makes isAnyOverlayShown true
      
      const event = { key: 'f', preventDefault: vi.fn() }
      onKey(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(interfaceStore.openFilterMenu).not.toHaveBeenCalled()
    })
  })

  describe('DOI Filtering (i key)', () => {
    it('should add DOI filter for selected publication', () => {
      sessionStore.selectedPublications = [{ doi: '10.1234/selected' }]
      sessionStore.activePublication = { doi: '10.1234/selected' }
      
      const event = { key: 'i', preventDefault: vi.fn() }
      onKey(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(sessionStore.filter.dois).toContain('10.1234/selected')
    })

    it('should not add DOI filter for suggested publication', () => {
      sessionStore.selectedPublications = [{ doi: '10.1234/different' }]
      sessionStore.activePublication = { doi: '10.1234/suggested' }
      
      const event = { key: 'i', preventDefault: vi.fn() }
      onKey(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(sessionStore.filter.dois).not.toContain('10.1234/suggested')
    })

    it('should do nothing when no active publication', () => {
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
      sessionStore.activePublication = null
      
      const event = { key: 'i', preventDefault: vi.fn() }
      onKey(event)
      
      expect(event.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('Navigation (Arrow keys)', () => {
    it('should navigate left to selected publications', () => {
      // Add publications so session is not empty
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
      
      const event = { key: 'ArrowLeft', preventDefault: vi.fn() }
      onKey(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(document.getElementById).toHaveBeenCalledWith('selected')
      expect(interfaceStore.closeFilterMenu).toHaveBeenCalled()
    })

    it('should navigate right to suggested publications', () => {
      // Add publications so session is not empty
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
      
      const event = { key: 'ArrowRight', preventDefault: vi.fn() }
      onKey(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(document.getElementById).toHaveBeenCalledWith('suggested')
      expect(interfaceStore.closeFilterMenu).toHaveBeenCalled()
    })
  })

  describe('Input Field Handling', () => {
    it('should blur input when Escape is pressed', () => {
      const mockInput = { nodeName: 'INPUT', type: 'text', className: '', blur: vi.fn() }
      Object.defineProperty(document, 'activeElement', {
        value: mockInput,
        configurable: true
      })
      
      const event = { key: 'Escape', preventDefault: vi.fn() }
      onKey(event)
      
      expect(mockInput.blur).toHaveBeenCalled()
    })
  })
})