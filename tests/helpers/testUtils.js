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
    'each',
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

// Minimal stand-in for d3's ZoomTransform
class ZoomTransformMock {
  constructor(k, x, y) {
    this.k = k
    this.x = x
    this.y = y
  }
  translate(x, y) {
    return new ZoomTransformMock(this.k, this.x + this.k * x, this.y + this.k * y)
  }
  scale(k) {
    return new ZoomTransformMock(this.k * k, this.x, this.y)
  }
  apply([x, y]) {
    return [this.applyX(x), this.applyY(y)]
  }
  applyX(x) {
    return x * this.k + this.x
  }
  applyY(y) {
    return y * this.k + this.y
  }
}

// Chainable stand-in for d3 forces
const createForceMock = () => {
  const force = {}
  ;['id', 'distance', 'strength', 'theta', 'x', 'y', 'links'].forEach((method) => {
    force[method] = vi.fn(() => force)
  })
  return force
}

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
    zoomIdentity: new ZoomTransformMock(1, 0, 0),
    drag: vi.fn(() => mockDrag),
    forceSimulation: vi.fn(() => mockSimulation),
    forceLink: vi.fn(createForceMock),
    forceManyBody: vi.fn(createForceMock),
    forceX: vi.fn(createForceMock),
    forceY: vi.fn(createForceMock)
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
  activatePublicationComponent: vi.fn(),
  ...overrides
})

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
  CompactSwitch: {
    template: '<div class="compact-switch"><slot></slot></div>'
  },
  PublicationDescription: {
    props: ['publication'],
    template:
      '<div class="publication-description">{{ publication.title || "Mock Publication" }}</div>'
  },
  PublicationComponent: {
    template: '<div class="publication-component"><slot></slot></div>'
  },
  Tippy: {
    props: ['class', 'placement'],
    template: '<div class="tippy-tooltip"><slot /></div>'
  }
}
