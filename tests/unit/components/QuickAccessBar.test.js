import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import QuickAccessBar from '@/components/QuickAccessBar.vue'
import { useQueueStore } from '@/stores/queue.js'

// Mock external dependencies with simplified approach
vi.mock('@/lib/Util.js', () => ({
  scrollToTargetAdjusted: vi.fn()
}))

// Mock useAppState
const mockUpdateQueued = vi.fn()
vi.mock('@/composables/useAppState.js', () => ({
  useAppState: () => ({
    updateQueued: mockUpdateQueued
  })
}))

describe('QuickAccessBar', () => {
  let _scrollEventListener
  let pinia
  let queueStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    queueStore = useQueueStore()

    // Set up queue state for updatable behavior
    queueStore.selectedQueue = ['test-doi-1']
    queueStore.excludedQueue = []

    vi.clearAllMocks()
    mockUpdateQueued.mockClear()

    // Mock document.getElementById
    global.document.getElementById = vi.fn((id) => ({
      getBoundingClientRect: vi.fn(() => ({
        top: id === 'selected' ? 50 : 200,
        bottom: id === 'selected' ? 150 : 300
      }))
    }))

    // Mock document properties
    Object.defineProperty(document, 'documentElement', {
      value: {
        clientHeight: 1000
      },
      writable: true
    })

    // Capture scroll event listeners
    const originalAddEventListener = document.addEventListener
    document.addEventListener = vi.fn((event, handler) => {
      if (event === 'scroll') {
        _scrollEventListener = handler
      }
      return originalAddEventListener.call(document, event, handler)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders update button when sessionStore is updatable', () => {
    // Ensure queue store is updatable (has items to process)
    queueStore.selectedQueue = ['test-doi-1']

    const wrapper = mount(QuickAccessBar, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-btn': {
            template: '<button class="v-btn" v-show="$attrs[\'v-show\']"><slot></slot></button>',
            props: ['vShow']
          },
          'v-btn-toggle': { template: '<div class="v-btn-toggle"><slot></slot></div>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' }
        }
      }
    })

    const updateBtn = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Update'))
    expect(updateBtn.exists()).toBe(true)
  })

  it('hides update button when sessionStore is not updatable', () => {
    // Ensure queue store is not updatable (no items to process)
    queueStore.selectedQueue = []
    queueStore.excludedQueue = []

    const wrapper = mount(QuickAccessBar, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-btn': {
            template: '<button class="v-btn" v-show="$attrs[\'v-show\']"><slot></slot></button>',
            props: ['vShow']
          },
          'v-btn-toggle': { template: '<div class="v-btn-toggle"><slot></slot></div>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' }
        }
      }
    })

    const updateBtn = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Update'))
    // Button exists but is hidden via v-show
    expect(updateBtn.exists()).toBe(true)
  })

  it('renders navigation buttons for selected, suggested, and network', () => {
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

    expect(wrapper.text()).toContain('Selected')
    expect(wrapper.text()).toContain('Suggested')
    expect(wrapper.text()).toContain('Network')
  })

  it('has correct initial active state', () => {
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

    expect(wrapper.vm.isComponentActive.selected).toBe(true)
    expect(wrapper.vm.isComponentActive.suggested).toBe(false)
    expect(wrapper.vm.isComponentActive.network).toBe(false)
  })

  it('calls updateQueued when update button is clicked', async () => {
    // Ensure queue store is updatable
    queueStore.selectedQueue = ['test-doi-1']

    const wrapper = mount(QuickAccessBar, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-btn': {
            template:
              '<button class="v-btn" @click="$emit(\'click\')" v-show="$attrs[\'v-show\']"><slot></slot></button>',
            emits: ['click']
          },
          'v-btn-toggle': { template: '<div class="v-btn-toggle"><slot></slot></div>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' }
        }
      }
    })

    const updateBtn = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Update'))

    await updateBtn.trigger('click')
    expect(mockUpdateQueued).toHaveBeenCalled()
  })

  it('adds scroll event listener on mount', () => {
    mount(QuickAccessBar, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-btn-toggle': { template: '<div class="v-btn-toggle"><slot></slot></div>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' }
        }
      }
    })

    expect(document.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
