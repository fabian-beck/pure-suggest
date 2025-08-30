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
    }

    vi.mocked(useSessionStore).mockReturnValue(mockSessionStore)
    vi.mocked(useInterfaceStore).mockReturnValue(mockInterfaceStore)
  })

  describe('section headers', () => {
    it.each([
      ['selected', false],  // [publicationType, expectInfoTheme]
      ['suggested', true]
    ])('should show filtered/unfiltered headers for %s publications', (publicationType, expectInfoTheme) => {
      // Mock filter to match first publication only
      mockSessionStore.filter.matches.mockImplementation(pub => pub.doi === '10.1234/pub1')

      wrapper = mount(PublicationListComponent, {
        props: {
          publications: mockPublications,
          showSectionHeaders: true,
          publicationType
        }
      })

      const headers = wrapper.findAll('.section-header-text')
      expect(headers).toHaveLength(2)
      expect(headers[0].text()).toBe('Filtered (1)')
      expect(headers[1].text()).toBe('Other publications (1)')
      
      // Check theme styling
      headers.forEach(header => {
        if (expectInfoTheme) {
          expect(header.classes()).toContain('info-theme')
        } else {
          expect(header.classes()).not.toContain('info-theme')
        }
      })
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



  describe('checkbox-based filtering', () => {
    it.each([
      ['selected', 'applyToSelected'],
      ['suggested', 'applyToSuggested']
    ])('should control header visibility for %s publications via %s flag', (publicationType, filterFlag) => {
      mockSessionStore.filter.matches.mockImplementation(pub => pub.doi === '10.1234/pub1')

      // Test with flag disabled - no headers
      mockSessionStore.filter[filterFlag] = false
      wrapper = mount(PublicationListComponent, {
        props: {
          publications: mockPublications,
          showSectionHeaders: true,
          publicationType
        }
      })
      expect(wrapper.findAll('.section-header-text')).toHaveLength(0)

      // Test with flag enabled - headers shown
      mockSessionStore.filter[filterFlag] = true
      wrapper = mount(PublicationListComponent, {
        props: {
          publications: mockPublications,
          showSectionHeaders: true,
          publicationType
        }
      })
      expect(wrapper.findAll('.section-header-text')).toHaveLength(2)
    })
  })
})