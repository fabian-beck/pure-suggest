import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import QuickAccessBar from '@/components/QuickAccessBar.vue'
import { useQueueStore } from '@/stores/queue.js'

// Mock external dependencies
vi.mock('@/lib/Util.js', () => ({
  scrollToTargetAdjusted: vi.fn()
}))

const mockUpdateQueued = vi.fn()
vi.mock('@/composables/useAppState.js', () => ({
  useAppState: () => ({
    updateQueued: mockUpdateQueued
  })
}))

describe('QuickAccessBar - Null Component Bug', () => {
  let pinia
  let queueStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    queueStore = useQueueStore()
    queueStore.selectedQueue = []
    queueStore.excludedQueue = []

    vi.clearAllMocks()

    // Mock document properties
    Object.defineProperty(document, 'documentElement', {
      value: {
        clientHeight: 1000
      },
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should handle missing DOM elements when updateActiveButton is triggered via scroll', () => {
    // Mock getElementById to return null for missing elements (as would happen in real DOM)
    const originalGetElementById = document.getElementById
    document.getElementById = vi.fn((id) => {
      // Simulate scenario where components aren't in viewport so loop continues to 'network'
      // which hasn't rendered yet
      if (id === 'network') {
        return null
      }
      // Return elements that are NOT active (outside viewport) so loop continues
      return {
        getBoundingClientRect: vi.fn(() => ({
          top: 2000,  // Far below viewport
          bottom: 2100
        }))
      }
    })

    let scrollHandler
    const originalAddEventListener = document.addEventListener
    document.addEventListener = vi.fn((event, handler) => {
      if (event === 'scroll') {
        scrollHandler = handler
      }
      return originalAddEventListener.call(document, event, handler)
    })

    const wrapper = mount(QuickAccessBar, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-btn-toggle': { template: '<div class="v-btn-toggle"><slot></slot></div>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' }
        }
      }
    })

    // After fix: should NOT throw an error when updateActiveButton handles null gracefully
    expect(() => {
      scrollHandler()
    }).not.toThrow()

    // Verify that all components remain inactive when missing element is encountered
    expect(wrapper.vm.isComponentActive.selected).toBe(false)
    expect(wrapper.vm.isComponentActive.suggested).toBe(false)
    expect(wrapper.vm.isComponentActive.network).toBe(false)

    wrapper.unmount()
    document.getElementById = originalGetElementById
  })

  it('should handle case where all DOM elements are missing on scroll', () => {
    // Mock getElementById to always return null
    const originalGetElementById = document.getElementById
    document.getElementById = vi.fn(() => null)

    let scrollHandler
    const originalAddEventListener = document.addEventListener
    document.addEventListener = vi.fn((event, handler) => {
      if (event === 'scroll') {
        scrollHandler = handler
      }
      return originalAddEventListener.call(document, event, handler)
    })

    const wrapper = mount(QuickAccessBar, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-btn-toggle': { template: '<div class="v-btn-toggle"><slot></slot></div>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' }
        }
      }
    })

    // After fix: should NOT throw when all components are null
    expect(() => {
      scrollHandler()
    }).not.toThrow()

    // All should remain inactive when all elements are missing
    expect(wrapper.vm.isComponentActive.selected).toBe(false)
    expect(wrapper.vm.isComponentActive.suggested).toBe(false)
    expect(wrapper.vm.isComponentActive.network).toBe(false)

    wrapper.unmount()
    document.getElementById = originalGetElementById
  })
})
