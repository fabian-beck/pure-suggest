import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import NetworkControls from '@/components/NetworkControls.vue'

// NetworkControls no longer uses useAppState - visibility is handled by parent container

// Mock session store
vi.mock('@/stores/session.js', () => ({
  useSessionStore: () => ({
    filter: {
      hasActiveFilters: vi.fn(() => false)
    }
  })
}))

// Mock tippy for tooltips
vi.mock('tippy.js', () => ({ default: vi.fn(() => ({})) }))

describe('NetworkControls', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
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

  // Note: Visibility tests removed - NetworkControls no longer handles isEmpty internally.
  // Visibility is now controlled by parent container (NetworkVisComponent) via v-show="!isEmpty"

  describe('Component structure', () => {
    it('contains expected zoom controls', () => {

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