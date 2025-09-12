import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import NetworkVisComponent from '@/components/NetworkVisComponent.vue'
import Publication from '@/core/Publication.js'
import { useAuthorStore } from '@/stores/author.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'

// Mock D3 and related modules to avoid DOM dependencies
vi.mock('d3', () => ({
  select: vi.fn(() => ({
    attr: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis()
  })),
  zoom: vi.fn(() => ({
    on: vi.fn().mockReturnThis()
  })),
  zoomTransform: vi.fn(() => ({ k: 1, x: 0, y: 0 })),
  zoomIdentity: { k: 1, x: 0, y: 0 }
}))

// Mock tippy.js
vi.mock('tippy.js/dist/tippy.css', () => ({}))

// Mock network utility modules
vi.mock('@/utils/network/forces.js', () => ({
  createForceSimulation: vi.fn(() => ({
    nodes: vi.fn().mockReturnThis(),
    force: vi.fn(() => ({ links: vi.fn() })),
    alpha: vi.fn(() => 0),
    restart: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis()
  })),
  initializeForces: vi.fn(),
  calculateYearX: vi.fn(() => 100),
  SIMULATION_ALPHA: 0.3,
  getNodeXPosition: vi.fn(() => 100)
}))

vi.mock('@/utils/network/publicationNodes.js', () => ({
  initializePublicationNodes: vi.fn(),
  updatePublicationNodes: vi.fn(() => ({ tooltips: [] })),
  createPublicationNodes: vi.fn(() => [])
}))

vi.mock('@/utils/network/keywordNodes.js', () => ({
  initializeKeywordNodes: vi.fn(),
  updateKeywordNodes: vi.fn(() => ({ tooltips: [] })),
  releaseKeywordPosition: vi.fn(),
  highlightKeywordPublications: vi.fn(),
  clearKeywordHighlight: vi.fn(),
  createKeywordNodeDrag: vi.fn(),
  createKeywordLinks: vi.fn(() => []),
  createKeywordNodes: vi.fn(() => [])
}))

vi.mock('@/utils/network/authorNodes.js', () => ({
  initializeAuthorNodes: vi.fn(),
  updateAuthorNodes: vi.fn(() => ({ tooltips: [] })),
  highlightAuthorPublications: vi.fn(),
  clearAuthorHighlight: vi.fn(),
  createAuthorLinks: vi.fn(() => []),
  createAuthorNodes: vi.fn(() => [])
}))

vi.mock('@/utils/network/links.js', () => ({
  updateNetworkLinks: vi.fn(() => ({ data: vi.fn(() => []), join: vi.fn() })),
  updateLinkProperties: vi.fn(),
  createCitationLinks: vi.fn(() => [])
}))

vi.mock('@/utils/network/yearLabels.js', () => ({
  updateYearLabels: vi.fn(() => ({ data: vi.fn(() => []), join: vi.fn() }))
}))

// Mock useAppState
vi.mock('@/composables/useAppState.js', () => ({
  useAppState: () => ({
    isEmpty: { value: false },
    activatePublicationComponentByDoi: vi.fn(),
    updateQueued: vi.fn()
  })
}))

