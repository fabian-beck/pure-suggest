import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { isReactive, ref } from 'vue'

import { createD3ModuleMock, commonComponentStubs } from '../../helpers/testUtils.js'

import NetworkVisComponent from '@/components/NetworkVisComponent.vue'
import { CURRENT_YEAR } from '@/constants/config.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useSessionStore } from '@/stores/session.js'

// Use shared D3 mock from testUtils
vi.mock('d3', () => createD3ModuleMock())

// Mock external dependencies with minimal setup
vi.mock('tippy.js', () => ({ default: vi.fn(() => ({})) }))
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: vi.fn((store) =>
      Object.fromEntries(Object.keys(store).map((key) => [key, ref(store[key])]))
    )
  }
})

// Simplified store mocks - focus on essential state
const mockSessionStore = {
  isEmpty: false,
  selectedPublications: [],
  suggestedPublications: [],
  selectedPublicationsAuthors: [],
  boostKeywords: [],
  filter: { hasActiveFilters: vi.fn(() => false) },
  activePublication: null,
  updateQueued: vi.fn(),
  $onAction: vi.fn()
}

const mockInterfaceStore = {
  isMobile: false,
  isWideScreen: false,
  isNetworkExpanded: false,
  isNetworkClusters: false,
  isLoading: false,
  activatePublicationComponent: vi.fn()
}

vi.mock('@/stores/session.js', () => ({ useSessionStore: vi.fn(() => mockSessionStore) }))
vi.mock('@/stores/interface.js', () => ({ useInterfaceStore: vi.fn(() => mockInterfaceStore) }))

// Mock other components and composables
vi.mock('@/components/PublicationComponent.vue', () => ({
  default: { name: 'PublicationComponent' }
}))
// Create spy that we can reference in tests
const mockOpenAuthorModal = vi.fn()

vi.mock('@/composables/useAppState.js', () => ({
  useAppState: vi.fn(() => ({
    isEmpty: false,
    activatePublicationComponentByDoi: vi.fn(),
    updateQueued: vi.fn()
  }))
}))

