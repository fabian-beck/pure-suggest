import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref, nextTick } from 'vue'
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

const createMockSimulation = () => ({
  alphaDecay: vi.fn(() => createMockSimulation()),
  alphaMin: vi.fn(() => createMockSimulation()),
  nodes: vi.fn(() => createMockSimulation()),
  force: vi.fn(() => ({
    links: vi.fn(() => createMockSimulation()),
    id: vi.fn(() => createMockSimulation())
  })),
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

// Mock session store with publications but no authors initially
vi.mock('@/stores/session.js', () => ({
  useSessionStore: vi.fn(() => ({
    isEmpty: false,
    selectedPublications: [
      { doi: '10.1234/test1', title: 'Test Publication 1', year: 2020, author: 'John Doe; Jane Smith' },
      { doi: '10.1234/test2', title: 'Test Publication 2', year: 2021, author: 'Jane Smith; Bob Wilson' }
    ],
    suggestedPublications: [],
    boostKeywords: [],
    updateQueued: vi.fn(),
    $onAction: vi.fn(),
    filter: {
      hasActiveFilters: vi.fn(() => false),
      applyToSelected: true,
      applyToSuggested: true,
      matches: vi.fn(() => true)
    },
    activePublication: null,
    yearMin: 2020,
    yearMax: 2021,
    publicationsFiltered: []
  }))
}))

// Mock author store - initially empty, then populated
const mockAuthorStore = {
  selectedPublicationsAuthors: [], // Initially empty - this is the bug!
  computeSelectedPublicationsAuthors: vi.fn((publications) => {
    // Simulate computing authors from publications
    mockAuthorStore.selectedPublicationsAuthors = [
      { 
        id: 'author1', 
        name: 'John Doe', 
        initials: 'JD',
        yearMin: 2020, 
        yearMax: 2021, 
        score: 0.85,
        count: 1,
        publicationDois: ['10.1234/test1']
      },
      { 
        id: 'author2', 
        name: 'Jane Smith', 
        initials: 'JS',
        yearMin: 2020, 
        yearMax: 2021, 
        score: 0.92,
        count: 2,
        publicationDois: ['10.1234/test1', '10.1234/test2']
      }
    ]
  })
}

vi.mock('@/stores/author.js', () => ({
  useAuthorStore: vi.fn(() => mockAuthorStore)
}))

vi.mock('@/stores/interface.js', () => ({
  useInterfaceStore: vi.fn(() => ({
    isMobile: false,
    isNetworkExpanded: false,
    isNetworkClusters: false,
    isLoading: false,
    openAuthorModalDialog: vi.fn(),
    activatePublicationComponent: vi.fn()
  }))
}))

vi.mock('@/stores/queue.js', () => ({
  useQueueStore: vi.fn(() => ({
    selectedQueue: [],
    excludedQueue: []
  }))
}))

// Mock utility modules
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
  initializePublicationNodes: vi.fn(),
  updatePublicationNodes: vi.fn(() => ({ tooltips: [] })),
  createPublicationNodes: vi.fn((publications, doiToIndex, selectedQueue, excludedQueue) => {
    return publications.map(pub => ({
      id: pub.doi,
      type: 'publication',
      publication: pub
    }));
  })
}))

vi.mock('@/utils/network/keywordNodes.js', () => ({
  initializeKeywordNodes: vi.fn(),
  updateKeywordNodes: vi.fn(() => ({ tooltips: [] })),
  createKeywordNodeDrag: vi.fn(() => ({ on: vi.fn(() => ({ on: vi.fn() })) })),
  createKeywordNodes: vi.fn(() => []),
  createKeywordLinks: vi.fn(() => []),
  releaseKeywordPosition: vi.fn(),
  highlightKeywordPublications: vi.fn(),
  clearKeywordHighlight: vi.fn()
}))

// Mock author nodes with spy functions to track calls
vi.mock('@/utils/network/authorNodes.js', () => {
  const mockCreateAuthorNodes = vi.fn((authors, publications) => {
    // This should create author nodes if authors are provided
    if (!authors || authors.length === 0) {
      return [];
    }
    return authors.map(author => ({
      id: author.id,
      type: 'author',
      author: author
    }));
  })

  return {
    initializeAuthorNodes: vi.fn(),
    updateAuthorNodes: vi.fn(() => ({ tooltips: [] })),
    createAuthorNodes: mockCreateAuthorNodes,
    createAuthorLinks: vi.fn(() => []),
    highlightAuthorPublications: vi.fn(),
    clearAuthorHighlight: vi.fn()
  }
})

vi.mock('@/utils/network/links.js', () => ({
  updateNetworkLinks: vi.fn(() => createMockSelection()),
  updateLinkProperties: vi.fn(),
  createCitationLinks: vi.fn(() => [])
}))

vi.mock('@/utils/network/yearLabels.js', () => ({
  updateYearLabels: vi.fn(() => createMockSelection())
}))

// Mock components
vi.mock('@/components/NetworkControls.vue', () => ({
  default: { name: 'NetworkControls' }
}))

vi.mock('@/components/NetworkHeader.vue', () => ({
  default: { name: 'NetworkHeader' }
}))

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

