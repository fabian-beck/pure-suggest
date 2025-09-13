import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import NetworkVisComponent from '@/components/NetworkVisComponent.vue'
import { useInterfaceStore } from '@/stores/interface.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'

// Mock D3 and other external dependencies
vi.mock('d3', () => ({
  select: vi.fn(() => ({
    attr: vi.fn(() => ({
      select: vi.fn(() => ({
        append: vi.fn(() => ({
          attr: vi.fn(() => ({
            selectAll: vi.fn(() => ({}))
          }))
        }))
      }))
    })),
    call: vi.fn(() => ({}))
  })),
  zoom: vi.fn(() => ({
    on: vi.fn()
  })),
  forceSimulation: vi.fn(() => ({
    alphaDecay: vi.fn(() => ({})),
    alphaMin: vi.fn(() => ({})),
    nodes: vi.fn(() => ({})),
    force: vi.fn(() => ({})),
    alpha: vi.fn(() => ({})),
    restart: vi.fn(() => ({})),
    stop: vi.fn(() => ({})),
    on: vi.fn(() => ({}))
  }))
}))

vi.mock('tippy.js', () => ({ default: vi.fn(() => ({})) }))

// Mock all the network utility modules
vi.mock('@/utils/network/forces.js', () => ({
  createForceSimulation: vi.fn(() => ({})),
  initializeForces: vi.fn(),
  calculateYearX: vi.fn(() => 100),
  SIMULATION_ALPHA: 0.5,
  getNodeXPosition: vi.fn(() => 100)
}))

vi.mock('@/utils/network/authorNodes.js', () => ({
  initializeAuthorNodes: vi.fn(() => ({})),
  updateAuthorNodes: vi.fn(() => ({ tooltips: [] })),
  highlightAuthorPublications: vi.fn(),
  clearAuthorHighlight: vi.fn(),
  createAuthorLinks: vi.fn(() => []),
  createAuthorNodes: vi.fn(() => [])
}))

vi.mock('@/utils/network/keywordNodes.js', () => ({
  initializeKeywordNodes: vi.fn(() => ({})),
  updateKeywordNodes: vi.fn(() => ({ tooltips: [] })),
  releaseKeywordPosition: vi.fn(),
  highlightKeywordPublications: vi.fn(),
  clearKeywordHighlight: vi.fn(),
  createKeywordNodeDrag: vi.fn(() => ({ on: vi.fn() })),
  createKeywordLinks: vi.fn(() => []),
  createKeywordNodes: vi.fn(() => [])
}))

vi.mock('@/utils/network/publicationNodes.js', () => ({
  initializePublicationNodes: vi.fn(() => ({})),
  updatePublicationNodes: vi.fn(() => ({ tooltips: [] })),
  createPublicationNodes: vi.fn(() => [])
}))

vi.mock('@/utils/network/links.js', () => ({
  updateNetworkLinks: vi.fn(() => ({})),
  updateLinkProperties: vi.fn(),
  createCitationLinks: vi.fn(() => [])
}))

vi.mock('@/utils/network/yearLabels.js', () => ({
  generateYearRange: vi.fn(() => []),
  updateYearLabelContent: vi.fn(() => ({})),
  updateYearLabelRects: vi.fn(),
  updateYearLabelVisibility: vi.fn()
}))

