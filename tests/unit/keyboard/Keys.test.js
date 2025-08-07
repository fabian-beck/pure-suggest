import { describe, it, expect, beforeEach, vi } from 'vitest'
import { onKey } from '../../../src/Keys.js'
import { 
  createMockSessionStore, 
  createMockInterfaceStore, 
  createKeyboardEvent,
  setupDOMElementMocks
} from '../utils/testMocks.js'

// Create mock stores
const mockSessionStore = createMockSessionStore()
const mockInterfaceStore = createMockInterfaceStore()

// Mock the store imports
vi.mock('../../../src/stores/session.js', () => ({
  useSessionStore: () => mockSessionStore
}))

vi.mock('../../../src/stores/interface.js', () => ({
  useInterfaceStore: () => mockInterfaceStore
}))

describe('Keys Module - Keyboard Event Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock store state
    mockSessionStore.activePublication = null
    mockSessionStore.isEmpty = false
    mockSessionStore.filter.isActive = true
    mockInterfaceStore.isAnyOverlayShown = false
    
    // Setup DOM mocks
    setupDOMElementMocks()
  })

  describe('Filter Menu Shortcuts ("f" key)', () => {
    it('should open filter menu when pressing "f"', () => {
      const event = createKeyboardEvent('f')
      
      onKey(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockInterfaceStore.openFilterMenu).toHaveBeenCalled()
    })

    it('should toggle filter menu when pressing "f" while menu is open', () => {
      mockInterfaceStore.isFilterMenuOpen = true
      const event = createKeyboardEvent('f')
      
      onKey(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockInterfaceStore.openFilterMenu).toHaveBeenCalled()
      // Note: openMenu method handles toggling internally when already open
    })

    it('should not open filter menu when session is empty', () => {
      mockSessionStore.isEmpty = true
      const event = createKeyboardEvent('f')
      
      onKey(event)
      
      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(mockInterfaceStore.openFilterMenu).not.toHaveBeenCalled()
    })

    it('should not open filter menu when overlay is shown', () => {
      mockInterfaceStore.isAnyOverlayShown = true
      const event = createKeyboardEvent('f')
      
      onKey(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockInterfaceStore.openFilterMenu).not.toHaveBeenCalled()
    })

    it('should not open filter menu when input is focused', () => {
      Object.defineProperty(document, 'activeElement', {
        value: { nodeName: 'INPUT', type: 'text' },
        configurable: true
      })
      const event = createKeyboardEvent('f')
      
      onKey(event)
      
      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(mockInterfaceStore.openFilterMenu).not.toHaveBeenCalled()
    })
  })

  describe('DOI Filtering ("i" key)', () => {
    describe('Selected Publications', () => {
      it('should add DOI filter when pressing "i" on selected publication', () => {
        mockSessionStore.activePublication = { doi: 'selected-publication-doi' }
        mockSessionStore.isSelected.mockReturnValue(true)
        const event = createKeyboardEvent('i')
        
        onKey(event)
        
        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockSessionStore.filter.toggleDoi).toHaveBeenCalledWith('selected-publication-doi')
        expect(mockSessionStore.filter.isActive).toBe(true)
        expect(mockInterfaceStore.openFilterMenu).not.toHaveBeenCalled()
      })

      it('should work consistently regardless of filter menu state', () => {
        mockSessionStore.activePublication = { doi: 'selected-publication-doi' }
        mockSessionStore.isSelected.mockReturnValue(true)
        mockInterfaceStore.isFilterMenuOpen = true
        const event = createKeyboardEvent('i')
        
        onKey(event)
        
        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockSessionStore.filter.toggleDoi).toHaveBeenCalledWith('selected-publication-doi')
        expect(mockSessionStore.filter.isActive).toBe(true)
        expect(mockInterfaceStore.openFilterMenu).not.toHaveBeenCalled()
      })
    })

    describe('Suggested Publications', () => {
      it('should NOT add DOI filter when pressing "i" on suggested publication', () => {
        mockSessionStore.activePublication = { doi: 'suggested-publication-doi' }
        mockSessionStore.isSelected.mockReturnValue(false)
        const event = createKeyboardEvent('i')
        
        onKey(event)
        
        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockSessionStore.filter.addDoi).not.toHaveBeenCalled()
        expect(mockSessionStore.filter.toggleDoi).not.toHaveBeenCalled()
        expect(mockInterfaceStore.openFilterMenu).not.toHaveBeenCalled()
      })

      it('should NOT work on suggested publications even when filter menu is open', () => {
        mockSessionStore.activePublication = { doi: 'suggested-publication-doi' }
        mockSessionStore.isSelected.mockReturnValue(false)
        mockInterfaceStore.isFilterMenuOpen = true
        const event = createKeyboardEvent('i')
        
        onKey(event)
        
        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockSessionStore.filter.toggleDoi).not.toHaveBeenCalled()
        expect(mockSessionStore.filter.addDoi).not.toHaveBeenCalled()
      })
    })

    describe('Edge Cases', () => {
      it('should do nothing when no active publication', () => {
        mockSessionStore.activePublication = null
        const event = createKeyboardEvent('i')
        
        onKey(event)
        
        expect(event.preventDefault).not.toHaveBeenCalled()
        expect(mockSessionStore.filter.addDoi).not.toHaveBeenCalled()
        expect(mockSessionStore.filter.toggleDoi).not.toHaveBeenCalled()
      })

      it('should do nothing when session is empty', () => {
        mockSessionStore.isEmpty = true
        mockSessionStore.activePublication = { doi: 'some-doi' }
        const event = createKeyboardEvent('i')
        
        onKey(event)
        
        expect(event.preventDefault).not.toHaveBeenCalled()
        expect(mockSessionStore.filter.addDoi).not.toHaveBeenCalled()
      })
    })
  })

  describe('Navigation Shortcuts', () => {
    beforeEach(() => {
      // Ensure DOM mocks are set up for navigation tests
      setupDOMElementMocks()
    })

    describe('Arrow Left/Right Navigation', () => {
      it('should navigate to selected publications and close filter menu on ArrowLeft', () => {
        const event = createKeyboardEvent('ArrowLeft')
        
        onKey(event)
        
        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockInterfaceStore.closeFilterMenu).toHaveBeenCalled()
        expect(document.getElementById).toHaveBeenCalledWith('selected')
      })

      it('should navigate to suggested publications and close filter menu on ArrowRight', () => {
        const event = createKeyboardEvent('ArrowRight')
        
        onKey(event)
        
        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockInterfaceStore.closeFilterMenu).toHaveBeenCalled()
        expect(document.getElementById).toHaveBeenCalledWith('suggested')
      })

      it('should handle missing filter menu component gracefully', () => {
        // With Pinia store, there's no missing component issue
        const event = createKeyboardEvent('ArrowLeft')
        
        expect(() => onKey(event)).not.toThrow()
        expect(event.preventDefault).toHaveBeenCalled()
        expect(mockInterfaceStore.closeFilterMenu).toHaveBeenCalled()
      })
    })
  })

  describe('Input Field Handling', () => {
    it('should blur active element when Escape is pressed in text input', () => {
      const mockInput = { blur: vi.fn() }
      Object.defineProperty(document, 'activeElement', {
        value: { nodeName: 'INPUT', type: 'text', blur: mockInput.blur },
        configurable: true
      })
      const event = createKeyboardEvent('Escape')
      
      onKey(event)
      
      expect(mockInput.blur).toHaveBeenCalled()
    })

    it('should not process keys when input is focused', () => {
      Object.defineProperty(document, 'activeElement', {
        value: { nodeName: 'INPUT', type: 'text' },
        configurable: true
      })
      const event = createKeyboardEvent('f')
      
      onKey(event)
      
      expect(mockInterfaceStore.openFilterMenu).not.toHaveBeenCalled()
    })

    it('should not process keys when element with input class is focused', () => {
      Object.defineProperty(document, 'activeElement', {
        value: { nodeName: 'DIV', className: 'some-class input other-class' },
        configurable: true
      })
      const event = createKeyboardEvent('f')
      
      onKey(event)
      
      expect(mockInterfaceStore.openFilterMenu).not.toHaveBeenCalled()
    })
  })

  describe('Modifier Keys and Repeated Events', () => {
    it('should ignore events with Ctrl key', () => {
      const event = createKeyboardEvent('f', { ctrlKey: true })
      
      onKey(event)
      
      expect(mockInterfaceStore.openFilterMenu).not.toHaveBeenCalled()
    })

    it('should ignore events with Shift key', () => {
      const event = createKeyboardEvent('f', { shiftKey: true })
      
      onKey(event)
      
      expect(mockInterfaceStore.openFilterMenu).not.toHaveBeenCalled()
    })

    it('should ignore events with Meta key', () => {
      const event = createKeyboardEvent('f', { metaKey: true })
      
      onKey(event)
      
      expect(mockInterfaceStore.openFilterMenu).not.toHaveBeenCalled()
    })

    it('should ignore repeated events (except ArrowDown/ArrowUp)', () => {
      const event = createKeyboardEvent('f')
      Object.defineProperty(event, 'repeat', { value: true })
      
      onKey(event)
      
      expect(mockInterfaceStore.openFilterMenu).not.toHaveBeenCalled()
    })
  })

  describe('Overlay Handling', () => {
    it('should prevent default and return early when overlay is shown and not in input', () => {
      mockInterfaceStore.isAnyOverlayShown = true
      const event = createKeyboardEvent('f')
      
      onKey(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockInterfaceStore.openFilterMenu).not.toHaveBeenCalled()
    })

    it('should not prevent default when overlay is shown and in input field', () => {
      mockInterfaceStore.isAnyOverlayShown = true
      Object.defineProperty(document, 'activeElement', {
        value: { nodeName: 'INPUT', type: 'text' },
        configurable: true
      })
      const event = createKeyboardEvent('f')
      
      onKey(event)
      
      expect(event.preventDefault).not.toHaveBeenCalled()
    })
  })
})