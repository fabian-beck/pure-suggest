import { vi } from 'vitest'

/**
 * Test utilities following clean mocking patterns established during refactoring
 * Focus on behavior testing rather than implementation details
 */

// Simplified D3 mock - chainable behavior without implementation complexity
export const createD3ChainableMock = (returnData = null) => {
  const mock = vi.fn(() => returnData || createD3ChainableMock())

  // Common D3 methods that return chainable objects
  const chainableMethods = [
    'append',
    'attr',
    'select',
    'selectAll',
    'call',
    'join',
    'enter',
    'exit',
    'remove',
    'merge',
    'style',
    'text',
    'on',
    'classed',
    'filter',
    'transition',
    'duration'
  ]

  chainableMethods.forEach((method) => {
    mock[method] = vi.fn(() => createD3ChainableMock())
  })

  // Special D3 cases
  mock.data = vi.fn((data) => (data ? { map: vi.fn((fn) => data.map(fn)), ...mock } : []))
  mock.node = vi.fn(() => ({
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 100 })
  }))
  mock.nodes = vi.fn(() => [])

  return mock
}

// Simplified D3 simulation mock
export const createD3SimulationMock = () => ({
  alphaDecay: vi.fn(function() { return this }),
  alphaMin: vi.fn(function() { return this }),
  nodes: vi.fn(function() { return this }),
  force: vi.fn(function() { return this }),
  alpha: vi.fn(function() { return this }),
  restart: vi.fn(function() { return this }),
  stop: vi.fn(function() { return this }),
  on: vi.fn(function() { return this })
})

// Complete D3 module mock for vi.mock('d3')
export const createD3ModuleMock = () => {
  const mockSimulation = createD3SimulationMock()
  const mockZoom = {
    on: vi.fn(function() { return this }),
    transform: vi.fn(),
    scaleBy: vi.fn(),
    scaleTo: vi.fn(),
    translateTo: vi.fn()
  }
  const mockDrag = { on: vi.fn(function() { return this }) }

  return {
    select: vi.fn(() => createD3ChainableMock()),
    selectAll: vi.fn(() => createD3ChainableMock()),
    zoom: vi.fn(() => mockZoom),
    zoomTransform: vi.fn(() => ({ k: 1, x: 0, y: 0 })),
    zoomIdentity: { k: 1, x: 0, y: 0 },
    drag: vi.fn(() => mockDrag),
    forceSimulation: vi.fn(() => mockSimulation),
    forceLink: vi.fn(() => ({
      id: vi.fn(() => ({ distance: vi.fn(() => ({ strength: vi.fn() })) }))
    })),
    forceManyBody: vi.fn(() => ({ strength: vi.fn(() => ({ theta: vi.fn() })) })),
    forceX: vi.fn(() => ({ x: vi.fn(() => ({ strength: vi.fn() })) })),
    forceY: vi.fn(() => ({ y: vi.fn(() => ({ strength: vi.fn() })) }))
  }
}

// Setup DOM mocks for D3 tests
export const setupD3DomMocks = () => {
  global.document.getElementById = vi.fn((id) => {
    if (id === 'network-svg-container') {
      return { clientWidth: 800, clientHeight: 400 }
    }
    return null
  })

  if (!Element.prototype.getBoundingClientRect) {
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800, height: 400, x: 0, y: 0,
      top: 0, left: 0, right: 800, bottom: 400
    }))
  }
}

// Standard store mocks - essential state only
export const createMockSessionStore = (overrides = {}) => ({
  isEmpty: false,
  selectedPublications: [],
  suggestedPublications: [],
  selectedPublicationsAuthors: [],
  boostKeywords: [],
  filter: {
    string: '',
    yearStart: '',
    yearEnd: '',
    tag: '',
    dois: [],
    isActive: true,
    applyToSelected: true,
    applyToSuggested: true,
    hasActiveFilters: vi.fn(() => false),
    removeDoi: vi.fn()
  },
  activePublication: null,
  updateQueued: vi.fn(),
  $onAction: vi.fn(),
  getSelectedPublicationByDoi: vi.fn(() => ({
    title: 'Test Publication',
    authorShort: 'Author',
    year: 2023
  })),
  ...overrides
})

export const createMockInterfaceStore = (overrides = {}) => ({
  isMobile: false,
  isFilterMenuOpen: false,
  isNetworkExpanded: false,
  isNetworkClusters: false,
  isLoading: false,
  openFilterMenu: vi.fn(),
  closeFilterMenu: vi.fn(),
  setFilterMenuState: vi.fn(),
  openAuthorModalDialog: vi.fn(),
  activatePublicationComponent: vi.fn(),
  ...overrides
})

// Common external dependency mocks
export const mockExternalDependencies = {
  Cache: {
    clearCache: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    keys: vi.fn(() => Promise.resolve([]))
  },

  Util: {
    scrollToTargetAdjusted: vi.fn(),
    shuffle: vi.fn((arr) => arr),
    saveAsFile: vi.fn()
  },

  Publication: {
    default: {
      TAGS: [
        { name: 'Research', value: 'research' },
        { name: 'Review', value: 'review' }
      ]
    }
  }
}

// Common component stubs for consistent testing
export const commonComponentStubs = {
  // Vuetify components
  'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
  'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
  'v-btn-toggle': { template: '<div class="v-btn-toggle"><slot></slot></div>' },
  'v-menu': { template: '<div class="v-menu"><slot></slot></div>' },
  'v-list': { template: '<div class="v-list"><slot></slot></div>' },
  'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
  'v-list-item-title': { template: '<div class="v-list-item-title"><slot></slot></div>' },
  'v-checkbox': { template: '<input type="checkbox" class="v-checkbox">' },
  'v-slider': { template: '<input type="range" class="v-slider">' },

  // Custom components commonly mocked
  InlineIcon: {
    props: ['icon', 'color'],
    template: '<span class="inline-icon">{{ icon }}</span>'
  },
  CompactButton: {
    props: ['icon'],
    emits: ['click'],
    template:
      '<button class="compact-button" @click="$emit(\'click\')" data-testid="compact-btn">{{ icon }}</button>'
  },
  PublicationDescription: {
    props: ['publication'],
    template:
      '<div class="publication-description">{{ publication.title || "Mock Publication" }}</div>'
  },
  Tippy: {
    props: ['class', 'placement'],
    template: '<div class="tippy-tooltip"><slot /></div>'
  }
}

// Legacy alias for backward compatibility
export const vuetifyStubs = commonComponentStubs

// Mock a publication object with common properties
export const createMockPublication = (overrides = {}) => ({
  doi: '10.1234/test',
  title: 'Test Publication',
  author: 'Test Author',
  year: 2023,
  score: 5,
  boostFactor: 1,
  scoreColor: '#blue',
  citationCount: 2,
  referenceCount: 3,
  referenceDois: ['10.1234/ref1'],
  isActive: false,
  isSelected: false,
  isRead: true,
  wasFetched: true,
  isLinkedToActive: false,
  isHovered: false,
  isKeywordHovered: false,
  isAuthorHovered: false,
  ...overrides
})

// Standard DOM element mock
export const createMockElement = (id, nodeName = 'DIV') => ({
  id,
  nodeName,
  focus: vi.fn(),
  blur: vi.fn(),
  getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 100 }),
  getElementsByClassName: vi.fn(() => []),
  nextElementSibling: null,
  previousElementSibling: null,
  parentNode: null
})