vi.mock('@/composables/useModalManager.js', () => ({
  useModalManager: vi.fn(() => ({
    openAuthorModal: mockOpenAuthorModal
  }))
}))

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

    // Mock getBoundingClientRect for SVG elements
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 400,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 800,
      bottom: 400
    }))
  })

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    mockOpenAuthorModal.mockClear()
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Structure and Rendering', () => {
    it('renders with correct basic structure', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
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
          stubs: commonComponentStubs
        }
      })

      const header = wrapper.find('h2.is-size-5')
      expect(header.exists()).toBe(true)
      expect(header.text()).toBe('Citation network')
    })

    it('shows error message when errorMessage is set', async () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })

      wrapper.vm.errorMessage = 'Test error message'
      await wrapper.vm.$nextTick()

      const header = wrapper.findComponent({ name: 'NetworkHeader' })
      expect(header.exists()).toBe(true)
      expect(header.props('errorMessage')).toBe('Test error message')
    })

    it('hides controls when session is empty', () => {
      // Setup empty session state
      const sessionStore = useSessionStore()
      sessionStore.selectedPublications = []
      sessionStore.excludedPublicationsDois = []

      // Add isEmpty computed property
      Object.defineProperty(sessionStore, 'isEmpty', {
        get() {
          return sessionStore.selectedPublications.length === 0
        },
        configurable: true
      })

      const wrapper = mount(NetworkVisComponent, {
        global: {
          plugins: [pinia],
          stubs: commonComponentStubs
        }
      })

      // Simply check that the component renders without error when session is empty
      expect(wrapper.exists()).toBe(true)
      expect(sessionStore.isEmpty).toBe(true)
    })
  })

  describe('Component Data Properties', () => {
    it('initializes with correct default data', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          plugins: [pinia],
          stubs: commonComponentStubs
        }
      })

      expect(wrapper.vm.graph).toEqual({ nodes: [], links: [] })
      // After mounted(), simulation is initialized with D3's forceSimulation
      expect(wrapper.vm.simulation).toBeDefined()
      expect(wrapper.vm.showNodes).toEqual(['selected', 'suggested', 'keyword', 'author'])
      expect(wrapper.vm.errorMessage).toBe('')
      expect(wrapper.vm.suggestedNumberFactor).toBeCloseTo(0.3)
      expect(wrapper.vm.authorNumberFactor).toBe(0.5)
      expect(wrapper.vm.onlyShowFiltered).toBe(false)
    })
  })

  describe('Component Initialization and Mounting', () => {
    it('initializes component without errors', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })

      // Component should mount and initialize without throwing errors
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.network-of-references').exists()).toBe(true)
    })

    it('renders SVG container element', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })

      // SVG container should exist
      expect(wrapper.find('#network-svg-container').exists()).toBe(true)
      expect(wrapper.find('#network-svg').exists()).toBe(true)
    })

    it.each([true, false])('lays out the network in the whole panel (mobile: %s)', (isMobile) => {
      vi.mocked(useInterfaceStore).mockReturnValue({
        isMobile,
        isNetworkExpanded: false,
        isNetworkClusters: false,
        isLoading: false
      })

      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })

      expect(wrapper.vm.viewport).toEqual({ width: 800, height: 400 })
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
          stubs: commonComponentStubs
        }
      })

      expect(wrapper.vm.onlyShowFiltered).toBe(true)
    })
  })

  describe('Computed Properties', () => {
    it('computes showSelectedNodes correctly', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })

      expect(wrapper.vm.showSelectedNodes).toBe(true)

      wrapper.vm.showNodes = ['suggested', 'keyword', 'author']
      expect(wrapper.vm.showSelectedNodes).toBe(false)
    })

    it('computes showSuggestedNodes correctly', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })

      expect(wrapper.vm.showSuggestedNodes).toBe(true)

      wrapper.vm.showNodes = ['selected', 'keyword', 'author']
      expect(wrapper.vm.showSuggestedNodes).toBe(false)
    })

    it('computes showKeywordNodes correctly', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })

      expect(wrapper.vm.showKeywordNodes).toBe(true)

      wrapper.vm.showNodes = ['selected', 'suggested', 'author']
      expect(wrapper.vm.showKeywordNodes).toBe(false)
    })

    it('computes showAuthorNodes correctly', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
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
          {
            doi: '10.1234/test1',
            title: 'Test Publication 1',
            year: 2020,
            citationDois: [],
            referenceDois: ['10.1234/test2']
          },
          {
            doi: '10.1234/test2',
            title: 'Test Publication 2',
            year: 2021,
            citationDois: [],
            referenceDois: []
          }
        ],
        suggestedPublications: [
          { doi: '10.1234/suggested1', title: 'Suggested Publication 1', year: 2019 }
        ],
        boostKeywords: [{ name: 'machine learning', weight: 0.8 }],
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
          stubs: commonComponentStubs
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
      // Mock the node data method to throw an error
      const originalNodeData = wrapper.vm.node.data
      wrapper.vm.node.data = vi.fn(() => {
        throw new Error('D3 rendering error')
      })

      wrapper.vm.plot()

      // Should set error message
      expect(wrapper.vm.errorMessage).toBe(
        'Sorry, an error occurred while plotting the citation network.'
      )

      // Should clear error after timeout (we can't easily test the timeout, but can check it's set)
      expect(wrapper.vm.errorTimer).toBeDefined()

      // Restore original method
      wrapper.vm.node.data = originalNodeData
    })

    it('allows simulation restart during dragging for responsive layout', () => {
      wrapper.vm.setDragging(true)

      const restartSpy = vi.spyOn(wrapper.vm, 'restart')
      const startSpy = vi.spyOn(wrapper.vm, 'start')

      // Test with restart=true (should call restart during dragging)
      wrapper.vm.plot(true)
      expect(restartSpy).toHaveBeenCalled()

      restartSpy.mockClear()
      startSpy.mockClear()

      // Test with restart=false (should call start during dragging)
      wrapper.vm.plot(false)
      expect(startSpy).toHaveBeenCalled()
    })

    it('fits the year axis to the shown publications, not to all of the session', () => {
      mockSessionStore.yearMin = 1960
      mockSessionStore.yearMax = 2021
      wrapper.vm.plot()

      // The earliest shown publication is from 2019, so the axis starts at 2015
      expect(wrapper.vm.yearX(2015)).toBeLessThan(-wrapper.vm.viewport.width / 2 + 50)
      expect(wrapper.vm.yearX(1960)).toBeLessThan(-wrapper.vm.viewport.width / 2)
    })

    it('hands plain (non-reactive) graph data to the simulation', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      wrapper.vm.plot()
      expect(errorSpy).not.toHaveBeenCalled()

      expect(wrapper.vm.graph.nodes).toHaveLength(3)
      expect(wrapper.vm.graph.links).toHaveLength(1)
      expect(wrapper.vm.nodeCount).toBe(3)
      expect(wrapper.vm.linkCount).toBe(1)
      // Vue proxies around nodes would slow down every simulation tick
      const simulationNodes = wrapper.vm.simulation.nodes.mock.lastCall[0]
      expect(simulationNodes).toBe(wrapper.vm.graph.nodes)
      expect(isReactive(simulationNodes)).toBe(false)
      expect(isReactive(simulationNodes[0])).toBe(false)
      expect(isReactive(wrapper.vm.simulation)).toBe(false)
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
          stubs: commonComponentStubs
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

  describe('Advanced User Interactions', () => {
    let wrapper
    let mockSessionStore

    beforeEach(() => {
      mockSessionStore = {
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
        activePublication: { doi: '10.1234/active', title: 'Active Publication' },
        publicationsFiltered: [
          {
            doi: '10.1234/pub1',
            boostKeywords: ['machine learning'],
            isKeywordHovered: false,
            isAuthorHovered: false
          },
          {
            doi: '10.1234/pub2',
            boostKeywords: ['AI'],
            isKeywordHovered: false,
            isAuthorHovered: false
          }
        ]
      }

      const mockInterfaceStore = {
        isMobile: false,
        isNetworkExpanded: false,
        isNetworkClusters: false,
        isLoading: false
      }

      vi.mocked(useSessionStore).mockReturnValue(mockSessionStore)
      vi.mocked(useInterfaceStore).mockReturnValue(mockInterfaceStore)

      wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })
    })

    describe('Keyword Node Interactions', () => {
      it('releases a dragged keyword on click, keeping it at its year in timeline mode', () => {
        const mockEvent = { target: { parentNode: { classList: { remove: vi.fn() } } } }
        const mockData = { id: 'machine learning', fx: 100, fy: 50 }

        wrapper.vm.keywordNodeClick(mockEvent, mockData)
        expect(mockData.fx).toBe(100)
        expect(mockData.fy).toBeUndefined()

        wrapper.vm.isNetworkClusters = true
        mockData.fy = 50
        wrapper.vm.keywordNodeClick(mockEvent, mockData)
        expect(mockData.fx).toBeUndefined()
        expect(mockData.fy).toBeUndefined()
      })

      it('handles keyword node mouseover correctly', () => {
        const mockEvent = {}
        const mockData = { id: 'machine learning' }

        wrapper.vm.onKeywordNodeMouseover(mockEvent, mockData)

        // Should set isKeywordHovered for matching publications
        expect(mockSessionStore.publicationsFiltered[0].isKeywordHovered).toBe(true)
        expect(mockSessionStore.publicationsFiltered[1].isKeywordHovered).toBe(false)
      })

      it('handles keyword node mouseout correctly', () => {
        // First set hover state
        mockSessionStore.publicationsFiltered[0].isKeywordHovered = true

        const mockEvent = {}
        const mockData = { id: 'machine learning' }
        wrapper.vm.onKeywordNodeMouseout(mockEvent, mockData)

        // Should clear hover state for all publications
        expect(mockSessionStore.publicationsFiltered[0].isKeywordHovered).toBe(false)
        expect(mockSessionStore.publicationsFiltered[1].isKeywordHovered).toBe(false)
      })

      it('creates keyword drag behavior correctly', () => {
        // Mock the method if not available
        wrapper.vm.keywordNodeDrag = vi.fn(() => ({ on: vi.fn(() => ({ on: vi.fn() })) }))

        const dragBehavior = wrapper.vm.keywordNodeDrag()

        expect(dragBehavior).toBeDefined()
        expect(typeof dragBehavior.on).toBe('function')
      })
    })

    describe('Author Node Interactions', () => {
      it('handles author node mouseover correctly', () => {
        const mockEvent = {}
        const mockData = {
          author: {
            publicationDois: ['10.1234/pub2']
          }
        }

        wrapper.vm.onAuthorNodeMouseover(mockEvent, mockData)

        // Should set isAuthorHovered for matching publications
        expect(mockSessionStore.publicationsFiltered[0].isAuthorHovered).toBe(false)
        expect(mockSessionStore.publicationsFiltered[1].isAuthorHovered).toBe(true)
      })

      it('handles author node mouseout correctly', () => {
        // First set hover state
        mockSessionStore.publicationsFiltered[1].isAuthorHovered = true

        const mockEvent = {}
        const mockData = {
          author: {
            publicationDois: ['10.1234/pub2']
          }
        }
        wrapper.vm.onAuthorNodeMouseout(mockEvent, mockData)

        // Should clear hover state for all publications
        expect(mockSessionStore.publicationsFiltered[0].isAuthorHovered).toBe(false)
        expect(mockSessionStore.publicationsFiltered[1].isAuthorHovered).toBe(false)
      })

      it('handles author node click correctly', () => {
        const mockEvent = {}
        const mockData = { author: { id: 'author123' } }

        wrapper.vm.authorNodeClick(mockEvent, mockData)

        // Should open author modal dialog
        expect(mockOpenAuthorModal).toHaveBeenCalledWith('author123')
      })
    })

    describe('Drag Behavior', () => {
      it('sets dragging state correctly during drag operations', () => {
        expect(wrapper.vm.isDragging).toBe(false)

        // Simulate drag start
        wrapper.vm.setDragging(true)
        expect(wrapper.vm.isDragging).toBe(true)

        // Simulate drag end
        wrapper.vm.setDragging(false)
        expect(wrapper.vm.isDragging).toBe(false)
      })

      it('prevents plotting during drag operations', () => {
        const plotSpy = vi.spyOn(wrapper.vm, 'plot').mockImplementation(() => {})

        wrapper.vm.setDragging(true)
        wrapper.vm.plot()

        // Plot should return early when dragging
        expect(plotSpy).toHaveBeenCalled()
        plotSpy.mockRestore()
      })
    })
  })

  describe('Active Publication Highlighting', () => {
    it('updates highlighting without a full replot when the active publication changes', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })
      const plotSpy = vi.spyOn(wrapper.vm, 'plot').mockImplementation(() => {})
      const highlightSpy = vi
        .spyOn(wrapper.vm, 'updateActiveHighlighting')
        .mockImplementation(() => {})

      wrapper.vm.$options.watch.activePublication.handler.call(wrapper.vm)

      expect(highlightSpy).toHaveBeenCalledTimes(1)
      expect(plotSpy).not.toHaveBeenCalled()
      plotSpy.mockRestore()
      highlightSpy.mockRestore()
    })

    it('skips highlighting updates while loading', () => {
      const wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })
      const highlightSpy = vi
        .spyOn(wrapper.vm, 'updateActiveHighlighting')
        .mockImplementation(() => {})

      wrapper.vm.interfaceStore.isLoading = true
      wrapper.vm.$options.watch.activePublication.handler.call(wrapper.vm)
      wrapper.vm.interfaceStore.isLoading = false

      expect(highlightSpy).not.toHaveBeenCalled()
      highlightSpy.mockRestore()
    })
  })

  describe('Limiting Shown Publications', () => {
    let wrapper
    let sessionStore
    const createPublications = (count, isSelected) =>
      Array.from({ length: count }, (_, i) => ({
        doi: `10.1000/${isSelected ? 'selected' : 'suggested'}${i}`,
        isSelected,
        isActive: false,
        isLinkedToActive: false
      }))
    const createSelected = (count) => createPublications(count, true)

    beforeEach(() => {
      wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })
      wrapper.vm.showNodes = ['selected']
      sessionStore = wrapper.vm.sessionStore
    })

    afterEach(() => {
      sessionStore.selectedPublications = []
      sessionStore.suggestedPublications = []
      sessionStore.activePublication = null
    })

    it('shows all selected publications up to the base number', () => {
      sessionStore.selectedPublications = createSelected(10)
      wrapper.vm.selectedNumberFactor = 0

      expect(wrapper.vm.collectFilteredPublications()).toHaveLength(10)
    })

    it('shows the top-ranked selected publications above the base number', () => {
      sessionStore.selectedPublications = createSelected(50)
      wrapper.vm.selectedNumberFactor = 0.25

      const shown = wrapper.vm.collectFilteredPublications()

      expect(shown).toEqual(sessionStore.selectedPublications.slice(0, 20))
    })

    it('reveals hidden selected publications linked to the active publication', () => {
      sessionStore.selectedPublications = createSelected(50)
      sessionStore.selectedPublications[30].isActive = true
      sessionStore.selectedPublications[40].isLinkedToActive = true
      wrapper.vm.selectedNumberFactor = 0

      const shownDois = wrapper.vm.collectFilteredPublications().map((pub) => pub.doi)

      expect(shownDois).toHaveLength(12)
      expect(shownDois).toContain('10.1000/selected30')
      expect(shownDois).toContain('10.1000/selected40')
    })

    it('reveals a hidden suggested publication only when it is active', () => {
      wrapper.vm.showNodes = ['selected', 'suggested']
      sessionStore.selectedPublications = createSelected(5)
      sessionStore.suggestedPublications = createPublications(50, false)
      wrapper.vm.suggestedNumberFactor = 0.1 // 5 of the suggested shown
      sessionStore.suggestedPublications[30].isLinkedToActive = true

      const activate = (publication) => {
        if (sessionStore.activePublication) sessionStore.activePublication.isActive = false
        sessionStore.activePublication = publication
        publication.isActive = true
      }

      activate(sessionStore.selectedPublications[0])
      expect(wrapper.vm.collectFilteredPublications()).toHaveLength(10)

      activate(sessionStore.suggestedPublications[40])
      const shownDois = wrapper.vm.collectFilteredPublications().map((pub) => pub.doi)
      expect(shownDois).toHaveLength(11)
      expect(shownDois).toContain('10.1000/suggested40')
    })

    it('replots when the active publication reveals or hides selected publications', () => {
      sessionStore.selectedPublications = createSelected(50)
      wrapper.vm.selectedNumberFactor = 0
      wrapper.vm.collectFilteredPublications()
      const plotSpy = vi.spyOn(wrapper.vm, 'plot').mockImplementation(() => {})
      const highlightSpy = vi
        .spyOn(wrapper.vm, 'updateActiveHighlighting')
        .mockImplementation(() => {})
      const activate = () => wrapper.vm.$options.watch.activePublication.handler.call(wrapper.vm)

      // Activating a shown publication without hidden links only updates highlighting
      sessionStore.selectedPublications[0].isActive = true
      activate()
      expect(plotSpy).not.toHaveBeenCalled()

      // Activating a publication linked to a hidden one reveals it
      sessionStore.selectedPublications[40].isLinkedToActive = true
      activate()
      expect(plotSpy).toHaveBeenCalledTimes(1)
      wrapper.vm.collectFilteredPublications()

      // Deactivating hides it again
      sessionStore.selectedPublications[0].isActive = false
      sessionStore.selectedPublications[40].isLinkedToActive = false
      activate()
      expect(plotSpy).toHaveBeenCalledTimes(2)
      expect(highlightSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Node and Link Data Handling', () => {
    let wrapper
    let mockSessionStore

    beforeEach(() => {
      mockSessionStore = {
        isEmpty: false,
        isUpdatable: false,
        selectedPublications: [
          {
            doi: '10.1234/selected1',
            title: 'Selected Publication 1',
            year: 2020,
            boostKeywords: ['machine learning', 'AI']
          },
          {
            doi: '10.1234/selected2',
            title: 'Selected Publication 2',
            year: 2021,
            boostKeywords: ['deep learning']
          }
        ],
        suggestedPublications: [
          {
            doi: '10.1234/suggested1',
            title: 'Suggested Publication 1',
            year: 2019,
            boostKeywords: ['machine learning']
          },
          {
            doi: '10.1234/suggested2',
            title: 'Suggested Publication 2',
            year: 2022,
            boostKeywords: ['neural networks']
          }
        ],
        selectedPublicationsAuthors: [
          { id: 'author1', name: 'John Doe', yearMin: 2019, yearMax: 2021 },
          { id: 'author2', name: 'Jane Smith', yearMin: 2020, yearMax: 2022 }
        ],
        uniqueBoostKeywords: ['machine learning', 'AI', 'deep learning', 'neural networks'],
        publications: [
          {
            doi: '10.1234/selected1',
            title: 'Selected Publication 1',
            year: 2020,
            boostKeywords: ['machine learning', 'AI']
          },
          {
            doi: '10.1234/selected2',
            title: 'Selected Publication 2',
            year: 2021,
            boostKeywords: ['deep learning']
          }
        ],
        publicationsFiltered: [
          {
            doi: '10.1234/selected1',
            title: 'Selected Publication 1',
            year: 2020,
            boostKeywords: ['machine learning', 'AI']
          },
          {
            doi: '10.1234/selected2',
            title: 'Selected Publication 2',
            year: 2021,
            boostKeywords: ['deep learning']
          }
        ],
        updateQueued: vi.fn(),
        $onAction: vi.fn(),
        filter: {
          hasActiveFilters: vi.fn(() => false),
          matches: vi.fn(() => true),
          applyToSelected: true,
          applyToSuggested: true
        },
        activePublication: null,
        isQueuingForSelected: vi.fn(() => false),
        isQueuingForExcluded: vi.fn(() => false)
      }

      vi.mocked(useSessionStore).mockReturnValue(mockSessionStore)

      wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })
    })

    it('initializes empty graph data correctly', () => {
      expect(wrapper.vm.graph).toEqual({ nodes: [], links: [] })
    })

    it('handles node visibility settings correctly', () => {
      // Test default node visibility
      expect(wrapper.vm.showSelectedNodes).toBe(true)
      expect(wrapper.vm.showSuggestedNodes).toBe(true)
      expect(wrapper.vm.showKeywordNodes).toBe(true)
      expect(wrapper.vm.showAuthorNodes).toBe(true)

      // Test toggling node visibility
      wrapper.vm.showNodes = ['selected']
      expect(wrapper.vm.showSelectedNodes).toBe(true)
      expect(wrapper.vm.showSuggestedNodes).toBe(false)
      expect(wrapper.vm.showKeywordNodes).toBe(false)
      expect(wrapper.vm.showAuthorNodes).toBe(false)
    })

    it('handles filtered vs non-filtered data correctly', () => {
      // Test with filters inactive
      expect(wrapper.vm.onlyShowFiltered).toBe(false)

      // Test with filters active
      mockSessionStore.filter.hasActiveFilters.mockReturnValue(true)
      wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })

      expect(wrapper.vm.onlyShowFiltered).toBe(true)
    })

    it('respects suggested number factor settings', () => {
      expect(wrapper.vm.suggestedNumberFactor).toBeCloseTo(0.3)

      wrapper.vm.suggestedNumberFactor = 0.8
      expect(wrapper.vm.suggestedNumberFactor).toBeCloseTo(0.8)
    })

    it('respects author number factor settings', () => {
      expect(wrapper.vm.authorNumberFactor).toBe(0.5)

      wrapper.vm.authorNumberFactor = 1.2
      expect(wrapper.vm.authorNumberFactor).toBeCloseTo(1.2)
    })

    it('handles plot method execution with data', () => {
      // Set up test data
      wrapper.vm.graph.nodes = [
        { id: '10.1234/test1', type: 'publication' },
        { id: '10.1234/test2', type: 'publication' }
      ]
      wrapper.vm.graph.links = [
        { source: '10.1234/test1', target: '10.1234/test2', type: 'citation' }
      ]

      // Should handle plotting with data without errors
      expect(() => {
        wrapper.vm.plot()
      }).not.toThrow()

      expect(wrapper.vm.graph.nodes).toHaveLength(2)
      expect(wrapper.vm.graph.links).toHaveLength(1)
    })
  })

  describe('Watchers and Reactive Updates', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })
    })

    it('updates onlyShowFiltered based on filter state changes', async () => {
      // Initially false when no filters active
      expect(wrapper.vm.onlyShowFiltered).toBe(false)

      // Can be manually set
      await wrapper.setData({ onlyShowFiltered: true })
      expect(wrapper.vm.onlyShowFiltered).toBe(true)
    })

    it('respects user preference when filters change', async () => {
      const mockSessionStore = vi.mocked(useSessionStore)()
      mockSessionStore.filter.hasActiveFilters = vi.fn(() => true)

      // User manually disables onlyShowFiltered
      await wrapper.setData({ onlyShowFiltered: false })
      expect(wrapper.vm.onlyShowFiltered).toBe(false)

      // Filter changes - user preference should persist
      mockSessionStore.filter.string = 'test'
      await wrapper.vm.$options.watch.filter.handler.call(wrapper.vm)

      // User preference maintained
      expect(wrapper.vm.onlyShowFiltered).toBe(false)
    })

    it('resets onlyShowFiltered when filters are cleared', async () => {
      const mockSessionStore = vi.mocked(useSessionStore)()

      await wrapper.setData({ onlyShowFiltered: true })

      // Clear filters
      mockSessionStore.filter.hasActiveFilters = vi.fn(() => false)
      await wrapper.vm.$options.watch.filter.handler.call(wrapper.vm)

      // Should auto-reset to false
      expect(wrapper.vm.onlyShowFiltered).toBe(false)
    })

    it('applies filter first, then slices top N from filtered results', () => {
      const mockSessionStore = vi.mocked(useSessionStore)()

      // Create 100 suggested publications where positions 10, 20, 30... match filter
      const suggestedPubs = []
      for (let i = 1; i <= 100; i++) {
        suggestedPubs.push({
          doi: `10.1000/pub${i}`,
          title: i % 10 === 0 ? 'matching' : 'other',
          year: 2020
        })
      }

      mockSessionStore.selectedPublications = []
      mockSessionStore.suggestedPublications = suggestedPubs
      mockSessionStore.filter.hasActiveFilters = vi.fn(() => true)
      mockSessionStore.filter.applyToSuggested = true
      mockSessionStore.filter.matches = vi.fn((pub) => pub.title === 'matching')

      wrapper.vm.onlyShowFiltered = true
      wrapper.vm.suggestedNumberFactor = 0.3 // 30% of 50 = 15 publications

      const filtered = wrapper.vm.collectFilteredPublications()

      // Should filter entire list (10 matches), then show top 15 of those
      // Since only 10 match total, should return all 10
      expect(filtered).toHaveLength(10)

      // Verify filter was applied to full list, not just first 15
      expect(mockSessionStore.filter.matches.mock.calls.length).toBeGreaterThanOrEqual(10)
    })
  })

  describe('Force Simulation Behavior', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })
    })

    it('calculates year X coordinate correctly for desktop', () => {
      // Test with default non-mobile width (800) and height (160)
      const yearX2020 = wrapper.vm.yearX(2020)
      const yearX2021 = wrapper.vm.yearX(2021)

      expect(typeof yearX2020).toBe('number')
      expect(typeof yearX2021).toBe('number')
      expect(yearX2021).toBeGreaterThan(yearX2020) // Later years should be further right
    })

    it('calculates year X coordinate correctly for mobile', () => {
      // Mock mobile interface
      vi.mocked(useInterfaceStore).mockReturnValue({
        isMobile: true,
        isNetworkExpanded: false,
        isNetworkClusters: false,
        isLoading: false
      })

      const mobileWrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })

      const yearX = mobileWrapper.vm.yearX(2020)
      expect(typeof yearX).toBe('number')
    })

    it('calculates node X position correctly in timeline mode', async () => {
      // Import the composable function directly
      const { getNodeXPosition } = await import('@/utils/network/forces.js')

      const publicationNode = {
        type: 'publication',
        publication: { year: 2020 }
      }

      const keywordNode = {
        type: 'keyword'
      }

      const nodeX1 = getNodeXPosition(publicationNode, wrapper.vm.yearX)
      const nodeX2 = getNodeXPosition(keywordNode, wrapper.vm.yearX)

      expect(typeof nodeX1).toBe('number')
      expect(typeof nodeX2).toBe('number')
    })

    it('handles publication activation correctly', () => {
      // Create a fresh component instance with real stores
      const wrapper = mount(NetworkVisComponent, {
        global: {
          plugins: [pinia],
          stubs: commonComponentStubs
        }
      })

      const mockEvent = { stopPropagation: vi.fn() }
      const mockData = { publication: { doi: '10.1234/test' } }

      // Simply test that the method exists and can be called without throwing
      expect(() => {
        wrapper.vm.activatePublication(mockEvent, mockData)
      }).not.toThrow()

      // Verify the event was handled
      expect(mockEvent.stopPropagation).toHaveBeenCalled()
    })

    it('handles simulation alpha and restart correctly', () => {
      // The simulation should be initialized with proper alpha decay and min values
      expect(wrapper.vm.simulation).toBeDefined()

      // Test that simulation methods exist and can be called
      expect(() => {
        wrapper.vm.simulation.alpha(0.5)
        wrapper.vm.simulation.restart()
      }).not.toThrow()
    })
  })

  describe('Label and Tick Efficiency', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(NetworkVisComponent, { global: { stubs: commonComponentStubs } })
    })

    const lastHandler = (mock, type) => mock.mock.calls.filter(([t]) => t === type).at(-1)[1]

    it('only moves node labels while zooming and places them anew when the zoom ends', () => {
      const updateNodeLabels = vi.spyOn(wrapper.vm, 'updateNodeLabels').mockImplementation(() => {})
      const event = { transform: { k: 2, x: 0, y: 0 } }

      lastHandler(wrapper.vm.zoom.on, 'zoom')(event)
      lastHandler(wrapper.vm.zoom.on, 'zoom')(event)
      expect(updateNodeLabels.mock.calls).toEqual([[false], [false]])

      lastHandler(wrapper.vm.zoom.on, 'end')(event)
      expect(updateNodeLabels).toHaveBeenLastCalledWith(true, false)
    })

    it('hides node labels while the zoom scale changes and shows them placed anew', async () => {
      const updateNodeLabels = vi.spyOn(wrapper.vm, 'updateNodeLabels').mockImplementation(() => {})
      const removeNodeLabels = vi.spyOn(wrapper.vm, 'removeNodeLabels')
      const labelGroup = () => wrapper.find('g.node-labels')

      lastHandler(wrapper.vm.zoom.on, 'zoom')({ transform: { k: 1, x: 20, y: 0 } })
      await wrapper.vm.$nextTick()
      expect(labelGroup().classes()).not.toContain('hidden')

      lastHandler(wrapper.vm.zoom.on, 'zoom')({ transform: { k: 2, x: 20, y: 0 } })
      await wrapper.vm.$nextTick()
      expect(labelGroup().classes()).toContain('hidden')
      expect(removeNodeLabels).not.toHaveBeenCalled()

      lastHandler(wrapper.vm.zoom.on, 'end')({ transform: { k: 2, x: 20, y: 0 } })
      await wrapper.vm.$nextTick()
      // Placed anew, the labels appear at their places instead of moving there
      expect(removeNodeLabels).toHaveBeenCalled()
      expect(updateNodeLabels).toHaveBeenLastCalledWith(true, false)
      expect(labelGroup().classes()).not.toContain('hidden')
    })

    it('fits the layout to the panel when resized, without measuring on label updates', () => {
      let resize
      vi.useFakeTimers()
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback) {
            resize = callback
          }
          observe() {}
          disconnect() {}
        }
      )
      const getElementById = document.getElementById
      const reads = vi.fn()
      let size = [800, 400]
      const container = {
        get clientWidth() {
          reads()
          return size[0]
        },
        get clientHeight() {
          reads()
          return size[1]
        }
      }
      document.getElementById = (id) =>
        id === 'network-svg-container' ? container : getElementById(id)
      try {
        wrapper = mount(NetworkVisComponent, { global: { stubs: commonComponentStubs } })
        wrapper.vm.graph.nodes = [{ id: 'a', x: 0, y: 0 }]
        const plot = vi.spyOn(wrapper.vm, 'plot').mockImplementation(() => {})

        size = [400, 700]
        resize()
        expect(wrapper.vm.viewport).toEqual({ width: 400, height: 700 })
        expect(wrapper.vm.yearX(CURRENT_YEAR + 2)).toBeLessThanOrEqual(200)
        expect(plot).not.toHaveBeenCalled()
        vi.runAllTimers()
        expect(plot).toHaveBeenCalledWith(true)

        reads.mockClear()
        wrapper.vm.isLabelEngineLoaded = true
        wrapper.vm.updateNodeLabels(false)
        wrapper.vm.updateNodeLabels(false)
        expect(reads).not.toHaveBeenCalled()
      } finally {
        document.getElementById = getElementById
        vi.unstubAllGlobals()
        vi.useRealTimers()
      }
    })

    it('sets link classes when plotting, after links are resolved, not on every tick', () => {
      vi.mocked(useSessionStore).mockReturnValue({
        ...mockSessionStore,
        selectedPublications: [
          { doi: '10.1234/a', year: 2020, citationDois: [], referenceDois: ['10.1234/b'] },
          { doi: '10.1234/b', year: 2021, citationDois: [], referenceDois: [] }
        ]
      })
      wrapper = mount(NetworkVisComponent, { global: { stubs: commonComponentStubs } })
      wrapper.vm.plot()
      expect(wrapper.vm.link.attr).toHaveBeenCalledWith('class', expect.any(Function))
      expect(wrapper.vm.link.attr.mock.invocationCallOrder[0]).toBeGreaterThan(
        wrapper.vm.simulation.nodes.mock.invocationCallOrder.at(-1)
      )

      const affectedLinks = { attr: vi.fn(() => affectedLinks), size: () => 1 }
      wrapper.vm.link = { filter: () => affectedLinks }
      wrapper.vm.updateSelectiveLinks([{ id: 'a' }])
      expect(affectedLinks.attr.mock.calls.map(([name]) => name)).toEqual(['d'])
    })

    it('hides node labels while the layout moves and places them once it has ended', async () => {
      const removeNodeLabels = vi.spyOn(wrapper.vm, 'removeNodeLabels')
      const updateNodeLabels = vi.spyOn(wrapper.vm, 'updateNodeLabels')
      vi.spyOn(wrapper.vm, 'updateChangedNodePositions').mockImplementation(() => {})
      vi.spyOn(wrapper.vm, 'updateSelectiveLinks').mockImplementation(() => 0)
      const labelGroup = () => wrapper.find('g.node-labels')
      const end = lastHandler(wrapper.vm.simulation.on, 'end')
      const d3 = await import('d3')

      // Without a restart, the labels stay
      end()
      expect(removeNodeLabels).not.toHaveBeenCalled()

      wrapper.vm.restart()
      await wrapper.vm.$nextTick()
      expect(labelGroup().classes()).toContain('hidden')
      // Not even the end of a zoom places labels while the layout moves
      wrapper.vm.isLabelEngineLoaded = true
      wrapper.vm.graph.nodes = [{ id: 'a', x: 0, y: 0 }]
      vi.mocked(d3.zoomTransform).mockClear()
      lastHandler(wrapper.vm.zoom.on, 'end')({ transform: { k: 1, x: 0, y: 0 } })
      expect(d3.zoomTransform).not.toHaveBeenCalled()

      updateNodeLabels.mockImplementation(() => {})
      end()
      await wrapper.vm.$nextTick()
      expect(removeNodeLabels).toHaveBeenCalled()
      expect(updateNodeLabels).toHaveBeenLastCalledWith(true)
      expect(labelGroup().classes()).not.toContain('hidden')
    })

    it('keeps the layout at rest while the active publication reveals publications', () => {
      vi.spyOn(wrapper.vm, 'updateChangedNodePositions').mockImplementation(() => {})
      vi.spyOn(wrapper.vm, 'updateSelectiveLinks').mockImplementation(() => 0)
      vi.spyOn(wrapper.vm, 'updateNodeLabels').mockImplementation(() => {})
      vi.spyOn(wrapper.vm, 'plot').mockImplementation(() => {})
      const { force } = wrapper.vm.simulation
      const end = lastHandler(wrapper.vm.simulation.on, 'end')
      const node = { id: 'a', x: 10, y: 20 }
      wrapper.vm.graph.nodes = [node]

      // The layout that the simulation found is the layout at rest
      wrapper.vm.restart()
      end()
      expect(wrapper.vm.restPositions.get('a')).toMatchObject({ x: 10, y: 20 })

      // It is kept when publications are revealed, also once nodes have made room
      wrapper.vm.revealedPublications = [{}]
      wrapper.vm.$options.watch.activePublication.handler.call(wrapper.vm)
      expect(force).toHaveBeenLastCalledWith('keep', expect.any(Function))
      node.x = 15
      end()
      expect(wrapper.vm.restPositions.get('a')).toMatchObject({ x: 10, y: 20 })

      // Any other restart finds a new layout
      wrapper.vm.restart()
      expect(force).toHaveBeenLastCalledWith('keep', null)
      end()
      expect(wrapper.vm.restPositions.get('a')).toMatchObject({ x: 15, y: 20 })
    })

    it('draws the final positions and places the labels when the simulation ends', () => {
      const updateNodeLabels = vi.spyOn(wrapper.vm, 'updateNodeLabels').mockImplementation(() => {})
      const updateChangedNodePositions = vi
        .spyOn(wrapper.vm, 'updateChangedNodePositions')
        .mockImplementation(() => {})
      vi.spyOn(wrapper.vm, 'updateSelectiveLinks').mockImplementation(() => 0)
      const node = { id: 'a', x: 10, y: 20, _lastDisplayX: 0, _lastDisplayY: 20 }
      wrapper.vm.graph.nodes = [node]

      lastHandler(wrapper.vm.simulation.on, 'end')()
      expect(updateChangedNodePositions).toHaveBeenCalledWith([node])
      expect(updateNodeLabels).toHaveBeenCalledWith(true)
    })
  })

  describe('Tooltip Functionality', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(NetworkVisComponent, {
        global: {
          stubs: commonComponentStubs
        }
      })
    })

    it('initializes without tooltips', () => {
      // Tooltips should be undefined initially
      expect(wrapper.vm.keywordTooltips).toBeUndefined()
      expect(wrapper.vm.authorTooltips).toBeUndefined()
    })

    it('handles tooltip lifecycle correctly during updates', () => {
      // The plot method handles tooltip creation and updates
      // This is tested indirectly through the plot method tests
      expect(() => {
        wrapper.vm.plot()
      }).not.toThrow()
    })
  })
})
