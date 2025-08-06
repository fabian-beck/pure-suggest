import { vi } from 'vitest'

/**
 * Creates a mock session store with common filter functionality
 */
export function createMockSessionStore(overrides = {}) {
  return {
    activePublication: null,
    isEmpty: false,
    filter: {
      addDoi: vi.fn(),
      toggleDoi: vi.fn(),
      isActive: true,
      applyToSelected: true,
      applyToSuggested: true,
      ...overrides.filter
    },
    isSelected: vi.fn(),
    ...overrides
  }
}

/**
 * Creates a mock interface store
 */
export function createMockInterfaceStore(overrides = {}) {
  return {
    isAnyOverlayShown: false,
    clear: vi.fn(),
    activatePublicationComponent: vi.fn(),
    ...overrides
  }
}

/**
 * Creates a keyboard event with preventDefault mock
 */
export function createKeyboardEvent(key, options = {}) {
  const event = new KeyboardEvent('keydown', { key, ...options })
  event.preventDefault = vi.fn()
  return event
}

/**
 * Sets up window.filterMenuComponent mock
 */
export function setupFilterMenuComponentMock() {
  window.filterMenuComponent = {
    openMenu: vi.fn(),
    closeMenu: vi.fn(),
    isMenuOpen: false
  }
  return window.filterMenuComponent
}

/**
 * Sets up DOM element mocks for navigation tests
 */
export function setupDOMElementMocks() {
  // Mock document.activeElement
  Object.defineProperty(document, 'activeElement', {
    value: { nodeName: 'DIV', className: '' },
    configurable: true
  })

  // Mock document.getElementById and getElementsByClassName
  const mockSelectedElement = { getElementsByClassName: vi.fn(() => [{ focus: vi.fn() }]) }
  const mockSuggestedElement = { getElementsByClassName: vi.fn(() => [{ focus: vi.fn() }]) }
  
  document.getElementById = vi.fn((id) => {
    if (id === 'selected') return mockSelectedElement
    if (id === 'suggested') return mockSuggestedElement
    return null
  })
}