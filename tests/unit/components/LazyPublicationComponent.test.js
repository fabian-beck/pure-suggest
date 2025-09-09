import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LazyPublicationComponent from '@/components/LazyPublicationComponent.vue'

// Mock PublicationComponent
vi.mock('@/components/PublicationComponent.vue', () => ({
  default: {
    name: 'PublicationComponent',
    props: ['publication', 'publicationType'],
    template: '<li class="publication-component" :id="publication.doi">{{ publication.doi }}</li>'
  }
}))

describe('LazyPublicationComponent - Mobile Behavior', () => {
  let mockPublication

  beforeEach(() => {
    mockPublication = {
      doi: '10.1234/test-paper',
      isActive: false,
      isSelected: false,
      isLinkedToActive: false
    }

    // Mock IntersectionObserver to be available in tests
    global.IntersectionObserver = vi.fn((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }))
  })

  describe('lazy loading behavior', () => {
    it('should load immediately on mobile (isMobile=true)', () => {
      const wrapper = mount(LazyPublicationComponent, {
        props: {
          publication: mockPublication,
          isMobile: true
        }
      })

      // Should render PublicationComponent immediately (not skeleton)
      expect(wrapper.find('.publication-skeleton').exists()).toBe(false)
      expect(wrapper.find('.publication-component').exists()).toBe(true)
    })

    it('should use lazy loading on desktop (isMobile=false)', () => {
      const wrapper = mount(LazyPublicationComponent, {
        props: {
          publication: mockPublication,
          isMobile: false
        }
      })

      // Should render skeleton initially (lazy loading active)
      expect(wrapper.find('.publication-skeleton').exists()).toBe(true)
      expect(wrapper.find('.publication-component').exists()).toBe(false)
    })

    it('should load immediately when publication is active, even on desktop', () => {
      const activePublication = {
        ...mockPublication,
        isActive: true
      }

      const wrapper = mount(LazyPublicationComponent, {
        props: {
          publication: activePublication,
          isMobile: false
        }
      })

      // Should load immediately due to active state
      expect(wrapper.find('.publication-skeleton').exists()).toBe(false)
      expect(wrapper.find('.publication-component').exists()).toBe(true)
    })

    it('should load immediately when publication is selected, even on desktop', () => {
      const selectedPublication = {
        ...mockPublication,
        isSelected: true
      }

      const wrapper = mount(LazyPublicationComponent, {
        props: {
          publication: selectedPublication,
          isMobile: false
        }
      })

      // Should load immediately due to selected state
      expect(wrapper.find('.publication-skeleton').exists()).toBe(false)
      expect(wrapper.find('.publication-component').exists()).toBe(true)
    })

    it('should default to isMobile=false when prop is not provided', () => {
      const wrapper = mount(LazyPublicationComponent, {
        props: {
          publication: mockPublication
          // isMobile prop not provided, should default to false
        }
      })

      // Should use lazy loading (desktop behavior)
      expect(wrapper.find('.publication-skeleton').exists()).toBe(true)
      expect(wrapper.find('.publication-component').exists()).toBe(false)
    })
  })

  describe('mobile and desktop prop handling', () => {
    it('should accept isMobile prop correctly', () => {
      const wrapper = mount(LazyPublicationComponent, {
        props: {
          publication: mockPublication,
          isMobile: true
        }
      })

      expect(wrapper.vm.isMobile).toBe(true)
    })

    it('should have correct prop definition for isMobile', () => {
      const wrapper = mount(LazyPublicationComponent, {
        props: {
          publication: mockPublication,
          isMobile: false
        }
      })

      // Check the prop exists and has correct type
      expect(wrapper.vm.$props).toHaveProperty('isMobile')
      expect(typeof wrapper.vm.isMobile).toBe('boolean')
    })
  })

  describe('no IntersectionObserver fallback', () => {
    it('should load immediately when IntersectionObserver is not available', () => {
      // Remove IntersectionObserver to simulate older browsers
      global.IntersectionObserver = undefined

      const wrapper = mount(LazyPublicationComponent, {
        props: {
          publication: mockPublication,
          isMobile: false // Even on desktop, should load due to no IntersectionObserver
        }
      })

      // Should load immediately due to no IntersectionObserver
      expect(wrapper.find('.publication-skeleton').exists()).toBe(false)
      expect(wrapper.find('.publication-component').exists()).toBe(true)
    })
  })
})