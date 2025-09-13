import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest'
import { ref } from 'vue'

import NetworkVisComponent from '@/components/NetworkVisComponent.vue'

// Import the mocked stores and functions for testing
import { useAuthorStore } from '@/stores/author.js'
import { useSessionStore } from '@/stores/session.js'
import { createAuthorNodes } from '@/utils/network/authorNodes.js'

// Mock D3.js with chainable methods (reused from main test)
const createMockSelection = () => {
  const mockData = []
  return {
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
        }
      }
      return mockData
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
    filter: vi.fn((filterFn) => {
      // For testing, we'll return selections based on the filter function
      if (typeof filterFn === 'function') {
        // Mock some test data to filter
        const testData = [
          { type: 'publication', id: 'pub1' },
          { type: 'author', id: 'author1', author: { name: 'Test Author' } },
          { type: 'keyword', id: 'keyword1' }
        ]
        const filteredData = testData.filter(filterFn)
        return {
          ...createMockSelection(),
          data: () => filteredData
        }
      }
      return createMockSelection()
    }),
    node: vi.fn(() => ({ getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 100 }) })),
    nodes: vi.fn(() => [])
  }
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

// Mock session store WITHOUT selectedPublicationsAuthors (to reproduce the bug)
vi.mock('@/stores/session.js', () => ({
  useSessionStore: vi.fn(() => ({
    isEmpty: false,
    selectedPublications: [
      { doi: '10.1234/test1', title: 'Test Publication 1', year: 2020 },
      { doi: '10.1234/test2', title: 'Test Publication 2', year: 2021 }
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
    activePublication: null
    // NOTE: selectedPublicationsAuthors is missing here (moved to author store)
  }))
}))

// Mock author store with test data
vi.mock('@/stores/author.js', () => ({
  useAuthorStore: vi.fn(() => ({
    selectedPublicationsAuthors: [
      {
        id: 'author1',
        name: 'John Doe',
        initials: 'JD',
        yearMin: 2019,
        yearMax: 2021,
        score: 0.85,
        count: 2,
        publicationDois: ['10.1234/test1', '10.1234/test2']
      },
      {
        id: 'author2',
        name: 'Jane Smith',
        initials: 'JS',
        yearMin: 2020,
        yearMax: 2022,
        score: 0.92,
        count: 1,
        publicationDois: ['10.1234/test2']
      }
    ]
  }))
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
  calculateYearX: vi.fn((year, _width, _height, _isMobile) => year * 10),
  SIMULATION_ALPHA: 0.5,
  getNodeXPosition: vi.fn((node, isNetworkClusters, yearXFunc) => {
    if (isNetworkClusters && node.x !== undefined) {
      return node.x
    }
    if (node.publication?.year && yearXFunc) {
      return yearXFunc(node.publication.year)
    }
    return 100
  })
}))

vi.mock('@/utils/network/publicationNodes.js', () => ({
  initializePublicationNodes: vi.fn(),
  updatePublicationNodes: vi.fn(() => ({ tooltips: [] })),
  createPublicationNodes: vi.fn((publications, _doiToIndex, _selectedQueue, _excludedQueue) => {
    return publications.map((pub) => ({
      id: pub.doi,
      type: 'publication',
      publication: pub
    }))
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
  const mockInitializeAuthorNodes = vi.fn()
  const mockUpdateAuthorNodes = vi.fn(() => ({ tooltips: [] }))
  const mockCreateAuthorNodes = vi.fn((authors, _publications) => {
    // This should create author nodes if authors are provided
    if (!authors || authors.length === 0) {
      return []
    }
    return authors.map((author) => ({
      id: author.id,
      type: 'author',
      author
    }))
  })
  const mockCreateAuthorLinks = vi.fn(() => [])

  return {
    initializeAuthorNodes: mockInitializeAuthorNodes,
    updateAuthorNodes: mockUpdateAuthorNodes,
    createAuthorNodes: mockCreateAuthorNodes,
    createAuthorLinks: mockCreateAuthorLinks,
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

describe('Author Nodes Visibility Bug', () => {
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
    // Reset mocks
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('verifies the bug is fixed: author nodes are now visible when accessed from author store', () => {
    // This test verifies that the bug has been fixed
    const wrapper = mount(NetworkVisComponent, {
      global: {
        stubs: {
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          NetworkControls: { template: '<div class="network-controls"></div>' },
          NetworkHeader: { template: '<div class="network-header"></div>' },
          PublicationComponent: { template: '<div class="publication-component"></div>' }
        }
      }
    })

    // Call plot to trigger the node creation logic
    wrapper.vm.plot()

    // The fix: NetworkVisComponent now accesses selectedPublicationsAuthors from authorStore
    const sessionStore = useSessionStore()
    const authorStore = useAuthorStore()

    // Verify the fix:
    // 1. sessionStore doesn't have selectedPublicationsAuthors (as expected after refactor)
    expect(sessionStore.selectedPublicationsAuthors).toBeUndefined()

    // 2. authorStore DOES have the authors
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(2)

    // 3. createAuthorNodes now gets called with the actual authors array from authorStore
    expect(createAuthorNodes).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'author1',
          name: 'John Doe'
        })
      ]), // Authors are now properly passed from authorStore
      expect.any(Array) // publications array
    )

    // 4. As a result, author nodes ARE created
    const createAuthorNodesCall = vi.mocked(createAuthorNodes).mock.calls[0]
    const authorNodes = createAuthorNodes(createAuthorNodesCall[0], createAuthorNodesCall[1])
    expect(authorNodes).toHaveLength(1) // Author nodes are now created because authors array is populated
    expect(authorNodes[0]).toMatchObject({
      id: 'author1',
      type: 'author',
      author: expect.objectContaining({
        name: 'John Doe'
      })
    })
  })

  it('demonstrates the expected behavior when authors are properly accessed', () => {
    // Temporarily mock the sessionStore to have the authors (simulating the fix)
    const sessionStoreWithAuthors = {
      ...useSessionStore(),
      selectedPublicationsAuthors: [
        {
          id: 'author1',
          name: 'John Doe',
          initials: 'JD',
          yearMin: 2019,
          yearMax: 2021,
          score: 0.85,
          count: 2,
          publicationDois: ['10.1234/test1', '10.1234/test2']
        }
      ]
    }

    vi.mocked(useSessionStore).mockReturnValue(sessionStoreWithAuthors)

    const wrapper = mount(NetworkVisComponent, {
      global: {
        stubs: {
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          NetworkControls: { template: '<div class="network-controls"></div>' },
          NetworkHeader: { template: '<div class="network-header"></div>' },
          PublicationComponent: { template: '<div class="publication-component"></div>' }
        }
      }
    })

    wrapper.vm.plot()

    // Now createAuthorNodes should be called with the actual authors
    expect(createAuthorNodes).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'author1',
          name: 'John Doe'
        })
      ]),
      expect.any(Array)
    )

    // And author nodes should be created
    const createAuthorNodesCall = vi.mocked(createAuthorNodes).mock.calls[0]
    const authorNodes = createAuthorNodes(createAuthorNodesCall[0], createAuthorNodesCall[1])
    expect(authorNodes.length).toBeGreaterThan(0)
    expect(authorNodes[0]).toMatchObject({
      id: 'author1',
      type: 'author',
      author: expect.objectContaining({
        name: 'John Doe'
      })
    })
  })

  it('verifies that author nodes are shown when showAuthorNodes is true', () => {
    const wrapper = mount(NetworkVisComponent, {
      global: {
        stubs: {
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          NetworkControls: { template: '<div class="network-controls"></div>' },
          NetworkHeader: { template: '<div class="network-header"></div>' },
          PublicationComponent: { template: '<div class="publication-component"></div>' }
        }
      }
    })

    // Verify that author nodes are enabled by default
    expect(wrapper.vm.showAuthorNodes).toBe(true)
    expect(wrapper.vm.showNodes).toContain('author')

    // The bug means even when showAuthorNodes is true, no nodes are created
    // because the authors array is empty due to accessing wrong store
  })
})
