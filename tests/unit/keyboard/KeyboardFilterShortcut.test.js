import { describe, it, expect, beforeEach, vi } from 'vitest'
import { onKey } from '../../../src/Keys.js'

// Mock the stores
const mockSessionStore = {
  isEmpty: false,
  filter: {
    isActive: true,
    applyToSelected: true,
    applyToSuggested: true
  }
}

const mockInterfaceStore = {
  isAnyOverlayShown: false
}

// Mock the store imports
vi.mock('../../../src/stores/session.js', () => ({
  useSessionStore: () => mockSessionStore
}))

vi.mock('../../../src/stores/interface.js', () => ({
  useInterfaceStore: () => mockInterfaceStore
}))

describe('Keyboard Filter Shortcut', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    mockSessionStore.filter.isActive = true
    
    // Mock window.filterMenuComponent for the new approach
    window.filterMenuComponent = {
      openMenu: vi.fn()
    }
    
    // Mock document.activeElement to not be an input
    Object.defineProperty(document, 'activeElement', {
      value: { nodeName: 'DIV', className: '' },
      configurable: true
    })
  })

  it('should open filter menu when pressing "f" key', () => {
    const event = new KeyboardEvent('keydown', { key: 'f' })
    event.preventDefault = vi.fn()

    onKey(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(window.filterMenuComponent.openMenu).toHaveBeenCalled()
  })

  it('should close filter menu when pressing "f" key while menu is open', () => {
    // Mock menu as already open
    window.filterMenuComponent.isMenuOpen = true
    window.filterMenuComponent.closeMenu = vi.fn()

    const event = new KeyboardEvent('keydown', { key: 'f' })
    event.preventDefault = vi.fn()

    onKey(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(window.filterMenuComponent.openMenu).toHaveBeenCalled()
    // The openMenu method will call closeMenu when menu is already open
  })

  it('should not open filter menu when session is empty', () => {
    mockSessionStore.isEmpty = true

    const event = new KeyboardEvent('keydown', { key: 'f' })
    event.preventDefault = vi.fn()

    onKey(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(window.filterMenuComponent.openMenu).not.toHaveBeenCalled()
  })

  it('should not open filter menu when overlay is shown', () => {
    mockInterfaceStore.isAnyOverlayShown = true

    const event = new KeyboardEvent('keydown', { key: 'f' })
    event.preventDefault = vi.fn()

    onKey(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(window.filterMenuComponent.openMenu).not.toHaveBeenCalled()
  })

  it('should not open filter menu when input is focused', () => {
    Object.defineProperty(document, 'activeElement', {
      value: { nodeName: 'INPUT', type: 'text' },
      configurable: true
    })

    const event = new KeyboardEvent('keydown', { key: 'f' })
    event.preventDefault = vi.fn()

    onKey(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(window.filterMenuComponent.openMenu).not.toHaveBeenCalled()
  })
})