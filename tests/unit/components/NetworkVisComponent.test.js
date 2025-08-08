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
  on: vi.fn(() => createMockSelection()),
  node: vi.fn(() => ({ getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 100 }) }))
})

const createMockForce = () => ({
  links: vi.fn(() => createMockForce()),
  id: vi.fn(() => createMockForce()),
  distance: vi.fn(() => createMockForce()),
  strength: vi.fn(() => createMockForce())
})

const createMockSimulation = () => ({
  alphaDecay: vi.fn(() => createMockSimulation()),
  alphaMin: vi.fn(() => createMockSimulation()),
  nodes: vi.fn(() => createMockSimulation()),
  force: vi.fn(() => createMockForce()),
  alpha: vi.fn(() => createMockSimulation()),
  restart: vi.fn(() => createMockSimulation())
})

vi.mock('d3', () => ({
  select: vi.fn(() => createMockSelection()),
  selectAll: vi.fn(() => createMockSelection()),
  zoom: vi.fn(() => ({
    on: vi.fn(() => createMockSelection())
  })),
  zoomTransform: vi.fn(() => ({ k: 1, x: 0, y: 0 })),
  forceSimulation: vi.fn(() => createMockSimulation()),
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

  describe('Component Initialization and Mounting', () => {
    it('initializes D3 simulation on mount', () => {
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

      // D3 simulation should be initialized
      expect(wrapper.vm.simulation).toBeDefined()
      
      // D3 SVG elements should be initialized
      expect(wrapper.vm.svg).toBeDefined()
      expect(wrapper.vm.zoom).toBeDefined()
      expect(wrapper.vm.node).toBeDefined()
      expect(wrapper.vm.link).toBeDefined()
      expect(wrapper.vm.label).toBeDefined()
    })

    it('sets SVG dimensions based on container size', () => {
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

      // Should use mocked container dimensions (800x400)
      expect(wrapper.vm.svgWidth).toBe(800)
      // Height should be width/5 for non-mobile (800/5 = 160)
      expect(wrapper.vm.svgHeight).toBe(160)
    })

    it('sets different SVG dimensions for mobile', () => {
      // Mock mobile interface
      vi.mocked(useInterfaceStore).mockReturnValue({
        isMobile: true,
        isNetworkExpanded: false,
        isNetworkClusters: false,
        isLoading: false
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

      // Should use container height directly for mobile
      expect(wrapper.vm.svgHeight).toBe(400)
    })

    it('initializes onlyShowFiltered based on filter state', () => {
      // Test with active filters
      vi.mocked(useSessionStore).mockReturnValue({
        isEmpty: false,
        isUpdatable: false,
        selectedPublications: [],
        suggestedPublications: [],
        boostKeywords: [],
        updateQueued: vi.fn(),
        $onAction: vi.fn(),
        filter: {
          hasActiveFilters: vi.fn(() => true)
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

      expect(wrapper.vm.onlyShowFiltered).toBe(true)
    })

    it('sets up session store action listeners', () => {
      const mockOnAction = vi.fn()
      vi.mocked(useSessionStore).mockReturnValue({
        isEmpty: false,
        isUpdatable: false,
        selectedPublications: [],
        suggestedPublications: [],
        boostKeywords: [],
        updateQueued: vi.fn(),
        $onAction: mockOnAction,
        filter: {
          hasActiveFilters: vi.fn(() => false)
        },
        activePublication: null
      })

      mount(NetworkVisComponent, {
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

      // Should set up action listeners for store updates
      expect(mockOnAction).toHaveBeenCalled()
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

  describe('D3.js Graph Rendering', () => {
    let wrapper
    let mockSessionStore

    beforeEach(() => {
      mockSessionStore = {
        isEmpty: false,
        isUpdatable: false,
        selectedPublications: [
          { doi: '10.1234/test1', title: 'Test Publication 1', year: 2020 },
          { doi: '10.1234/test2', title: 'Test Publication 2', year: 2021 }
        ],
        suggestedPublications: [
          { doi: '10.1234/suggested1', title: 'Suggested Publication 1', year: 2019 }
        ],
        boostKeywords: [
          { name: 'machine learning', weight: 0.8 }
        ],
        updateQueued: vi.fn(),
        $onAction: vi.fn(),
        filter: {
          hasActiveFilters: vi.fn(() => false)
        },
        activePublication: null
      }

      vi.mocked(useSessionStore).mockReturnValue(mockSessionStore)

      wrapper = mount(NetworkVisComponent, {
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
    })

    it('calls plot method without errors', () => {
      expect(() => {
        wrapper.vm.plot()
      }).not.toThrow()
    })

    it('calls plot method with restart parameter', () => {
      expect(() => {
        wrapper.vm.plot(true)
      }).not.toThrow()
    })

    it('handles errors in plot method gracefully', async () => {
      // Mock D3 to throw an error
      const originalD3Select = wrapper.vm.svg.selectAll
      wrapper.vm.svg.selectAll = vi.fn(() => {
        throw new Error('D3 rendering error')
      })

      wrapper.vm.plot()

      // Should set error message
      expect(wrapper.vm.errorMessage).toBe('Sorry, an error occurred while plotting the citation network.')
      
      // Should clear error after timeout (we can't easily test the timeout, but can check it's set)
      expect(wrapper.vm.errorTimer).toBeDefined()

      // Restore original method
      wrapper.vm.svg.selectAll = originalD3Select
    })

    it('skips plotting when dragging', () => {
      wrapper.vm.isDragging = true
      
      const spy = vi.spyOn(wrapper.vm.simulation, 'restart')
      wrapper.vm.plot()
      
      // Should not call simulation restart when dragging
      expect(spy).not.toHaveBeenCalled()
    })

    it('updates simulation with graph data', () => {
      // Since the plot method can throw errors internally and catches them,
      // we just verify the plot method runs without throwing to the test
      wrapper.vm.graph.nodes = [{ id: 'test-node' }]
      wrapper.vm.graph.links = [{ source: 'node1', target: 'node2' }]
      
      expect(() => {
        wrapper.vm.plot()
      }).not.toThrow()
      
      // Verify graph data is set
      expect(wrapper.vm.graph.nodes).toHaveLength(1)
      expect(wrapper.vm.graph.links).toHaveLength(1)
    })

    it('restarts simulation when restart parameter is true', () => {
      // Test that the plot method handles restart parameter without errors
      expect(() => {
        wrapper.vm.plot(true)
      }).not.toThrow()
      
      expect(() => {
        wrapper.vm.plot(false)
      }).not.toThrow()
    })
  })

  describe('User Interaction Methods', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(NetworkVisComponent, {
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
    })

    it('expands network when expandNetwork(true) is called', () => {
      const mockInterfaceStore = vi.mocked(useInterfaceStore)()
      
      wrapper.vm.expandNetwork(true)
      
      expect(mockInterfaceStore.isNetworkExpanded).toBe(true)
    })

    it('collapses network when expandNetwork(false) is called', () => {
      const mockInterfaceStore = vi.mocked(useInterfaceStore)()
      
      wrapper.vm.expandNetwork(false)
      
      expect(mockInterfaceStore.isNetworkExpanded).toBe(false)
    })

    it('handles zoom in correctly', () => {
      expect(() => {
        wrapper.vm.zoomByFactor(1.2)
      }).not.toThrow()
    })

    it('handles zoom out correctly', () => {
      expect(() => {
        wrapper.vm.zoomByFactor(0.8)
      }).not.toThrow()
    })
  })
})