import { vi } from 'vitest'
import { ref } from 'vue'

import { createD3ChainableMock, createD3SimulationMock } from './testUtils.js'

/**
 * Shared mock infrastructure for NetworkVisComponent tests
 * Reduces duplication across NetworkVisComponent.test.js, NetworkVisComponent-collapse.test.js, etc.
 */

// Complete D3 mock for NetworkVisComponent tests
export const createNetworkVisD3Mock = () => {
  const mockSimulation = createD3SimulationMock()
  const mockZoom = {
    on: vi.fn(function() { return this }),
    transform: vi.fn(),
    scaleBy: vi.fn(),
    scaleTo: vi.fn(),
    translateTo: vi.fn()
  }

  return {
    select: vi.fn(() => createD3ChainableMock()),
    selectAll: vi.fn(() => createD3ChainableMock()),
    zoom: vi.fn(() => mockZoom),
    zoomTransform: vi.fn(() => ({ k: 1, x: 0, y: 0 })),
    zoomIdentity: { k: 1, x: 0, y: 0 },
    drag: vi.fn(() => ({ on: vi.fn(() => ({ on: vi.fn() })) })),
    forceSimulation: vi.fn(() => mockSimulation),
    forceLink: vi.fn(() => ({
      id: vi.fn(() => ({ distance: vi.fn(() => ({ strength: vi.fn() })) }))
    })),
    forceManyBody: vi.fn(() => ({ strength: vi.fn(() => ({ theta: vi.fn() })) })),
    forceX: vi.fn(() => ({ x: vi.fn(() => ({ strength: vi.fn() })) })),
    forceY: vi.fn(() => ({ y: vi.fn(() => ({ strength: vi.fn() })) }))
  }
}

// Store mocks for NetworkVisComponent
export const createNetworkVisSessionStore = (overrides = {}) => ({
  isEmpty: false,
  isUpdatable: false,
  selectedPublications: [],
  suggestedPublications: [],
  selectedPublicationsAuthors: [],
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
  ...overrides
})

export const createNetworkVisInterfaceStore = (overrides = {}) => ({
  isMobile: false,
  isWideScreen: false,
  isNetworkExpanded: false,
  isNetworkCollapsed: false,
  isNetworkClusters: false,
  isLoading: false,
  openAuthorModalDialog: vi.fn(),
  activatePublicationComponent: vi.fn(),
  collapseNetwork: vi.fn(),
  expandNetwork: vi.fn(),
  restoreNetwork: vi.fn(),
  ...overrides
})

// Composable mocks
export const createNetworkVisComposableMocks = () => ({
  useNetworkSimulation: vi.fn(() => ({
    simulation: { value: createD3SimulationMock() },
    graph: { value: { nodes: [], links: [] } },
    isDragging: { value: false },
    initializeSimulation: vi.fn(),
    updateGraphData: vi.fn(),
    restart: vi.fn(),
    stop: vi.fn(),
    setDragging: vi.fn()
  })),

  networkForces: {
    calculateYearX: vi.fn((year) => year * 10),
    getNodeXPosition: vi.fn(() => 100),
    SIMULATION_ALPHA: 0.5
  },

  publicationNodes: {
    initializePublicationNodes: vi.fn(() => createD3ChainableMock()),
    updatePublicationNodes: vi.fn(() => ({ nodes: createD3ChainableMock(), tooltips: [] })),
    createPublicationNodes: vi.fn(() => [])
  },

  keywordNodes: {
    initializeKeywordNodes: vi.fn(() => createD3ChainableMock()),
    updateKeywordNodes: vi.fn(() => ({ nodes: createD3ChainableMock(), tooltips: [] })),
    createKeywordNodeDrag: vi.fn(() => ({ on: vi.fn(() => ({ on: vi.fn() })) })),
    createKeywordNodes: vi.fn(() => []),
    createKeywordLinks: vi.fn(() => []),
    releaseKeywordPosition: vi.fn(),
    highlightKeywordPublications: vi.fn(),
    clearKeywordHighlight: vi.fn()
  },

  authorNodes: {
    initializeAuthorNodes: vi.fn(() => createD3ChainableMock()),
    updateAuthorNodes: vi.fn(() => ({ nodes: createD3ChainableMock(), tooltips: [] })),
    createAuthorNodes: vi.fn(() => []),
    createAuthorLinks: vi.fn(() => []),
    highlightAuthorPublications: vi.fn(),
    clearAuthorHighlight: vi.fn()
  },

  networkLinks: {
    updateNetworkLinks: vi.fn(() => createD3ChainableMock()),
    updateLinkProperties: vi.fn(),
    createCitationLinks: vi.fn(() => [])
  },

  useGraphData: {
    initializeGraphData: vi.fn(() => ({ nodes: [], links: [], doiToIndex: {}, filteredAuthors: [] })),
    createGraphContext: vi.fn(() => ({ existingNodeData: [] }))
  },

  useAppState: vi.fn(() => ({
    isEmpty: false,
    activatePublicationComponentByDoi: vi.fn(),
    updateQueued: vi.fn(),
    openAuthorModalDialog: vi.fn()
  }))
})

// Component stubs for NetworkVisComponent tests
export const getNetworkVisComponentStubs = () => ({
  'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
  'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
  'v-btn-toggle': { template: '<div class="v-btn-toggle"><slot></slot></div>' },
  'v-menu': { template: '<div class="v-menu"><slot></slot></div>' },
  'v-list': { template: '<div class="v-list"><slot></slot></div>' },
  'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
  'v-list-item-title': { template: '<div class="v-list-item-title"><slot></slot></div>' },
  'v-checkbox': { template: '<input type="checkbox" class="v-checkbox">' },
  'v-slider': { template: '<input type="range" class="v-slider">' },
  CompactSwitch: { template: '<div class="compact-switch"><slot></slot></div>' },
  CompactButton: { template: '<button class="compact-button"><slot></slot></button>' },
  NetworkHeader: { template: '<div class="network-header"><slot></slot></div>' },
  NetworkControls: { template: '<div class="network-controls"><slot></slot></div>' },
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
  PublicationComponent: { template: '<div class="publication-component"><slot></slot></div>' }
})

// Setup DOM for NetworkVisComponent tests
export const setupNetworkVisDom = () => {
  global.document.getElementById = vi.fn((id) => {
    if (id === 'network-svg-container') {
      return { clientWidth: 800, clientHeight: 400 }
    }
    return null
  })

  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 800, height: 400, x: 0, y: 0,
    top: 0, left: 0, right: 800, bottom: 400
  }))
}

// Mock pinia storeToRefs
export const mockStoreToRefs = () => {
  return vi.fn((store) => {
    const refs = {}
    Object.keys(store).forEach(key => {
      refs[key] = ref(store[key])
    })
    return refs
  })
}