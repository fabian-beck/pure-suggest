import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest'
import { ref } from 'vue'

import { createD3ChainableMock, createD3SimulationMock } from '../../helpers/testUtils.js'

import NetworkVisComponent from '@/components/NetworkVisComponent.vue'
import { useSessionStore } from '@/stores/session.js'

// Use shared D3 mock components
vi.mock('d3', () => ({
  select: vi.fn(() => createD3ChainableMock()),
  selectAll: vi.fn(() => createD3ChainableMock()),
  zoom: vi.fn(() => ({ on: vi.fn(function() { return this }) })),
  zoomTransform: vi.fn(() => ({ k: 1, x: 0, y: 0 })),
  zoomIdentity: { k: 1, x: 0, y: 0 },
  drag: vi.fn(() => ({ on: vi.fn(function() { return this }) })),
  forceSimulation: vi.fn(() => createD3SimulationMock()),
  forceLink: vi.fn(() => ({ id: vi.fn(() => ({ distance: vi.fn(() => ({ strength: vi.fn() })) })) })),
  forceManyBody: vi.fn(() => ({ strength: vi.fn(() => ({ theta: vi.fn() })) })),
  forceX: vi.fn(() => ({ x: vi.fn(() => ({ strength: vi.fn() })) })),
  forceY: vi.fn(() => ({ y: vi.fn(() => ({ strength: vi.fn() })) }))
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
    selectedPublications: [{ doi: '10.1234/test1', title: 'Test Publication 1', year: 2020 }],
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
const mockInterfaceStore = {
  isMobile: false,
  isWideScreen: false,
  isNetworkExpanded: false,
  isNetworkCollapsed: false,
  isNetworkClusters: false,
  isLoading: false,
  openAuthorModalDialog: vi.fn(),
  activatePublicationComponent: vi.fn(),
  collapseNetwork: vi.fn(() => {
    mockInterfaceStore.isNetworkExpanded = false
    mockInterfaceStore.isNetworkCollapsed = true
  }),
  expandNetwork: vi.fn(() => {
    mockInterfaceStore.isNetworkExpanded = true
    mockInterfaceStore.isNetworkCollapsed = false
  }),
  restoreNetwork: vi.fn(() => {
    mockInterfaceStore.isNetworkExpanded = false
    mockInterfaceStore.isNetworkCollapsed = false
  })
}

vi.mock('@/stores/interface.js', () => ({
  useInterfaceStore: vi.fn(() => mockInterfaceStore)
}))

// Use shared composable mocks (inlined due to vi.mock hoisting)
vi.mock('@/utils/network/forces.js', () => ({
  createForceSimulation: vi.fn(() => createD3SimulationMock()),
  initializeForces: vi.fn(),
  calculateYearX: vi.fn((year) => year * 10),
  SIMULATION_ALPHA: 0.5,
  getNodeXPosition: vi.fn(() => 100)
}))

vi.mock('@/utils/network/publicationNodes.js', () => ({
  initializePublicationNodes: vi.fn(() => createD3ChainableMock()),
  updatePublicationNodes: vi.fn(() => ({ nodes: createD3ChainableMock(), tooltips: [] })),
  createPublicationNodes: vi.fn(() => [])
}))

vi.mock('@/utils/network/keywordNodes.js', () => ({
  initializeKeywordNodes: vi.fn(() => createD3ChainableMock()),
  updateKeywordNodes: vi.fn(() => ({ nodes: createD3ChainableMock(), tooltips: [] })),
  createKeywordNodes: vi.fn(() => []),
  releaseKeywordPosition: vi.fn(),
  highlightKeywordPublications: vi.fn(),
  clearKeywordHighlight: vi.fn(),
  createKeywordNodeDrag: vi.fn(() => ({ on: vi.fn(() => ({ on: vi.fn() })) })),
  createKeywordLinks: vi.fn(() => [])
}))

vi.mock('@/utils/network/authorNodes.js', () => ({
  initializeAuthorNodes: vi.fn(() => createD3ChainableMock()),
  updateAuthorNodes: vi.fn(() => ({ nodes: createD3ChainableMock(), tooltips: [] })),
  createAuthorNodes: vi.fn(() => []),
  highlightAuthorPublications: vi.fn(),
  clearAuthorHighlight: vi.fn(),
  createAuthorLinks: vi.fn(() => [])
}))

vi.mock('@/utils/network/links.js', () => ({
  updateNetworkLinks: vi.fn(() => createD3ChainableMock()),
  updateLinkProperties: vi.fn(),
  createCitationLinks: vi.fn(() => [])
}))

vi.mock('@/utils/network/yearLabels.js', () => ({
  shouldUpdateYearLabels: vi.fn(() => true),
  generateYearRange: vi.fn(() => [2020, 2025]),
  updateYearLabelContent: vi.fn(() => createD3ChainableMock()),
  updateYearLabelLayout: vi.fn(),
  hideYearLabels: vi.fn()
}))
vi.mock('@/components/PublicationComponent.vue', () => ({ default: { name: 'PublicationComponent' } }))
vi.mock('@/composables/useAppState.js', () => ({
  useAppState: vi.fn(() => ({
    isEmpty: false,
    activatePublicationComponentByDoi: vi.fn(),
    updateQueued: vi.fn()
  }))
}))

// Helper function for consistent component stubs
const getComponentStubs = () => ({
  'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
  CompactSwitch: { template: '<div class="compact-switch"><slot></slot></div>' },
  CompactButton: { template: '<button class="compact-button"><slot></slot></button>' },
  'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
  NetworkHeader: { template: '<div class="network-header"><slot></slot></div>' },
  NetworkPerformanceMonitor: {
    template: '<div class="network-performance-monitor"><slot></slot></div>',
    methods: {
      resetMetrics: vi.fn(),
      trackFps: vi.fn(),
      incrementTick: vi.fn(),
      recordDomUpdate: vi.fn(),
      recordSkippedUpdate: vi.fn(),
      recordTickSkipped: vi.fn()
    },
    computed: {
      tickCount: () => 0
    }
  },
  NetworkControls: { template: '<div class="network-controls"><slot></slot></div>' },
  PublicationComponent: { template: '<div class="publication-component"><slot></slot></div>' }
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
    mockInterfaceStore.isWideScreen = false
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
    it('should skip plot when network is collapsed (in regular desktop mode)', () => {
      // Set collapsed state BEFORE mounting (ensure not wide screen)
      mockInterfaceStore.isNetworkCollapsed = true
      mockInterfaceStore.isWideScreen = false

      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Spy on simulation methods
      const restartSpy = vi.spyOn(wrapper.vm, 'restart')
      const startSpy = vi.spyOn(wrapper.vm, 'start')

      // Call plot - should return early in regular desktop mode when collapsed
      wrapper.vm.plot()

      // Should not call simulation methods when collapsed in regular desktop mode
      expect(startSpy).not.toHaveBeenCalled()
      expect(restartSpy).not.toHaveBeenCalled()
    })

    it('should skip plot with restart when network is collapsed (in regular desktop mode)', () => {
      // Set collapsed state BEFORE mounting (ensure not wide screen)
      mockInterfaceStore.isNetworkCollapsed = true
      mockInterfaceStore.isWideScreen = false

      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Spy on simulation methods
      const restartSpy = vi.spyOn(wrapper.vm, 'restart')

      // Call plot with restart - should return early in regular desktop mode when collapsed
      wrapper.vm.plot(true)

      // Should not call simulation restart when collapsed in regular desktop mode
      expect(restartSpy).not.toHaveBeenCalled()
    })

    it('should not skip plot when network is collapsed but in wide screen mode', () => {
      // Set collapsed state AND wide screen mode BEFORE mounting
      mockInterfaceStore.isNetworkCollapsed = true
      mockInterfaceStore.isWideScreen = true

      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })

      // Spy on simulation methods
      const startSpy = vi.spyOn(wrapper.vm, 'start')

      // Call plot - should NOT return early in wide screen mode
      wrapper.vm.plot()

      // Should call simulation methods even when collapsed in wide screen mode
      expect(startSpy).toHaveBeenCalled()
    })

    it('should skip tick when network is collapsed (in regular desktop mode)', () => {
      // Set collapsed state BEFORE mounting (ensure not wide screen)
      mockInterfaceStore.isNetworkCollapsed = true
      mockInterfaceStore.isWideScreen = false

      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: getComponentStubs()
        }
      })
      wrapper.vm.graph.nodes = [{ id: 'test-node' }]

      // Mock performance monitor methods
      const performanceMonitor = wrapper.vm.$refs.performanceMonitor
      if (performanceMonitor) {
        vi.spyOn(performanceMonitor, 'trackFps')
        vi.spyOn(performanceMonitor, 'incrementTick')
        vi.spyOn(performanceMonitor, 'recordDomUpdate')
        vi.spyOn(performanceMonitor, 'recordSkippedUpdate')
      }

      // Call tick - should return early
      wrapper.vm.tick()

      // Should not call any performance tracking when collapsed
      if (performanceMonitor) {
        expect(performanceMonitor.trackFps).not.toHaveBeenCalled()
        expect(performanceMonitor.incrementTick).not.toHaveBeenCalled()
      }
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
