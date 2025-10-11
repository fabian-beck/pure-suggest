import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import FilterMenuComponent from '@/components/FilterMenuComponent.vue'
import { useInterfaceStore } from '@/stores/interface.js'
import { useSessionStore } from '@/stores/session.js'

// Mock stores with minimal setup
vi.mock('@/stores/session.js')
vi.mock('@/stores/interface.js')
vi.mock('@/core/Publication.js', () => ({
  default: {
    TAGS: [
      { name: 'Research', value: 'research' },
      { name: 'Review', value: 'review' }
    ]
  }
}))

describe('FilterMenuComponent', () => {
  let mockSessionStore

  const createWrapper = (overrides = {}) => {
    const sessionStoreDefaults = {
      isEmpty: false,
      filter: {
        string: '',
        yearStart: '',
        yearEnd: '',
        tags: [],
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

    mockSessionStore = { ...sessionStoreDefaults, ...overrides }
    vi.mocked(useSessionStore).mockReturnValue(mockSessionStore)
    vi.mocked(useInterfaceStore).mockReturnValue({
      isMobile: false,
      isFilterMenuOpen: false
    })

    return mount(FilterMenuComponent, {
      global: {
        stubs: {
          'v-menu': { template: '<div class="v-menu"><slot></slot></div>' },
          'v-btn': { template: '<button class="filter-button"><slot></slot></button>' }
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Filter Activation Logic', () => {
    it('enables filters when menu is opened', () => {
      const wrapper = createWrapper({
        filter: {
          string: '',
          yearStart: '',
          yearEnd: '',
          tags: [],
          dois: [],
          isActive: false,
          applyToSelected: true,
          applyToSuggested: true,
          hasActiveFilters: vi.fn(() => false),
          removeDoi: vi.fn()
        }
      })

      wrapper.vm.handleMenuToggle(true)

      expect(mockSessionStore.filter.isActive).toBe(true)
    })
  })

  describe('Filter Summary Generation', () => {
    it('generates summary with active filters', () => {
      const filterState = {
        string: 'machine learning',
        yearStart: '2020',
        yearEnd: '',
        tags: ['research'],
        dois: [],
        isActive: true,
        applyToSelected: true,
        applyToSuggested: true,
        hasActiveFilters: vi.fn(() => true),
        removeDoi: vi.fn()
      }
      const wrapper = createWrapper({ filter: filterState })

      const summary = wrapper.vm.filterSummaryHtml
      expect(summary).toContain('text: "machine learning"')
      expect(summary).toContain('year: 2020')
      expect(summary).toContain('tags: Research')
    })

    it('shows disabled state when filters are inactive', () => {
      const filterState = {
        string: 'test',
        yearStart: '',
        yearEnd: '',
        tags: [],
        dois: [],
        isActive: false,
        applyToSelected: true,
        applyToSuggested: true,
        hasActiveFilters: vi.fn(() => false),
        removeDoi: vi.fn()
      }
      const wrapper = createWrapper({ filter: filterState })

      expect(wrapper.vm.displayText).toBe('[FILTERS OFF]')
    })

    it('formats year ranges with en dash', () => {
      const testCases = [
        { yearStart: '2020', yearEnd: '', expected: 'year: 2020–' },
        { yearStart: '', yearEnd: '2025', expected: 'year: –2025' },
        { yearStart: '2020', yearEnd: '2025', expected: 'year: 2020–2025' }
      ]

      testCases.forEach(({ yearStart, yearEnd, expected }) => {
        const filterState = {
          string: '',
          yearStart,
          yearEnd,
          tags: [],
          dois: [],
          isActive: true,
          applyToSelected: true,
          applyToSuggested: true,
          hasActiveFilters: vi.fn(() => true),
          removeDoi: vi.fn()
        }
        const wrapper = createWrapper({ filter: filterState })

        expect(wrapper.vm.filterSummaryHtml).toContain(expected)
      })
    })
  })

  describe('DOI Filter Management', () => {
    it('delegates DOI removal to store', () => {
      const filterState = {
        string: '',
        yearStart: '',
        yearEnd: '',
        tags: [],
        dois: ['10.1234/test'],
        isActive: true,
        applyToSelected: true,
        applyToSuggested: true,
        hasActiveFilters: vi.fn(() => false),
        removeDoi: vi.fn()
      }
      const wrapper = createWrapper({ filter: filterState })

      wrapper.vm.removeDoi('10.1234/test')

      expect(mockSessionStore.filter.removeDoi).toHaveBeenCalledWith('10.1234/test')
    })
  })
})