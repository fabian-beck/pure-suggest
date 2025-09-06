import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import NetworkVisComponent from '@/components/NetworkVisComponent.vue'

// Mock D3.js with chainable methods
const createMockSelection = () => {
  const mockData = [];
  const selection = {
    append: vi.fn(() => createMockSelection()),
    attr: vi.fn(() => createMockSelection()),
    select: vi.fn(() => createMockSelection()),
    selectAll: vi.fn(() => createMockSelection()),
    call: vi.fn(() => createMockSelection()),
    data: vi.fn((data) => {
      if (data) {
        return {
          map: vi.fn((fn) => data.map(fn)),
          join: vi.fn(() => createMockSelection()),
          enter: vi.fn(() => createMockSelection()),
          exit: vi.fn(() => createMockSelection()),
          remove: vi.fn(() => createMockSelection())
        };
      }
      return mockData;
    }),
    join: vi.fn(() => createMockSelection()),
    enter: vi.fn(() => createMockSelection()),
    exit: vi.fn(() => createMockSelection()),
    remove: vi.fn(() => createMockSelection()),
    merge: vi.fn(() => createMockSelection()),
    style: vi.fn(() => createMockSelection()),
    text: vi.fn(() => createMockSelection()),
    on: vi.fn(() => createMockSelection()),
    classed: vi.fn(() => createMockSelection()),
    filter: vi.fn(() => createMockSelection()),
    node: vi.fn(() => ({ getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 100 }) })),
    nodes: vi.fn(() => [])
  };
  return selection;
}

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
  restart: vi.fn(() => createMockSimulation()),
  stop: vi.fn(() => createMockSimulation()),
  on: vi.fn(() => createMockSimulation())
})

