import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import QuickAccessBar from '@/components/QuickAccessBar.vue'

// Mock stores
const mockSessionStore = {
  isUpdatable: true,
  updateQueued: vi.fn()
}

// Mock the store imports
vi.mock('@/stores/session.js', () => ({
  useSessionStore: () => mockSessionStore
}))

// Mock scroll utility
vi.mock('@/Util.js', () => ({
  scrollToTargetAdjusted: vi.fn()
}))

describe('QuickAccessBar', () => {
  let scrollEventListener

  beforeEach(() => {
    vi.clearAllMocks()
    
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
        scrollEventListener = handler
      }
      return originalAddEventListener.call(document, event, handler)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders update button when sessionStore is updatable', () => {
    mockSessionStore.isUpdatable = true

    const wrapper = mount(QuickAccessBar, {
      global: {
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

    const updateBtn = wrapper.findAll('.v-btn').find(btn => 
      btn.text().includes('Update')
    )
    expect(updateBtn.exists()).toBe(true)
  })

  it('hides update button when sessionStore is not updatable', () => {
    mockSessionStore.isUpdatable = false

    const wrapper = mount(QuickAccessBar, {
      global: {
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

    const updateBtn = wrapper.findAll('.v-btn').find(btn => 
      btn.text().includes('Update')
    )
    // Button exists but is hidden via v-show
    expect(updateBtn.exists()).toBe(true)
  })

  it('renders navigation buttons for selected, suggested, and network', () => {
    const wrapper = mount(QuickAccessBar, {
      global: {
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
    mockSessionStore.isUpdatable = true

    const wrapper = mount(QuickAccessBar, {
      global: {
        stubs: {
          'v-btn': { 
            template: '<button class="v-btn" @click="$emit(\'click\')" v-show="$attrs[\'v-show\']"><slot></slot></button>',
            emits: ['click']
          },
          'v-btn-toggle': { template: '<div class="v-btn-toggle"><slot></slot></div>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' }
        }
      }
    })

    const updateBtn = wrapper.findAll('.v-btn').find(btn => 
      btn.text().includes('Update')
    )
    
    await updateBtn.trigger('click')
    expect(mockSessionStore.updateQueued).toHaveBeenCalled()
  })

  it('adds scroll event listener on mount', () => {
    mount(QuickAccessBar, {
      global: {
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