import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PublicationListComponent from '@/components/PublicationListComponent.vue'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'

// Mock the stores
vi.mock('@/stores/session.js')
vi.mock('@/stores/interface.js')

// Mock the Cache module to avoid indexedDB issues
vi.mock('@/Cache.js', () => ({
  clearCache: vi.fn()
}))

// Mock utilities
vi.mock('@/Util.js', () => ({
  scrollToTargetAdjusted: vi.fn(),
  shuffle: vi.fn(arr => arr),
  saveAsFile: vi.fn()
}))

// Mock LazyPublicationComponent
vi.mock('@/components/LazyPublicationComponent.vue', () => ({
  default: {
    name: 'LazyPublicationComponent',
    props: ['publication'],
    template: '<div class="mock-publication">{{ publication.doi }}</div>'
  }
}))

describe('PublicationListComponent - Section Headers', () => {
  let wrapper
  let mockSessionStore
  let mockInterfaceStore
  let mockPublications

  beforeEach(() => {
    setActivePinia(createPinia())
    
    mockPublications = [
      {
        doi: '10.1234/pub1',
        score: 10,
        getMetaString: () => 'Machine Learning Paper'
      },
      {
        doi: '10.1234/pub2', 
        score: 5,
        getMetaString: () => 'Deep Learning Research'
      }
    ]

    mockSessionStore = {
      filter: {
        matches: vi.fn(),
        hasActiveFilters: vi.fn(() => true),
        applyToSelected: true,
        applyToSuggested: true
      },
      selectedPublicationsFilteredCount: 1,
      selectedPublicationsNonFilteredCount: 1,
      suggestedPublicationsFilteredCount: 1,
      suggestedPublicationsNonFilteredCount: 1
    }

    mockInterfaceStore = {
      isFilterPanelShown: true
    }

    vi.mocked(useSessionStore).mockReturnValue(mockSessionStore)
    vi.mocked(useInterfaceStore).mockReturnValue(mockInterfaceStore)
  })

  describe('section headers for selected publications', () => {
    it('should show simplified headers for selected publications', () => {
      // Mock filter to match first publication only
      mockSessionStore.filter.matches.mockImplementation(pub => pub.doi === '10.1234/pub1')

      wrapper = mount(PublicationListComponent, {
        props: {
          publications: mockPublications,
          showSectionHeaders: true,
          publicationType: 'selected'
        }
      })

      const headers = wrapper.findAll('.section-header-text')
      expect(headers).toHaveLength(2)
      expect(headers[0].text()).toBe('Filtered publications (1)')
      expect(headers[1].text()).toBe('Other publications (1)')
    })
  })

  describe('section headers for suggested publications', () => {
    it('should show simplified headers for suggested publications', () => {
      // Mock filter to match first publication only
      mockSessionStore.filter.matches.mockImplementation(pub => pub.doi === '10.1234/pub1')

      wrapper = mount(PublicationListComponent, {
        props: {
          publications: mockPublications,
          showSectionHeaders: true,
          publicationType: 'suggested'
        }
      })

      const headers = wrapper.findAll('.section-header-text')
      expect(headers).toHaveLength(2)
      expect(headers[0].text()).toBe('Filtered publications (1)')
      expect(headers[1].text()).toBe('Other publications (1)')
    })
  })

  describe('no section headers when filters inactive', () => {
    it('should not show headers when no active filters', () => {
      mockSessionStore.filter.hasActiveFilters.mockReturnValue(false)

      wrapper = mount(PublicationListComponent, {
        props: {
          publications: mockPublications,
          showSectionHeaders: true,
          publicationType: 'selected'
        }
      })

      const headers = wrapper.findAll('.section-header-text')
      expect(headers).toHaveLength(0)
    })
  })

  describe('header styling', () => {
    it('should apply correct CSS classes to section headers for selected publications', () => {
      mockSessionStore.filter.matches.mockImplementation(pub => pub.doi === '10.1234/pub1')

      wrapper = mount(PublicationListComponent, {
        props: {
          publications: mockPublications,
          showSectionHeaders: true,
          publicationType: 'selected'
        }
      })

      const headerContainers = wrapper.findAll('.section-header')
      const headerTexts = wrapper.findAll('.section-header-text')
      
      expect(headerContainers).toHaveLength(2)
      expect(headerTexts).toHaveLength(2)
      
      // Verify CSS classes are applied
      headerContainers.forEach(container => {
        expect(container.classes()).toContain('section-header')
      })
      
      headerTexts.forEach(text => {
        expect(text.classes()).toContain('section-header-text')
        expect(text.classes()).not.toContain('info-theme')
      })
    })

    it('should apply info-theme class for suggested publications', () => {
      mockSessionStore.filter.matches.mockImplementation(pub => pub.doi === '10.1234/pub1')

      wrapper = mount(PublicationListComponent, {
        props: {
          publications: mockPublications,
          showSectionHeaders: true,
          publicationType: 'suggested'
        }
      })

      const headerTexts = wrapper.findAll('.section-header-text')
      
      expect(headerTexts).toHaveLength(2)
      
      headerTexts.forEach(text => {
        expect(text.classes()).toContain('section-header-text')
        expect(text.classes()).toContain('info-theme')
      })
    })
  })

  describe('empty state', () => {
    it('should apply empty-list class when no publications', () => {
      wrapper = mount(PublicationListComponent, {
        props: {
          publications: [],
          showSectionHeaders: false,
          publicationType: 'suggested'
        }
      })

      const list = wrapper.find('.publication-list')
      expect(list.classes()).toContain('empty-list')
    })

    it('should not apply empty-list class when publications exist', () => {
      wrapper = mount(PublicationListComponent, {
        props: {
          publications: mockPublications,
          showSectionHeaders: false,
          publicationType: 'suggested'
        }
      })

      const list = wrapper.find('.publication-list')
      expect(list.classes()).not.toContain('empty-list')
    })
  })

  describe('checkbox-based filtering', () => {
    it('should not show headers for selected publications when applyToSelected is false', () => {
      mockSessionStore.filter.applyToSelected = false
      mockSessionStore.filter.matches.mockImplementation(pub => pub.doi === '10.1234/pub1')

      wrapper = mount(PublicationListComponent, {
        props: {
          publications: mockPublications,
          showSectionHeaders: true,
          publicationType: 'selected'
        }
      })

      const headers = wrapper.findAll('.section-header-text')
      expect(headers).toHaveLength(0)
    })

    it('should not show headers for suggested publications when applyToSuggested is false', () => {
      mockSessionStore.filter.applyToSuggested = false
      mockSessionStore.filter.matches.mockImplementation(pub => pub.doi === '10.1234/pub1')

      wrapper = mount(PublicationListComponent, {
        props: {
          publications: mockPublications,
          showSectionHeaders: true,
          publicationType: 'suggested'
        }
      })

      const headers = wrapper.findAll('.section-header-text')
      expect(headers).toHaveLength(0)
    })

    it('should show headers for selected publications when applyToSelected is true', () => {
      mockSessionStore.filter.applyToSelected = true
      mockSessionStore.filter.matches.mockImplementation(pub => pub.doi === '10.1234/pub1')

      wrapper = mount(PublicationListComponent, {
        props: {
          publications: mockPublications,
          showSectionHeaders: true,
          publicationType: 'selected'
        }
      })

      const headers = wrapper.findAll('.section-header-text')
      expect(headers).toHaveLength(2)
    })
  })
})