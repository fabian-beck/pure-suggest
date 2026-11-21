import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import Filter from '../../../src/core/Filter.js'
import { onKey } from '../../../src/lib/Keys.js'
import { useInterfaceStore } from '../../../src/stores/interface.js'
import { useModalStore } from '../../../src/stores/modal.js'
import { useQueueStore } from '../../../src/stores/queue.js'
import { useSessionStore } from '../../../src/stores/session.js'

// Mock useAppState
const mockClearSession = vi.fn()
const mockUpdateQueued = vi.fn()
const mockQueueForSelected = vi.fn()
const mockQueueForExcluded = vi.fn()
const mockIsEmpty = { value: false }
vi.mock('../../../src/composables/useAppState.js', () => ({
  useAppState: () => ({
    clearSession: mockClearSession,
    updateQueued: mockUpdateQueued,
    queueForSelected: mockQueueForSelected,
    queueForExcluded: mockQueueForExcluded,
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

const mockActiveElement = (properties = {}) => {
  Object.defineProperty(document, 'activeElement', {
    value: { nodeName: 'BODY', className: '', blur: vi.fn(), closest: () => null, ...properties },
    configurable: true
  })
}

describe('Keys Module - Keyboard Event Handling', () => {
  let pinia
  let sessionStore
  let interfaceStore
  let modalStore
  let queueStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    interfaceStore = useInterfaceStore()
    modalStore = useModalStore()
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
        return (
          sessionStore.selectedPublications.length === 0 &&
          sessionStore.excludedPublicationsDois.length === 0 &&
          queueStore.selectedQueue.length === 0 &&
          queueStore.excludedQueue.length === 0
        )
      },
      configurable: true
    })

    // Mock interface store methods
    interfaceStore.openFilterMenu = vi.fn()
    interfaceStore.closeFilterMenu = vi.fn()
    interfaceStore.activatePublicationComponent = vi.fn()

    // Reset all modal states to false
    modalStore.confirmDialog.isShown = false
    modalStore.infoDialog.isShown = false
    modalStore.isSearchModalDialogShown = false
    modalStore.isAuthorModalDialogShown = false
    modalStore.isExcludedModalDialogShown = false
    modalStore.isQueueModalDialogShown = false
    modalStore.isAboutModalDialogShown = false
    modalStore.isKeyboardControlsModalDialogShown = false
    interfaceStore.isFilterMenuOpen = false

    // Mock DOM
    mockActiveElement()
    document.getElementById = vi.fn((id) => createMockElement(id))

    // Clear all mocks
    vi.clearAllMocks()
    mockClearSession.mockClear()
    mockUpdateQueued.mockClear()
    mockQueueForSelected.mockClear()
    mockQueueForExcluded.mockClear()
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
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
      const ctrlEvent = createKeyEvent('f', { ctrlKey: true })
      const shiftEvent = createKeyEvent('F', { shiftKey: true })
      const shiftArrowEvent = createKeyEvent('ArrowLeft', { shiftKey: true })
      const metaEvent = createKeyEvent('f', { metaKey: true })
      const altArrowEvent = createKeyEvent('ArrowLeft', { altKey: true })
      const events = [ctrlEvent, shiftEvent, shiftArrowEvent, metaEvent, altArrowEvent]

      events.forEach((event) => onKey(event))

      expect(interfaceStore.openFilterMenu).not.toHaveBeenCalled()
      expect(interfaceStore.activatePublicationComponent).not.toHaveBeenCalled()
      events.forEach((event) => expect(event.preventDefault).not.toHaveBeenCalled())
    })

    it('should update with u only if publications are queued', () => {
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]

      onKey(createKeyEvent('u'))
      expect(mockUpdateQueued).not.toHaveBeenCalled()

      queueStore.selectedQueue = ['10.1234/queued']
      onKey(createKeyEvent('u'))
      expect(mockUpdateQueued).toHaveBeenCalled()
    })

    it('should ignore keys already handled elsewhere, e.g., by a dialog that just closed', () => {
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]

      onKey(createKeyEvent('a', { defaultPrevented: true }))

      expect(modalStore.isAuthorModalDialogShown).toBe(false)
    })

    it('should accept characters typed with Shift (e.g., + on US keyboards)', () => {
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
      sessionStore.activePublication = { doi: '10.1234/active' }

      onKey(createKeyEvent('+', { shiftKey: true }))

      expect(mockQueueForSelected).toHaveBeenCalledWith('10.1234/active')
    })

    it.each([
      ['q', 'isQueueModalDialogShown'],
      ['e', 'isExcludedModalDialogShown'],
      ['?', 'isKeyboardControlsModalDialogShown']
    ])('should open a dialog with %s', (key, dialogFlag) => {
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]

      onKey(createKeyEvent(key, { shiftKey: key === '?' }))

      expect(modalStore[dialogFlag]).toBe(true)
    })

    it('should ignore repeated events (except arrow keys)', () => {
      const repeatEvent = createKeyEvent('f', { repeat: true })
      onKey(repeatEvent)

      expect(interfaceStore.openFilterMenu).not.toHaveBeenCalled()
      expect(repeatEvent.preventDefault).not.toHaveBeenCalled()
    })

    it('should not process keys when input is focused', () => {
      mockActiveElement({ nodeName: 'INPUT', type: 'text' })
      const event = createKeyEvent('f')

      onKey(event)

      expect(interfaceStore.openFilterMenu).not.toHaveBeenCalled()
      expect(event.preventDefault).not.toHaveBeenCalled()
    })
  })

  it('should process keys when a network node (SVG element) is focused', () => {
    sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
    mockActiveElement({ nodeName: 'g', className: { baseVal: 'node-container keyword' } })
    interfaceStore.isNetworkClusters = true

    onKey(new KeyboardEvent('keydown', { key: 'm' }))

    expect(interfaceStore.isNetworkClusters).toBe(false)
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
      modalStore.confirmDialog.isShown = true // This makes isAnyOverlayShown true

      const event = { key: 'f', preventDefault: vi.fn() }
      onKey(event)

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
    it.each([
      ['ArrowLeft', 'selected'],
      ['ArrowRight', 'suggested']
    ])('should navigate %s to %s publications', (key, targetId) => {
      // Add publications so session is not empty
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]

      const event = { key, preventDefault: vi.fn() }
      onKey(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(document.getElementById).toHaveBeenCalledWith(targetId)
      expect(interfaceStore.closeFilterMenu).toHaveBeenCalled()
    })
  })

  describe('Dialogs and Menus', () => {
    it.each(['Tab', 'Enter', ' ', 'ArrowDown', 'PageDown'])(
      'should leave native %s handling to an open dialog',
      (key) => {
        sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
        sessionStore.activePublication = { doi: '10.1234/active' }
        modalStore.confirmDialog.isShown = true

        const event = { key, preventDefault: vi.fn() }
        onKey(event)

        expect(event.preventDefault).not.toHaveBeenCalled()
        expect(interfaceStore.activatePublicationComponent).not.toHaveBeenCalled()
      }
    )

    const focusInsideMenu = (menuHtml) => {
      const overlay = document.createElement('div')
      overlay.className = 'v-overlay'
      overlay.innerHTML = menuHtml
      mockActiveElement({ closest: (selector) => overlay.firstElementChild.closest(selector) })
    }

    it.each(['ArrowDown', 'c'])('should ignore %s while focus is inside a list menu', (key) => {
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
      sessionStore.activePublication = { doi: '10.1234/active' }
      focusInsideMenu('<div class="v-list"></div>')

      const event = { key, preventDefault: vi.fn() }
      onKey(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(mockClearSession).not.toHaveBeenCalled()
      expect(interfaceStore.activatePublicationComponent).not.toHaveBeenCalled()
    })

    it('should keep shortcuts while focus is inside the filter menu', () => {
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
      focusInsideMenu('<div class="v-sheet"></div>')

      const event = { key: 'f', preventDefault: vi.fn() }
      onKey(event)

      expect(interfaceStore.openFilterMenu).toHaveBeenCalled()
    })
  })

  describe('Input Field Handling', () => {
    it('should blur input when Escape is pressed', () => {
      mockActiveElement({ nodeName: 'INPUT', type: 'text' })
      const mockInput = document.activeElement

      const event = { key: 'Escape', preventDefault: vi.fn() }
      onKey(event)

      expect(mockInput.blur).toHaveBeenCalled()
    })
  })

  describe('Escaping data loading', () => {
    it('should cancel loading when Escape is pressed while loading and cancelable', () => {
      interfaceStore.isLoading = true
      interfaceStore.isLoadingCancelable = true
      interfaceStore.cancelLoading = vi.fn()

      const event = { key: 'Escape', preventDefault: vi.fn() }
      onKey(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(interfaceStore.cancelLoading).toHaveBeenCalled()
    })

    it('should not cancel loading when Escape is pressed while loading but not cancelable', () => {
      interfaceStore.isLoading = true
      interfaceStore.isLoadingCancelable = false
      interfaceStore.cancelLoading = vi.fn()
      mockActiveElement()

      const event = { key: 'Escape', preventDefault: vi.fn() }
      onKey(event)

      expect(interfaceStore.cancelLoading).not.toHaveBeenCalled()
    })

    it('should not cancel loading when Escape is pressed while not loading', () => {
      interfaceStore.isLoading = false
      interfaceStore.cancelLoading = vi.fn()
      mockActiveElement()

      const event = { key: 'Escape', preventDefault: vi.fn() }
      onKey(event)

      expect(interfaceStore.cancelLoading).not.toHaveBeenCalled()
    })
  })

  describe('Publication Queuing (+ and - keys)', () => {
    it('should queue publication for selection when pressing + with active publication', () => {
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
      sessionStore.activePublication = { doi: '10.1234/active' }

      const event = { key: '+', preventDefault: vi.fn() }
      onKey(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockQueueForSelected).toHaveBeenCalledWith('10.1234/active')
    })

    it('should queue publication for exclusion when pressing - with active publication', () => {
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
      sessionStore.activePublication = { doi: '10.1234/active' }

      const event = { key: '-', preventDefault: vi.fn() }
      onKey(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockQueueForExcluded).toHaveBeenCalledWith('10.1234/active')
    })

    it('should do nothing when pressing + without active publication', () => {
      sessionStore.selectedPublications = [{ doi: '10.1234/test' }]
      sessionStore.activePublication = null

      const event = { key: '+', preventDefault: vi.fn() }
      onKey(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(mockQueueForSelected).not.toHaveBeenCalled()
    })
  })
})
