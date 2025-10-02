import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { useInterfaceStore } from '@/stores/interface.js'

// Mock scrollIntoView
const mockScrollIntoView = vi.fn()

describe('Radical Keyboard Navigation Scrolling: Always Center', () => {
  let interfaceStore

  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    interfaceStore = useInterfaceStore()

    // Mock scrollIntoView on Element prototype
    Element.prototype.scrollIntoView = mockScrollIntoView

    // Clear mock calls before each test
    mockScrollIntoView.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should always center publications during keyboard navigation', async () => {
    const mockComponent = {
      focus: vi.fn(),
      scrollIntoView: mockScrollIntoView
    }

    // Test DOWN navigation
    interfaceStore.activatePublicationComponent(mockComponent, 'down')

    // Verify focus was called
    expect(mockComponent.focus).toHaveBeenCalled()
    expect(interfaceStore.lastNavigationDirection).toBe('down')

    // Advance timers to trigger setTimeout
    await vi.runAllTimersAsync()

    // Should always center regardless of direction
    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
      inline: "nearest"
    })
  })

  it('should always center for UP navigation too', async () => {
    const mockComponent = {
      focus: vi.fn(),
      scrollIntoView: mockScrollIntoView
    }

    // Test UP navigation
    interfaceStore.activatePublicationComponent(mockComponent, 'up')

    // Advance timers to trigger setTimeout
    await vi.runAllTimersAsync()

    // Should always center regardless of direction
    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
      inline: "nearest"
    })
  })

  it('should not scroll when no navigationDirection is provided', async () => {
    const mockComponent = {
      focus: vi.fn()
    }

    // Call without navigationDirection
    interfaceStore.activatePublicationComponent(mockComponent)

    // Advance timers to handle any potential async operations
    await vi.runAllTimersAsync()

    // Should not trigger scrolling without navigationDirection
    expect(mockScrollIntoView).not.toHaveBeenCalled()
  })
})