describe('Bug: Network controls should not show when app state is empty', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

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

  const getComponentStubs = () => ({
    'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
    'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
    'v-btn-toggle': { template: '<div class="v-btn-toggle"><slot></slot></div>' },
    'v-menu': { template: '<div class="v-menu"><slot></slot></div>' },
    'v-list': { template: '<div class="v-list"><slot></slot></div>' },
    'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
    'v-list-item-title': { template: '<div class="v-list-item-title"><slot></slot></div>' },
    'v-checkbox': { template: '<input type="checkbox" class="v-checkbox">' },
    'v-slider': { template: '<input type="range" class="v-slider">' },
    CompactButton: { template: '<button class="compact-button"><slot></slot></button>' },
    NetworkHeader: { template: '<div class="network-header"><slot></slot></div>' },
    NetworkPerformanceMonitor: { template: '<div class="network-performance-monitor"><slot></slot></div>' },
    PublicationComponent: { template: '<div class="publication-component"><slot></slot></div>' }
  })

  it('hides NetworkControls when app state is empty (network not collapsed)', () => {
    // Initialize stores with empty state
    const sessionStore = useSessionStore()
    const queueStore = useQueueStore()
    const interfaceStore = useInterfaceStore()
    
    // Ensure empty state
    sessionStore.selectedPublications = []
    sessionStore.excludedPublicationsDois = []
    queueStore.selectedQueue = []
    queueStore.excludedQueue = []
    
    // Ensure network is not collapsed
    interfaceStore.isNetworkCollapsed = false

    const wrapper = mount(NetworkVisComponent, {
      global: {
        plugins: [pinia],
        stubs: getComponentStubs()
      }
    })

    // NetworkControls should be hidden because isEmpty is true
    const networkControls = wrapper.findComponent({ name: 'NetworkControls' })
    expect(networkControls.exists()).toBe(true)
    
    // The key test: NetworkControls should not be visible when app state is empty
    expect(networkControls.isVisible()).toBe(false)
  })

  it('shows NetworkControls when app state is not empty and network not collapsed', () => {
    // Initialize stores with some data
    const sessionStore = useSessionStore()
    const queueStore = useQueueStore()
    const interfaceStore = useInterfaceStore()
    
    // Add some publications to make state non-empty
    sessionStore.selectedPublications = [
      { doi: '10.1234/test1', title: 'Test Publication' }
    ]
    sessionStore.excludedPublicationsDois = []
    queueStore.selectedQueue = []
    queueStore.excludedQueue = []
    
    // Ensure network is not collapsed
    interfaceStore.isNetworkCollapsed = false

    const wrapper = mount(NetworkVisComponent, {
      global: {
        plugins: [pinia],
        stubs: getComponentStubs()
      }
    })

    // NetworkControls should be visible because isEmpty is false and network is not collapsed
    const networkControls = wrapper.findComponent({ name: 'NetworkControls' })
    expect(networkControls.exists()).toBe(true)
    expect(networkControls.isVisible()).toBe(true)
  })

  it('hides NetworkControls when network is collapsed regardless of app state', () => {
    // Initialize stores with some data
    const sessionStore = useSessionStore()
    const queueStore = useQueueStore()
    const interfaceStore = useInterfaceStore()
    
    // Add some publications to make state non-empty
    sessionStore.selectedPublications = [
      { doi: '10.1234/test1', title: 'Test Publication' }
    ]
    queueStore.selectedQueue = []
    queueStore.excludedQueue = []
    
    // Collapse the network
    interfaceStore.isNetworkCollapsed = true

    const wrapper = mount(NetworkVisComponent, {
      global: {
        plugins: [pinia],
        stubs: getComponentStubs()
      }
    })

    // NetworkControls should be hidden because network is collapsed
    const networkControls = wrapper.findComponent({ name: 'NetworkControls' })
    expect(networkControls.exists()).toBe(true)
    expect(networkControls.isVisible()).toBe(false)
  })

  it('hides NetworkControls when both app state is empty AND network is collapsed', () => {
    // Initialize stores with empty state
    const sessionStore = useSessionStore()
    const queueStore = useQueueStore()
    const interfaceStore = useInterfaceStore()
    
    // Ensure empty state
    sessionStore.selectedPublications = []
    sessionStore.excludedPublicationsDois = []
    queueStore.selectedQueue = []
    queueStore.excludedQueue = []
    
    // Collapse the network
    interfaceStore.isNetworkCollapsed = true

    const wrapper = mount(NetworkVisComponent, {
      global: {
        plugins: [pinia],
        stubs: getComponentStubs()
      }
    })

    // NetworkControls should be hidden for both reasons
    const networkControls = wrapper.findComponent({ name: 'NetworkControls' })
    expect(networkControls.exists()).toBe(true)
    expect(networkControls.isVisible()).toBe(false)
  })
})