import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import NetworkVisComponent from '@/components/NetworkVisComponent.vue'

// Mock D3.js with chainable methods
const createMockSelection = () => ({
  append: vi.fn(() => createMockSelection()),
  attr: vi.fn(() => createMockSelection()),
  select: vi.fn(() => createMockSelection()),
  selectAll: vi.fn(() => createMockSelection()),
  call: vi.fn(() => createMockSelection()),
  data: vi.fn(() => createMockSelection()),
  enter: vi.fn(() => createMockSelection()),
  exit: vi.fn(() => createMockSelection()),
  remove: vi.fn(() => createMockSelection()),
  merge: vi.fn(() => createMockSelection()),
  style: vi.fn(() => createMockSelection()),
  text: vi.fn(() => createMockSelection()),
  on: vi.fn(() => createMockSelection())
})

vi.mock('d3', () => ({
  select: vi.fn(() => createMockSelection()),
  selectAll: vi.fn(() => createMockSelection()),
  zoom: vi.fn(() => ({
    on: vi.fn(() => createMockSelection())
  })),
  forceSimulation: vi.fn(() => ({
    alphaDecay: vi.fn(() => ({
      alphaMin: vi.fn(() => ({}))
    })),
    nodes: vi.fn(() => ({})),
    force: vi.fn(() => ({})),
    alpha: vi.fn(() => ({})),
    restart: vi.fn(() => ({}))
  })),
  forceLink: vi.fn(() => ({
    id: vi.fn(() => ({
      distance: vi.fn(() => ({
        strength: vi.fn(() => ({}))
      }))
    }))
  })),
  forceManyBody: vi.fn(() => ({
    strength: vi.fn(() => ({}))
  })),
  forceX: vi.fn(() => ({
    x: vi.fn(() => ({
      strength: vi.fn(() => ({}))
    }))
  })),
  forceY: vi.fn(() => ({
    y: vi.fn(() => ({
      strength: vi.fn(() => ({}))
    }))
  }))
}))

// Mock tippy.js
vi.mock('tippy.js', () => ({
  default: vi.fn(() => ({}))
}))

// Mock storeToRefs
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: vi.fn((store) => ({
      filter: ref(store.filter),
      activePublication: ref(store.activePublication),
      isNetworkClusters: ref(store.isNetworkClusters)
    }))
  }
})

// Mock stores
vi.mock('@/stores/session.js', () => ({
  useSessionStore: vi.fn(() => ({
    isEmpty: false,
    isUpdatable: false,
    selectedPublications: [],
    suggestedPublications: [],
    boostKeywords: [],
    updateQueued: vi.fn(),
    $onAction: vi.fn(),
    filter: {
      hasActiveFilters: vi.fn(() => false)
    },
    activePublication: null
  }))
}))

vi.mock('@/stores/interface.js', () => ({
  useInterfaceStore: vi.fn(() => ({
    isMobile: false,
    isNetworkExpanded: false,
    isNetworkClusters: false,
    isLoading: false
  }))
}))

// Mock components
vi.mock('@/components/PublicationComponent.vue', () => ({
  default: { name: 'PublicationComponent' }
}))

import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'

