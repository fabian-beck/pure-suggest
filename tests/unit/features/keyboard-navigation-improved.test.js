import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useInterfaceStore } from '@/stores/interface.js'

// Mock scrollIntoView
const mockScrollIntoView = vi.fn()

describe('Radical Keyboard Navigation Scrolling: Always Center', () => {
  let interfaceStore

  beforeEach(() => {
    setActivePinia(createPinia())
    interfaceStore = useInterfaceStore()

    // Mock scrollIntoView on Element prototype
    Element.prototype.scrollIntoView = mockScrollIntoView

    // Clear mock calls before each test
    mockScrollIntoView.mockClear()
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

    // Wait for setTimeout and scrolling
    await new Promise(resolve => setTimeout(resolve, 100))

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

    // Wait for setTimeout and scrolling
    await new Promise(resolve => setTimeout(resolve, 100))

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

    // Wait for potential async operations
    await new Promise(resolve => setTimeout(resolve, 100))

    // Should not trigger scrolling without navigationDirection
    expect(mockScrollIntoView).not.toHaveBeenCalled()
  })

  it('should work with minimal delay for fast response', async () => {
    const mockComponent = {
      focus: vi.fn(),
      scrollIntoView: mockScrollIntoView
    }

    const startTime = Date.now()
    interfaceStore.activatePublicationComponent(mockComponent, 'down')

    // Wait for scrolling
    await new Promise(resolve => setTimeout(resolve, 100))
    const endTime = Date.now()

    // Should complete quickly (under 150ms total)
    expect(endTime - startTime).toBeLessThan(150)
    expect(mockScrollIntoView).toHaveBeenCalled()
  })
})