// Import the mocked functions for testing
import { useAuthorStore } from '@/stores/author.js'
import { createAuthorNodes } from '@/utils/network/authorNodes.js'

describe('Author Nodes Timing Issue', () => {
  let pinia

  beforeAll(() => {
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
    // Reset mocks and author store state
    vi.clearAllMocks()
    // Reset author store to empty state (simulating initial load)
    mockAuthorStore.selectedPublicationsAuthors = []
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('should reproduce the timing issue: author nodes are not created when plot() is called before author data is computed', () => {
    const wrapper = mount(NetworkVisComponent, {
      global: {
        stubs: {
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'NetworkControls': { template: '<div class="network-controls"></div>' },
          'NetworkHeader': { template: '<div class="network-header"></div>' },
          'PublicationComponent': { template: '<div class="publication-component"></div>' }
        }
      }
    })

    const authorStore = useAuthorStore()
    
    // INITIAL STATE: Author store is empty (as would happen on first render)
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(0)

    // USER ACTION: Network visualization calls plot() 
    // This happens immediately when the component mounts or when data changes
    wrapper.vm.plot()

    // BUG: createAuthorNodes is called with empty authors array
    expect(createAuthorNodes).toHaveBeenCalledWith(
      [], // Empty array because author data hasn't been computed yet!
      expect.any(Array) // publications array
    )
    
    // RESULT: No author nodes are created
    const createAuthorNodesCall = vi.mocked(createAuthorNodes).mock.calls[0]
    const authorNodes = createAuthorNodes(createAuthorNodesCall[0], createAuthorNodesCall[1])
    expect(authorNodes).toHaveLength(0) // BUG: No author nodes created!

    // LATER: When suggestions are computed, author data becomes available
    // This simulates what happens when updateQueued() or computeSuggestions() is called
    authorStore.computeSelectedPublicationsAuthors([
      { doi: '10.1234/test1', title: 'Test Publication 1', year: 2020, author: 'John Doe; Jane Smith' },
      { doi: '10.1234/test2', title: 'Test Publication 2', year: 2021, author: 'Jane Smith; Bob Wilson' }
    ])
    
    // NOW: Author data is available
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(2)
    
    // BUT: The network visualization has already been plotted without author nodes
    // User must toggle author nodes off/on or re-plot to see them
  })

  it('should show that author nodes appear when plot() is called AFTER author data is computed', async () => {
    const wrapper = mount(NetworkVisComponent, {
      global: {
        stubs: {
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'NetworkControls': { template: '<div class="network-controls"></div>' },
          'NetworkHeader': { template: '<div class="network-header"></div>' },
          'PublicationComponent': { template: '<div class="publication-component"></div>' }
        }
      }
    })

    const authorStore = useAuthorStore()
    
    // STEP 1: Compute author data FIRST (simulating proper timing)
    authorStore.computeSelectedPublicationsAuthors([
      { doi: '10.1234/test1', title: 'Test Publication 1', year: 2020, author: 'John Doe; Jane Smith' },
      { doi: '10.1234/test2', title: 'Test Publication 2', year: 2021, author: 'Jane Smith; Bob Wilson' }
    ])
    
    // STEP 2: Author data is now available
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(2)
    
    // STEP 3: Now plot the network
    wrapper.vm.plot()

    // RESULT: createAuthorNodes is called with populated authors array
    // Note: Only 1 author due to authorNumberFactor (0.5 * 2 publications = 1 author)
    expect(createAuthorNodes).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'author1',
          name: 'John Doe'
        })
      ]), // Authors are available!
      expect.any(Array) // publications array
    )
    
    // SUCCESS: Author nodes are created
    const createAuthorNodesCall = vi.mocked(createAuthorNodes).mock.calls[0]
    const authorNodes = createAuthorNodes(createAuthorNodesCall[0], createAuthorNodesCall[1])
    expect(authorNodes).toHaveLength(1) // Author nodes are created!
    expect(authorNodes[0]).toMatchObject({
      id: 'author1',
      type: 'author',
      author: expect.objectContaining({
        name: 'John Doe'
      })
    })
  })

  it('should verify the current behavior: showAuthorNodes is true but no authors are shown due to timing', () => {
    const wrapper = mount(NetworkVisComponent, {
      global: {
        stubs: {
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'NetworkControls': { template: '<div class="network-controls"></div>' },
          'NetworkHeader': { template: '<div class="network-header"></div>' },
          'PublicationComponent': { template: '<div class="publication-component"></div>' }
        }
      }
    })

    // Verify that author nodes are enabled by default
    expect(wrapper.vm.showAuthorNodes).toBe(true)
    expect(wrapper.vm.showNodes).toContain('author')

    // But when we plot initially, no authors are created due to timing
    wrapper.vm.plot()
    
    const createAuthorNodesCall = vi.mocked(createAuthorNodes).mock.calls[0]
    const authorNodes = createAuthorNodes(createAuthorNodesCall[0], createAuthorNodesCall[1])
    expect(authorNodes).toHaveLength(0) // No authors despite showAuthorNodes being true
  })
})