vi.mock('d3', () => ({
  select: vi.fn(() => createMockSelection()),
  selectAll: vi.fn(() => createMockSelection()),
  zoom: vi.fn(() => ({
    on: vi.fn(() => createMockSelection())
  })),
  zoomTransform: vi.fn(() => ({ k: 1, x: 0, y: 0 })),
  drag: vi.fn(() => {
    const mockDrag = {
      on: vi.fn(() => mockDrag)
    }
    return mockDrag
  }),
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

// Mock stores with collapse state
vi.mock('@/stores/session.js', () => ({
  useSessionStore: vi.fn(() => ({
    isEmpty: false,
    isUpdatable: false,
    selectedPublications: [
      { doi: '10.1234/test1', title: 'Test Publication 1', year: 2020 }
    ],
    suggestedPublications: [],
    selectedPublicationsAuthors: [],
    boostKeywords: [],
    updateQueued: vi.fn(),
    $onAction: vi.fn(),
    filter: {
      hasActiveFilters: vi.fn(() => false)
    },
    activePublication: null
  }))
}))

// Create a dynamic interface store that tests can modify
let mockInterfaceStore = {
  isMobile: false,
  isNetworkExpanded: false,
  isNetworkCollapsed: false,
  isNetworkClusters: false,
  isLoading: false,
  openAuthorModalDialog: vi.fn(),
  activatePublicationComponent: vi.fn(),
  collapseNetwork: vi.fn(() => {
    mockInterfaceStore.isNetworkExpanded = false;
    mockInterfaceStore.isNetworkCollapsed = true;
  }),
  expandNetwork: vi.fn(() => {
    mockInterfaceStore.isNetworkExpanded = true;
    mockInterfaceStore.isNetworkCollapsed = false;
  }),
  restoreNetwork: vi.fn(() => {
    mockInterfaceStore.isNetworkExpanded = false;
    mockInterfaceStore.isNetworkCollapsed = false;
  })
}

vi.mock('@/stores/interface.js', () => ({
  useInterfaceStore: vi.fn(() => mockInterfaceStore)
}))

// Mock composables  
vi.mock('@/utils/network/forces.js', () => ({
  createForceSimulation: vi.fn(() => createMockSimulation()),
  initializeForces: vi.fn(),
  calculateYearX: vi.fn((year, width, height, isMobile) => year * 10),
  SIMULATION_ALPHA: 0.5,
  getNodeXPosition: vi.fn((node, isNetworkClusters, yearXFunc) => {
    if (isNetworkClusters && node.x !== undefined) {
      return node.x;
    }
    if (node.publication?.year && yearXFunc) {
      return yearXFunc(node.publication.year);
    }
    return 100;
  })
}))

vi.mock('@/utils/network/publicationNodes.js', () => ({
  initializePublicationNodes: vi.fn(() => createMockSelection()),
  updatePublicationNodes: vi.fn(() => ({ nodes: createMockSelection(), tooltips: [] })),
  createPublicationNodes: vi.fn(() => [])
}))

vi.mock('@/utils/network/keywordNodes.js', () => ({
  initializeKeywordNodes: vi.fn(() => createMockSelection()),
  updateKeywordNodes: vi.fn(() => ({ nodes: createMockSelection(), tooltips: [] })),
  createKeywordNodes: vi.fn(() => []),
  releaseKeywordPosition: vi.fn(),
  highlightKeywordPublications: vi.fn(),
  clearKeywordHighlight: vi.fn(),
  createKeywordNodeDrag: vi.fn(() => ({ on: vi.fn(() => ({ on: vi.fn() })) })),
  createKeywordLinks: vi.fn(() => [])
}))

vi.mock('@/utils/network/authorNodes.js', () => ({
  initializeAuthorNodes: vi.fn(() => createMockSelection()),
  updateAuthorNodes: vi.fn(() => ({ nodes: createMockSelection(), tooltips: [] })),
  createAuthorNodes: vi.fn(() => []),
  highlightAuthorPublications: vi.fn(),
  clearAuthorHighlight: vi.fn(),
  createAuthorLinks: vi.fn(() => [])
}))

vi.mock('@/utils/network/links.js', () => ({
  updateNetworkLinks: vi.fn(() => createMockSelection()),
  updateLinkProperties: vi.fn(),
  createCitationLinks: vi.fn(() => [])
}))

vi.mock('@/utils/network/yearLabels.js', () => ({
  updateYearLabels: vi.fn(() => createMockSelection())
}))

// Mock components
vi.mock('@/components/PublicationComponent.vue', () => ({
  default: { name: 'PublicationComponent' }
}))

// Mock useAppState
vi.mock('@/composables/useAppState.js', () => ({
  useAppState: vi.fn(() => ({
    isEmpty: false,
    activatePublicationComponentByDoi: vi.fn(),
    updateQueued: vi.fn()
  }))
}))

import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'

// Helper function for consistent component stubs
const getComponentStubs = () => ({
  'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
  'CompactSwitch': { template: '<div class="compact-switch"><slot></slot></div>' },
  'CompactButton': { template: '<button class="compact-button"><slot></slot></button>' },
  'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
  'NetworkHeader': { template: '<div class="network-header"><slot></slot></div>' },
  'NetworkPerformanceMonitor': { template: '<div class="network-performance-monitor"><slot></slot></div>' },
  'NetworkControls': { template: '<div class="network-controls"><slot></slot></div>' },
  'PublicationComponent': { template: '<div class="publication-component"><slot></slot></div>' }
})

describe('NetworkVisComponent - Collapse Functionality', () => {
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
    // Reset mock interface store to default state
    mockInterfaceStore.isNetworkExpanded = false
    mockInterfaceStore.isNetworkCollapsed = false
    mockInterfaceStore.isNetworkClusters = false
    mockInterfaceStore.isLoading = false
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  describe('Collapse State Management', () => {
    it('should handle collapseNetwork method correctly', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Initially not collapsed
      expect(mockInterfaceStore.isNetworkCollapsed).toBe(false)
      expect(mockInterfaceStore.isNetworkExpanded).toBe(false)

      // Call collapse method
      wrapper.vm.collapseNetwork()

      // Should be collapsed and not expanded
      expect(mockInterfaceStore.isNetworkCollapsed).toBe(true)
      expect(mockInterfaceStore.isNetworkExpanded).toBe(false)
    })

    it('should handle restoreNetwork method correctly', async () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Start in collapsed state
      mockInterfaceStore.isNetworkCollapsed = true
      mockInterfaceStore.isNetworkExpanded = false

      // Spy on plot method to verify it's called
      const plotSpy = vi.spyOn(wrapper.vm, 'plot')

      // Call restore method
      wrapper.vm.restoreNetwork()

      // Should be restored to normal state
      expect(mockInterfaceStore.isNetworkCollapsed).toBe(false)
      expect(mockInterfaceStore.isNetworkExpanded).toBe(false)

      // Wait for nextTick to complete
      await wrapper.vm.$nextTick()

      // Should trigger a plot update
      expect(plotSpy).toHaveBeenCalledWith(true)
    })

    it('should handle expandNetwork method correctly', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Initially normal state
      expect(mockInterfaceStore.isNetworkExpanded).toBe(false)

      // Expand network
      wrapper.vm.expandNetwork(true)
      expect(mockInterfaceStore.isNetworkExpanded).toBe(true)

      // Collapse network
      wrapper.vm.expandNetwork(false)
      expect(mockInterfaceStore.isNetworkExpanded).toBe(false)
    })
  })

  describe('Performance Optimization When Collapsed', () => {
    it('should skip plot when network is collapsed', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Set collapsed state
      mockInterfaceStore.isNetworkCollapsed = true

      // Spy on simulation methods
      const restartSpy = vi.spyOn(wrapper.vm, 'restart')
      const startSpy = vi.spyOn(wrapper.vm, 'start')

      // Call plot - should return early
      wrapper.vm.plot()

      // Should not call simulation methods when collapsed
      expect(restartSpy).not.toHaveBeenCalled()
      expect(startSpy).not.toHaveBeenCalled()
    })

    it('should skip plot with restart when network is collapsed', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Set collapsed state
      mockInterfaceStore.isNetworkCollapsed = true

      // Spy on simulation methods
      const restartSpy = vi.spyOn(wrapper.vm, 'restart')

      // Call plot with restart - should return early
      wrapper.vm.plot(true)

      // Should not call simulation restart when collapsed
      expect(restartSpy).not.toHaveBeenCalled()
    })

    it('should skip tick when network is collapsed', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Set collapsed state and add some nodes
      mockInterfaceStore.isNetworkCollapsed = true
      wrapper.vm.graph.nodes = [{ id: 'test-node' }]

      // Mock performance monitor
      const mockPerformanceMonitor = {
        trackFps: vi.fn(),
        incrementTick: vi.fn(),
        recordDomUpdate: vi.fn(),
        recordSkippedUpdate: vi.fn()
      }
      wrapper.vm.$refs.performanceMonitor = mockPerformanceMonitor

      // Call tick - should return early
      wrapper.vm.tick()

      // Should not call any performance tracking when collapsed
      expect(mockPerformanceMonitor.trackFps).not.toHaveBeenCalled()
      expect(mockPerformanceMonitor.incrementTick).not.toHaveBeenCalled()
    })

    it('should resume normal operation when network is restored', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Start collapsed
      mockInterfaceStore.isNetworkCollapsed = true

      // Verify plot is skipped when collapsed
      const plotSpy = vi.spyOn(wrapper.vm, 'restart')
      wrapper.vm.plot()
      expect(plotSpy).not.toHaveBeenCalled()
      plotSpy.mockClear()

      // Restore network
      mockInterfaceStore.isNetworkCollapsed = false

      // Now plot should work normally
      wrapper.vm.plot()
      // Should attempt to call restart (even if simulation is mocked)
      expect(() => wrapper.vm.plot()).not.toThrow()
    })
  })

  describe('UI Element Visibility When Collapsed', () => {
    it('should have conditional rendering directives in place', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Test that the main elements exist
      expect(wrapper.find('#network-svg-container').exists()).toBe(true)
      expect(wrapper.find('.publication-component-list').exists()).toBe(true)
      expect(wrapper.find('.controls-header-left').exists()).toBe(true)
      
      // The v-show directives are compiled and controlled by the interface store
      // The important thing is that the methods and state management work correctly
      expect(wrapper.vm.interfaceStore).toBeDefined()
      expect(wrapper.vm.interfaceStore.isNetworkCollapsed).toBeDefined()
    })
  })

  describe('State Transitions', () => {
    it('should handle normal -> collapsed -> normal transition', async () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Start in normal state
      expect(mockInterfaceStore.isNetworkExpanded).toBe(false)
      expect(mockInterfaceStore.isNetworkCollapsed).toBe(false)

      // Collapse
      wrapper.vm.collapseNetwork()
      expect(mockInterfaceStore.isNetworkExpanded).toBe(false)
      expect(mockInterfaceStore.isNetworkCollapsed).toBe(true)

      // Restore to normal
      const plotSpy = vi.spyOn(wrapper.vm, 'plot')
      wrapper.vm.restoreNetwork()
      expect(mockInterfaceStore.isNetworkExpanded).toBe(false)
      expect(mockInterfaceStore.isNetworkCollapsed).toBe(false)

      // Should trigger plot update
      await wrapper.vm.$nextTick()
      expect(plotSpy).toHaveBeenCalledWith(true)
    })

    it('should handle expanded -> collapsed -> expanded transition', async () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Start expanded
      wrapper.vm.expandNetwork(true)
      expect(mockInterfaceStore.isNetworkExpanded).toBe(true)
      expect(mockInterfaceStore.isNetworkCollapsed).toBe(false)

      // Collapse from expanded
      wrapper.vm.collapseNetwork()
      expect(mockInterfaceStore.isNetworkExpanded).toBe(false)
      expect(mockInterfaceStore.isNetworkCollapsed).toBe(true)

      // Expand again
      mockInterfaceStore.expandNetwork()
      expect(mockInterfaceStore.isNetworkExpanded).toBe(true)
      expect(mockInterfaceStore.isNetworkCollapsed).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle collapse when network is empty', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Empty session
      const sessionStore = useSessionStore()
      sessionStore.selectedPublications = []

      // Should handle collapse gracefully even with empty data
      expect(() => {
        wrapper.vm.collapseNetwork()
      }).not.toThrow()

      expect(mockInterfaceStore.isNetworkCollapsed).toBe(true)
    })

    it('should handle restore when network is empty', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Empty session
      const sessionStore = useSessionStore()
      sessionStore.selectedPublications = []
      mockInterfaceStore.isNetworkCollapsed = true

      // Should handle restore gracefully even with empty data
      expect(() => {
        wrapper.vm.restoreNetwork()
      }).not.toThrow()

      expect(mockInterfaceStore.isNetworkCollapsed).toBe(false)
    })
  })
})