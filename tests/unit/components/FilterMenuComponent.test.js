import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FilterMenuComponent from '@/components/FilterMenuComponent.vue'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'

// Mock stores and external dependencies
vi.mock('@/stores/session.js')
vi.mock('@/stores/interface.js')
vi.mock('@/lib/Cache.js', () => ({
  clearCache: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  keys: vi.fn(() => Promise.resolve([]))
}))
vi.mock('@/lib/Util.js', () => ({
  scrollToTargetAdjusted: vi.fn(),
  shuffle: vi.fn((arr) => arr),
  saveAsFile: vi.fn()
}))
vi.mock('@/core/Publication.js', () => ({
  default: {
    TAGS: [
      { name: 'Research', value: 'research' },
      { name: 'Review', value: 'review' }
    ]
  }
}))

describe('FilterMenuComponent', () => {
  let wrapper
  let mockSessionStore
  let mockInterfaceStore

  beforeEach(async () => {
    setActivePinia(createPinia())

    // Simplified inline store mocks
    mockSessionStore = {
      isEmpty: false,
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
      getSelectedPublicationByDoi: vi.fn(() => ({
        title: 'Test Publication',
        authorShort: 'Author',
        year: 2023
      }))
    }

    mockInterfaceStore = {
      isMobile: false,
      isFilterMenuOpen: false,
      openFilterMenu: vi.fn(() => {
        mockInterfaceStore.isFilterMenuOpen = !mockInterfaceStore.isFilterMenuOpen
        return mockInterfaceStore.isFilterMenuOpen
      }),
      closeFilterMenu: vi.fn(() => {
        mockInterfaceStore.isFilterMenuOpen = false
      }),
      setFilterMenuState: vi.fn()
    }

    vi.mocked(useSessionStore).mockReturnValue(mockSessionStore)
    vi.mocked(useInterfaceStore).mockReturnValue(mockInterfaceStore)
  })

  describe('Core Functionality', () => {
    it('renders filter menu when session has data', () => {
      wrapper = mount(FilterMenuComponent)

      const menu = wrapper.find('.v-menu')
      expect(menu.exists()).toBe(true)
    })

    it('hides filter menu when session is empty', () => {
      mockSessionStore.isEmpty = true
      wrapper = mount(FilterMenuComponent)

      const button = wrapper.find('.filter-button')
      expect(button.exists()).toBe(false)
    })

    it('enables filters automatically when user interacts with menu', () => {
      mockSessionStore.filter.isActive = false
      wrapper = mount(FilterMenuComponent)

      wrapper.vm.handleMenuToggle(true) // Opening menu

      expect(mockSessionStore.filter.isActive).toBe(true)
    })
  })

  describe('Filter Summary Display', () => {
    it('shows active filter details in summary', () => {
      mockSessionStore.filter.string = 'machine learning'
      mockSessionStore.filter.yearStart = '2020'
      mockSessionStore.filter.tag = 'research'
      mockSessionStore.filter.hasActiveFilters.mockReturnValue(true)

      wrapper = mount(FilterMenuComponent)

      const summary = wrapper.vm.filterSummaryHtml
      expect(summary).toContain('text: "machine learning"')
      expect(summary).toContain('year: 2020')
      expect(summary).toContain('tag: Research')
    })

    it('shows empty summary when no filters active', () => {
      wrapper = mount(FilterMenuComponent)

      const summary = wrapper.vm.filterSummaryHtml
      expect(summary).toBe('')
    })

    it('indicates when filters are disabled', () => {
      mockSessionStore.filter.string = 'test'
      mockSessionStore.filter.isActive = false

      wrapper = mount(FilterMenuComponent)

      expect(wrapper.vm.displayText).toBe('[FILTERS OFF]')
    })
  })

  describe('DOI Filter Management', () => {
    it('removes DOI when user closes chip', () => {
      mockSessionStore.filter.dois = ['10.1234/test']
      wrapper = mount(FilterMenuComponent)

      wrapper.vm.removeDoi('10.1234/test')
      expect(mockSessionStore.filter.removeDoi).toHaveBeenCalledWith('10.1234/test')
    })

    it('shows publication details for DOI chips', () => {
      mockSessionStore.filter.dois = ['10.1234/test']
      wrapper = mount(FilterMenuComponent)

      // Component should display publication info for DOI chips
      expect(mockSessionStore.getSelectedPublicationByDoi).toHaveBeenCalledWith('10.1234/test')
    })
  })

  describe('Visual Feedback', () => {
    it('uses primary color when filtering only selected publications', () => {
      mockSessionStore.filter.hasActiveFilters.mockReturnValue(true)
      mockSessionStore.filter.applyToSelected = true
      mockSessionStore.filter.applyToSuggested = false
      wrapper = mount(FilterMenuComponent)

      expect(wrapper.vm.buttonColor).toBe(
        'hsl(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l))'
      )
    })

    it('uses info color when filtering only suggested publications', () => {
      mockSessionStore.filter.hasActiveFilters.mockReturnValue(true)
      mockSessionStore.filter.applyToSelected = false
      mockSessionStore.filter.applyToSuggested = true
      wrapper = mount(FilterMenuComponent)

      expect(wrapper.vm.buttonColor).toBe(
        'hsl(var(--bulma-info-h), var(--bulma-info-s), var(--bulma-info-l))'
      )
    })

    it('uses default color when filtering both publication types', () => {
      mockSessionStore.filter.hasActiveFilters.mockReturnValue(true)
      mockSessionStore.filter.applyToSelected = true
      mockSessionStore.filter.applyToSuggested = true
      wrapper = mount(FilterMenuComponent)

      expect(wrapper.vm.buttonColor).toBe('default')
    })

    it('uses grey color when no filters are active', () => {
      mockSessionStore.filter.hasActiveFilters.mockReturnValue(false)
      wrapper = mount(FilterMenuComponent)

      expect(wrapper.vm.buttonColor).toBe('grey-darken-1')
    })
  })

  describe('Menu Toggle Behavior (Issue #550 Fix)', () => {
    it('should activate filters when menu is opened', () => {
      mockSessionStore.filter.isActive = false
      wrapper = mount(FilterMenuComponent)

      wrapper.vm.handleMenuToggle(true) // Opening menu

      expect(mockSessionStore.filter.isActive).toBe(true)
    })

    it('should NOT activate filters when menu is closed', () => {
      mockSessionStore.filter.isActive = false
      wrapper = mount(FilterMenuComponent)

      wrapper.vm.handleMenuToggle(false) // Closing menu

      // Filter should remain inactive when closing the menu
      expect(mockSessionStore.filter.isActive).toBe(false)
    })
  })

  describe('Year Range Display', () => {
    it('formats year ranges with en dash', () => {
      const testCases = [
        { yearStart: '2020', yearEnd: '', expected: 'year: 2020–' },
        { yearStart: '', yearEnd: '2025', expected: 'year: –2025' },
        { yearStart: '2020', yearEnd: '2025', expected: 'year: 2020–2025' }
      ]

      testCases.forEach(({ yearStart, yearEnd, expected }) => {
        mockSessionStore.filter.yearStart = yearStart
        mockSessionStore.filter.yearEnd = yearEnd
        mockSessionStore.filter.isActive = true
        wrapper = mount(FilterMenuComponent)

        expect(wrapper.vm.filterSummaryHtml).toContain(expected)
      })
    })
  })
})
