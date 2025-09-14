import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import NetworkControls from '@/components/NetworkControls.vue'

// Mock the composable that determines if the app state is empty
const mockUseAppState = vi.fn()
vi.mock('@/composables/useAppState.js', () => ({
  useAppState: mockUseAppState
}))

// Mock session store
const mockUseSessionStore = vi.fn()
vi.mock('@/stores/session.js', () => ({
  useSessionStore: mockUseSessionStore
}))

// Mock tippy for tooltips
vi.mock('tippy.js', () => ({ default: vi.fn(() => ({})) }))

describe('NetworkControls', () => {
  let pinia
  let mockSessionStoreInstance

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    // Setup mock return values
    mockSessionStoreInstance = {
      filter: {
        hasActiveFilters: vi.fn(() => false)
      }
    }

    mockUseSessionStore.mockReturnValue(mockSessionStoreInstance)
  })

  const getComponentStubs = () => ({
    'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
    'v-btn-toggle': { template: '<div class="v-btn-toggle"><slot></slot></div>' },
    'v-menu': { template: '<div class="v-menu"><slot></slot></div>' },
    'v-list': { template: '<div class="v-list"><slot></slot></div>' },
    'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
    'v-list-item-title': { template: '<div class="v-list-item-title"><slot></slot></div>' },
    'v-checkbox': { template: '<input type="checkbox" class="v-checkbox">' },
    'v-slider': { template: '<input type="range" class="v-slider">' },
    CompactButton: { template: '<button class="compact-button"><slot></slot></button>' }
  })

  describe('Visibility based on app state', () => {
    it('shows controls when app state is not empty', () => {
      mockUseAppState.mockReturnValue({
        isEmpty: false
      })

      const wrapper = mount(NetworkControls, {
        global: {
          plugins: [pinia],
          stubs: getComponentStubs()
        }
      })

      const controlsContainer = wrapper.find('.controls-footer-right')
      expect(controlsContainer.exists()).toBe(true)
      expect(controlsContainer.isVisible()).toBe(true)
    })

    it('hides controls when app state is empty', () => {
      mockUseAppState.mockReturnValue({
        isEmpty: true
      })

      const wrapper = mount(NetworkControls, {
        global: {
          plugins: [pinia],
          stubs: getComponentStubs()
        }
      })

      const controlsContainer = wrapper.find('.controls-footer-right')
      expect(controlsContainer.exists()).toBe(true)

      // Vue's v-show directive sets style="display: none;" when condition is false
      expect(controlsContainer.attributes('style')).toBe('display: none;')
    })

    it('integrates properly with real stores when empty', async () => {
      // This test uses real stores instead of mocks to test the actual behavior
      vi.unmock('@/composables/useAppState.js')
      vi.unmock('@/stores/session.js')

      // Import real stores and composables
      const { useSessionStore } = await import('@/stores/session.js')
      const { useQueueStore } = await import('@/stores/queue.js')

      // Initialize stores with empty state 
      const sessionStore = useSessionStore()
      const queueStore = useQueueStore()
      
      // Clear all data to ensure empty state
      sessionStore.selectedPublications = []
      sessionStore.excludedPublicationsDois = []
      queueStore.selectedQueue = []
      queueStore.excludedQueue = []

      const wrapper = mount(NetworkControls, {
        global: {
          plugins: [pinia],
          stubs: getComponentStubs()
        }
      })

      await wrapper.vm.$nextTick()
      
      const controlsContainer = wrapper.find('.controls-footer-right')
      expect(controlsContainer.exists()).toBe(true)
      
      // With real stores, the component should hide when app state is actually empty
      expect(controlsContainer.attributes('style')).toBe('display: none;')
    })

    it('contains expected zoom controls', () => {
      mockUseAppState.mockReturnValue({
        isEmpty: false
      })

      const wrapper = mount(NetworkControls, {
        global: {
          plugins: [pinia],
          stubs: getComponentStubs()
        }
      })

      // Should contain zoom in, zoom out, and reset buttons (3 total)
      const compactButtons = wrapper.findAll('.compact-button')
      expect(compactButtons.length).toBeGreaterThanOrEqual(3) // at least zoom in, zoom out, reset
    })

    it('contains node type toggle buttons', () => {
      mockUseAppState.mockReturnValue({
        isEmpty: false
      })

      const wrapper = mount(NetworkControls, {
        global: {
          plugins: [pinia],
          stubs: getComponentStubs()
        }
      })

      const btnToggle = wrapper.find('.v-btn-toggle')
      expect(btnToggle.exists()).toBe(true)

      const toggleButtons = btnToggle.findAll('button')
      expect(toggleButtons).toHaveLength(4) // selected, suggested, keyword, author
    })

    it('contains settings menu', () => {
      mockUseAppState.mockReturnValue({
        isEmpty: false
      })

      const wrapper = mount(NetworkControls, {
        global: {
          plugins: [pinia],
          stubs: getComponentStubs()
        }
      })

      const menu = wrapper.find('.v-menu')
      expect(menu.exists()).toBe(true)
    })
  })

  describe('Event emissions', () => {
    beforeEach(() => {
      mockUseAppState.mockReturnValue({
        isEmpty: false
      })
    })

    it('emits zoom event when zoom buttons are clicked', async () => {
      const wrapper = mount(NetworkControls, {
        global: {
          plugins: [pinia],
          stubs: getComponentStubs()
        }
      })

      const compactButtons = wrapper.findAll('.compact-button')
      const zoomInButton = compactButtons[0]
      const zoomOutButton = compactButtons[1]

      await zoomInButton.trigger('click')
      expect(wrapper.emitted().zoom).toBeTruthy()
      expect(wrapper.emitted().zoom[0]).toEqual([1.2])

      await zoomOutButton.trigger('click')
      expect(wrapper.emitted().zoom[1]).toEqual([0.8])
    })

    it('emits reset event when reset button is clicked', async () => {
      const wrapper = mount(NetworkControls, {
        global: {
          plugins: [pinia],
          stubs: getComponentStubs()
        }
      })

      const compactButtons = wrapper.findAll('.compact-button')
      const resetButton = compactButtons[2] // third button is reset
      await resetButton.trigger('click')

      expect(wrapper.emitted().reset).toBeTruthy()
    })

    it('emits plot event when node visibility is toggled', async () => {
      const wrapper = mount(NetworkControls, {
        global: {
          plugins: [pinia],
          stubs: getComponentStubs()
        }
      })

      const btnToggle = wrapper.find('.v-btn-toggle')
      await btnToggle.trigger('click')

      expect(wrapper.emitted().plot).toBeTruthy()
      expect(wrapper.emitted().plot[0]).toEqual([true])
    })
  })
})