describe('NetworkVisComponent', () => {
  let pinia
  
  beforeAll(() => {
    // Mock DOM methods that D3 uses
    global.document.getElementById = vi.fn((id) => {
      if (id === 'network-svg-container') {
        return {
          clientWidth: 800,
          clientHeight: 400
        }
      }
      return null
    })
  })

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Structure and Rendering', () => {
    it('renders with correct basic structure', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: {
            'v-icon': true,
            'CompactSwitch': true,
            'CompactButton': true,
            'v-btn': true,
            'v-btn-toggle': true,
            'v-menu': true,
            'v-list': true,
            'v-list-item': true,
            'v-list-item-title': true,
            'v-checkbox': true,
            'v-slider': true,
            'PublicationComponent': true
          }
        }
      })

      expect(wrapper.find('.network-of-references').exists()).toBe(true)
      expect(wrapper.find('.box.has-background-grey').exists()).toBe(true)
      expect(wrapper.find('#network-svg-container').exists()).toBe(true)
      expect(wrapper.find('#network-svg').exists()).toBe(true)
    })

    it('displays the citation network header', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: {
            'v-icon': true,
            'CompactSwitch': true,
            'CompactButton': true,
            'v-btn': true,
            'v-btn-toggle': true,
            'v-menu': true,
            'v-list': true,
            'v-list-item': true,
            'v-list-item-title': true,
            'v-checkbox': true,
            'v-slider': true,
            'PublicationComponent': true
          }
        }
      })

      const header = wrapper.find('h2.is-size-5')
      expect(header.exists()).toBe(true)
      expect(header.text()).toBe('Citation network')
    })

    it('shows error message when errorMessage is set', async () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: {
            'v-icon': true,
            'CompactSwitch': true,
            'CompactButton': true,
            'v-btn': true,
            'v-btn-toggle': true,
            'v-menu': true,
            'v-list': true,
            'v-list-item': true,
            'v-list-item-title': true,
            'v-checkbox': true,
            'v-slider': true,
            'PublicationComponent': true
          }
        }
      })

      await wrapper.setData({ errorMessage: 'Test error message' })

      const errorDiv = wrapper.find('.has-text-danger.has-background-danger-light')
      expect(errorDiv.exists()).toBe(true)
      expect(errorDiv.text()).toBe('Test error message')
    })

    it('hides controls when session is empty', () => {
      // Mock the store to return isEmpty = true
      vi.mocked(useSessionStore).mockReturnValue({
        isEmpty: true,
        isUpdatable: false,
        selectedPublications: [],
        suggestedPublications: [],
        boostKeywords: [],
        updateQueued: vi.fn(),
        $onAction: vi.fn(),
        filter: {
          hasActiveFilters: vi.fn(() => false)
        },
        activePublication: null
      })
      
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: {
            'v-icon': true,
            'CompactSwitch': true,
            'CompactButton': true,
            'v-btn': true,
            'v-btn-toggle': true,
            'v-menu': true,
            'v-list': true,
            'v-list-item': true,
            'v-list-item-title': true,
            'v-checkbox': true,
            'v-slider': true,
            'PublicationComponent': true
          }
        }
      })

      expect(wrapper.find('.level-right').attributes('style')).toContain('display: none')
      expect(wrapper.find('.controls-footer-right').attributes('style')).toContain('display: none')
    })
  })

  describe('Component Data Properties', () => {
    it('initializes with correct default data', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: {
            'v-icon': true,
            'CompactSwitch': true,
            'CompactButton': true,
            'v-btn': true,
            'v-btn-toggle': true,
            'v-menu': true,
            'v-list': true,
            'v-list-item': true,
            'v-list-item-title': true,
            'v-checkbox': true,
            'v-slider': true,
            'PublicationComponent': true
          }
        }
      })

      expect(wrapper.vm.graph).toEqual({ nodes: [], links: [] })
      // After mounted(), simulation is initialized with D3's forceSimulation
      expect(wrapper.vm.simulation).toBeDefined()
      expect(wrapper.vm.showNodes).toEqual(['selected', 'suggested', 'keyword', 'author'])
      expect(wrapper.vm.errorMessage).toBe('')
      expect(wrapper.vm.suggestedNumberFactor).toBe(0.3)
      expect(wrapper.vm.authorNumberFactor).toBe(0.5)
      expect(wrapper.vm.onlyShowFiltered).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('computes showSelectedNodes correctly', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: {
            'v-icon': true,
            'CompactSwitch': true,
            'CompactButton': true,
            'v-btn': true,
            'v-btn-toggle': true,
            'v-menu': true,
            'v-list': true,
            'v-list-item': true,
            'v-list-item-title': true,
            'v-checkbox': true,
            'v-slider': true,
            'PublicationComponent': true
          }
        }
      })

      expect(wrapper.vm.showSelectedNodes).toBe(true)
      
      wrapper.vm.showNodes = ['suggested', 'keyword', 'author']
      expect(wrapper.vm.showSelectedNodes).toBe(false)
    })

    it('computes showSuggestedNodes correctly', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: {
            'v-icon': true,
            'CompactSwitch': true,
            'CompactButton': true,
            'v-btn': true,
            'v-btn-toggle': true,
            'v-menu': true,
            'v-list': true,
            'v-list-item': true,
            'v-list-item-title': true,
            'v-checkbox': true,
            'v-slider': true,
            'PublicationComponent': true
          }
        }
      })

      expect(wrapper.vm.showSuggestedNodes).toBe(true)
      
      wrapper.vm.showNodes = ['selected', 'keyword', 'author']
      expect(wrapper.vm.showSuggestedNodes).toBe(false)
    })

    it('computes showKeywordNodes correctly', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: {
            'v-icon': true,
            'CompactSwitch': true,
            'CompactButton': true,
            'v-btn': true,
            'v-btn-toggle': true,
            'v-menu': true,
            'v-list': true,
            'v-list-item': true,
            'v-list-item-title': true,
            'v-checkbox': true,
            'v-slider': true,
            'PublicationComponent': true
          }
        }
      })

      expect(wrapper.vm.showKeywordNodes).toBe(true)
      
      wrapper.vm.showNodes = ['selected', 'suggested', 'author']
      expect(wrapper.vm.showKeywordNodes).toBe(false)
    })

    it('computes showAuthorNodes correctly', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: {
            'v-icon': true,
            'CompactSwitch': true,
            'CompactButton': true,
            'v-btn': true,
            'v-btn-toggle': true,
            'v-menu': true,
            'v-list': true,
            'v-list-item': true,
            'v-list-item-title': true,
            'v-checkbox': true,
            'v-slider': true,
            'PublicationComponent': true
          }
        }
      })

      expect(wrapper.vm.showAuthorNodes).toBe(true)
      
      wrapper.vm.showNodes = ['selected', 'suggested', 'keyword']
      expect(wrapper.vm.showAuthorNodes).toBe(false)
    })
  })
})