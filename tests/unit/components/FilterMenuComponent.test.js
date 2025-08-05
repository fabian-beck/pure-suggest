import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FilterMenuComponent from '@/components/FilterMenuComponent.vue'
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

// Mock Publication
vi.mock('@/Publication.js', () => ({
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

  beforeEach(() => {
    setActivePinia(createPinia())
    
    mockSessionStore = {
      isEmpty: false,
      filter: {
        string: '',
        yearStart: '',
        yearEnd: '',
        tag: '',
        dois: [],
        isActive: true,
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
      isMobile: false
    }

    vi.mocked(useSessionStore).mockReturnValue(mockSessionStore)
    vi.mocked(useInterfaceStore).mockReturnValue(mockInterfaceStore)
  })

  it('should render filter menu button when session is not empty', () => {
    wrapper = mount(FilterMenuComponent)
    
    const button = wrapper.find('.filter-button')
    expect(button.exists()).toBe(true)
  })

  it('should not render when session is empty', () => {
    mockSessionStore.isEmpty = true
    wrapper = mount(FilterMenuComponent)
    
    const button = wrapper.find('.filter-button')
    expect(button.exists()).toBe(false)
  })

  it('should show active filter summary when filters are set', () => {
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

  it('should show default text when no filters are active', () => {
    wrapper = mount(FilterMenuComponent)
    
    const summary = wrapper.vm.filterSummaryHtml
    expect(summary).toBe('')
  })

  it('should call removeDoi when doi chip is closed', () => {
    mockSessionStore.filter.dois = ['10.1234/test']
    wrapper = mount(FilterMenuComponent)
    
    wrapper.vm.removeDoi('10.1234/test')
    expect(mockSessionStore.filter.removeDoi).toHaveBeenCalledWith('10.1234/test')
  })

  it('should show [Filters off] when filters are inactive but have values', () => {
    mockSessionStore.filter.string = 'test'
    mockSessionStore.filter.isActive = false
    
    wrapper = mount(FilterMenuComponent)
    
    expect(wrapper.vm.displayText).toBe('[Filters off]')
  })

  it('should automatically enable filters when button is clicked', () => {
    mockSessionStore.filter.isActive = false
    wrapper = mount(FilterMenuComponent)
    
    wrapper.vm.handleMenuClick()
    
    expect(mockSessionStore.filter.isActive).toBe(true)
  })
})