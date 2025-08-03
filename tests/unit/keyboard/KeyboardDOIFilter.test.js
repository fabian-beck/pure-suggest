import { describe, it, expect, beforeEach, vi } from 'vitest'
import { onKey } from '../../../src/Keys.js'

// Mock the stores
const mockSessionStore = {
  activePublication: null,
  isEmpty: false,
  filter: {
    addDoi: vi.fn(),
    toggleDoi: vi.fn()
  },
  isSelected: vi.fn()
}

const mockInterfaceStore = {
  isAnyOverlayShown: false,
  isFilterPanelShown: false
}

// Mock the store imports
vi.mock('../../../src/stores/session.js', () => ({
  useSessionStore: () => mockSessionStore
}))

vi.mock('../../../src/stores/interface.js', () => ({
  useInterfaceStore: () => mockInterfaceStore
}))

describe('Keyboard DOI Filter Bug', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    mockInterfaceStore.isFilterPanelShown = false
    mockSessionStore.activePublication = null
    
    // Mock document.activeElement to not be an input
    Object.defineProperty(document, 'activeElement', {
      value: { nodeName: 'DIV', className: '' },
      configurable: true
    })
  })

  describe('DOI filter should only work for selected publications', () => {
    it('should add DOI filter when pressing "i" on selected publication', () => {
      // Setup: Active publication is a SELECTED publication
      mockSessionStore.activePublication = {
        doi: 'selected-publication-doi'
      }
      mockSessionStore.isSelected.mockReturnValue(true) // This publication IS selected

      // Create and dispatch keyboard event
      const event = new KeyboardEvent('keydown', { key: 'i' })
      event.preventDefault = vi.fn()

      onKey(event)

      // Should prevent default and add DOI to filter
      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockInterfaceStore.isFilterPanelShown).toBe(true)
      expect(mockSessionStore.filter.addDoi).toHaveBeenCalledWith('selected-publication-doi')
    })

    it('should NOT add DOI filter when pressing "i" on suggested publication', () => {
      // Setup: Active publication is a SUGGESTED publication (not selected)
      mockSessionStore.activePublication = {
        doi: 'suggested-publication-doi'  
      }
      mockSessionStore.isSelected.mockReturnValue(false) // This publication is NOT selected

      // Create and dispatch keyboard event
      const event = new KeyboardEvent('keydown', { key: 'i' })
      event.preventDefault = vi.fn()

      onKey(event)

      // With the fix: preventDefault is called but no filter operations happen
      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockInterfaceStore.isFilterPanelShown).toBe(false)
      expect(mockSessionStore.filter.addDoi).not.toHaveBeenCalled()
      expect(mockSessionStore.filter.toggleDoi).not.toHaveBeenCalled()
    })

    it('should toggle DOI filter when pressing "i" on selected publication with filter panel already open', () => {
      // Setup: Filter panel is already shown and active publication is selected
      mockInterfaceStore.isFilterPanelShown = true
      mockSessionStore.activePublication = {
        doi: 'selected-publication-doi'
      }
      mockSessionStore.isSelected.mockReturnValue(true)

      const event = new KeyboardEvent('keydown', { key: 'i' })
      event.preventDefault = vi.fn()

      onKey(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockSessionStore.filter.toggleDoi).toHaveBeenCalledWith('selected-publication-doi')
      expect(mockSessionStore.filter.addDoi).not.toHaveBeenCalled()
    })

    it('should NOT toggle DOI filter when pressing "i" on suggested publication with filter panel open', () => {
      // Setup: Filter panel is shown but active publication is NOT selected
      mockInterfaceStore.isFilterPanelShown = true
      mockSessionStore.activePublication = {
        doi: 'suggested-publication-doi'
      }
      mockSessionStore.isSelected.mockReturnValue(false)

      const event = new KeyboardEvent('keydown', { key: 'i' })
      event.preventDefault = vi.fn()

      onKey(event)

      // preventDefault is called but no filter operations happen
      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockSessionStore.filter.toggleDoi).not.toHaveBeenCalled()
      expect(mockSessionStore.filter.addDoi).not.toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('should do nothing when no active publication', () => {
      mockSessionStore.activePublication = null

      const event = new KeyboardEvent('keydown', { key: 'i' })
      event.preventDefault = vi.fn()

      onKey(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(mockSessionStore.filter.addDoi).not.toHaveBeenCalled()
      expect(mockSessionStore.filter.toggleDoi).not.toHaveBeenCalled()
    })

    it('should do nothing when session is empty', () => {
      mockSessionStore.isEmpty = true
      mockSessionStore.activePublication = {
        doi: 'some-doi'
      }

      const event = new KeyboardEvent('keydown', { key: 'i' })
      event.preventDefault = vi.fn()

      onKey(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(mockSessionStore.filter.addDoi).not.toHaveBeenCalled()
    })
  })
})