describe('NetworkVisComponent - Loading State Behavior', () => {
  let wrapper
  let sessionStore
  let _interfaceStore
  let _queueStore
  let _authorStore
  let plotSpy

  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStore = useSessionStore()
    _interfaceStore = useInterfaceStore()
    _queueStore = useQueueStore()
    _authorStore = useAuthorStore()

    // Set up initial state with publications
    const publication1 = new Publication('10.1234/test1')
    publication1.title = 'Test Publication 1'
    publication1.year = 2020

    const publication2 = new Publication('10.1234/test2')
    publication2.title = 'Test Publication 2'
    publication2.year = 2021

    sessionStore.selectedPublications = [publication1, publication2]
    sessionStore.suggestion = { publications: [publication1, publication2] }

    // Mock DOM container
    const mockContainer = document.createElement('div')
    mockContainer.id = 'network-svg-container'
    mockContainer.style.width = '800px'
    mockContainer.style.height = '400px'
    document.body.appendChild(mockContainer)

    const mockSvg = document.createElement('svg')
    mockSvg.id = 'network-svg'
    mockContainer.appendChild(mockSvg)

    wrapper = mount(NetworkVisComponent, {
      global: {
        plugins: [createPinia()],
        mocks: {
          $nextTick: vi.fn((fn) => fn && fn())
        }
      }
    })

    // Spy on the plot method
    plotSpy = vi.spyOn(wrapper.vm, 'plot')
  })

  describe('Session Loading Premature Plot Prevention', () => {
    it('should NOT trigger plot when filter changes during loading', async () => {
      // Set loading state on the component's store instance
      wrapper.vm.interfaceStore.startLoading()

      // Clear previous plot calls
      plotSpy.mockClear()

      // Trigger filter watcher by changing any filter property
      wrapper.vm.sessionStore.filter.yearMin = 2020
      await wrapper.vm.$nextTick()

      // Verify plot was NOT called during loading
      expect(plotSpy).not.toHaveBeenCalled()
    })

    it('should NOT trigger plot when isNetworkClusters changes during loading', async () => {
      // Set loading state on the component's store instance
      wrapper.vm.interfaceStore.startLoading()

      // Clear previous plot calls
      plotSpy.mockClear()

      // Change network clusters mode during loading via the component's property
      wrapper.vm.isNetworkClusters = false
      await wrapper.vm.$nextTick()

      // Verify plot was NOT called during loading
      expect(plotSpy).not.toHaveBeenCalled()
    })

    it('should NOT trigger plot when updateScores action happens during loading without full data', async () => {
      // Set loading state on the component's store instance
      wrapper.vm.interfaceStore.startLoading()

      // Simulate partial data state (missing suggested publications)
      wrapper.vm.sessionStore.suggestion = null

      // Clear previous plot calls
      plotSpy.mockClear()

      // Trigger updatePublicationScores during loading - this should NOT trigger plot
      wrapper.vm.sessionStore.updatePublicationScores()
      await wrapper.vm.$nextTick()

      // Verify plot was NOT called during loading
      expect(plotSpy).not.toHaveBeenCalled()
    })

    it('should trigger plot when loading completes', async () => {
      // Set loading state on the component's store instance
      wrapper.vm.interfaceStore.startLoading()

      // Clear previous plot calls
      plotSpy.mockClear()

      // End loading state
      wrapper.vm.interfaceStore.endLoading()

      // Now filter change should trigger plot
      wrapper.vm.sessionStore.filter.yearMin = 2022
      await wrapper.vm.$nextTick()

      // Verify plot is called after loading ends
      expect(plotSpy).toHaveBeenCalled()
    })
  })

  describe('Normal Operation (Not Loading)', () => {
    it('should trigger plot when filter changes and NOT loading', async () => {
      // Ensure not loading on the component's store instance
      wrapper.vm.interfaceStore.endLoading()

      // Clear previous plot calls
      plotSpy.mockClear()

      // Change filter when not loading - this SHOULD trigger plot
      wrapper.vm.sessionStore.filter.yearMin = 2021
      await wrapper.vm.$nextTick()

      // Verify plot was called
      expect(plotSpy).toHaveBeenCalledWith(true)
    })

    it('should trigger plot when isNetworkClusters changes and NOT loading', async () => {
      // Ensure not loading on the component's store instance
      wrapper.vm.interfaceStore.endLoading()

      // Clear previous plot calls
      plotSpy.mockClear()

      // Get initial value and set to opposite to ensure a change
      const currentValue = wrapper.vm.isNetworkClusters
      const newValue = !currentValue

      // Change network clusters mode when not loading - this SHOULD trigger plot
      wrapper.vm.isNetworkClusters = newValue
      await wrapper.vm.$nextTick()

      // Verify plot was called
      expect(plotSpy).toHaveBeenCalledWith(true)
    })
  })
})
