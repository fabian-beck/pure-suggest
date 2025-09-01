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
vi.mock('@/lib/Cache.js', () => ({
  clearCache: vi.fn()
}))

// Mock utilities
vi.mock('@/lib/Util.js', () => ({
  scrollToTargetAdjusted: vi.fn(),
  shuffle: vi.fn(arr => arr),
  saveAsFile: vi.fn()
}))

// Mock Publication
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

  it('should render filter menu when session is not empty', () => {
    wrapper = mount(FilterMenuComponent)
    
    // Check that the v-menu component is rendered
    const menu = wrapper.find('.v-menu')
    expect(menu.exists()).toBe(true)
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

  it('should show [FILTERS OFF] when filters are inactive but have values', () => {
    mockSessionStore.filter.string = 'test'
    mockSessionStore.filter.isActive = false
    
    wrapper = mount(FilterMenuComponent)
    
    expect(wrapper.vm.displayText).toBe('[FILTERS OFF]')
  })

  it('should automatically enable filters when button is clicked', () => {
    mockSessionStore.filter.isActive = false
    wrapper = mount(FilterMenuComponent)
    
    wrapper.vm.handleMenuClick()
    
    expect(mockSessionStore.filter.isActive).toBe(true)
  })

  it('should remove DOI chip when Enter key is pressed', () => {
    mockSessionStore.filter.dois = ['10.1234/test']
    wrapper = mount(FilterMenuComponent)
    
    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    event.preventDefault = vi.fn()
    event.stopPropagation = vi.fn()
    
    wrapper.vm.handleChipKeydown(event, '10.1234/test')
    
    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.stopPropagation).toHaveBeenCalled()
    expect(mockSessionStore.filter.removeDoi).toHaveBeenCalledWith('10.1234/test')
  })

  it('should remove DOI chip when Space key is pressed', () => {
    mockSessionStore.filter.dois = ['10.1234/test']
    wrapper = mount(FilterMenuComponent)
    
    const event = new KeyboardEvent('keydown', { key: ' ' })
    event.preventDefault = vi.fn()
    event.stopPropagation = vi.fn()
    
    wrapper.vm.handleChipKeydown(event, '10.1234/test')
    
    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.stopPropagation).toHaveBeenCalled()
    expect(mockSessionStore.filter.removeDoi).toHaveBeenCalledWith('10.1234/test')
  })

  it('should not remove DOI chip when other keys are pressed', () => {
    mockSessionStore.filter.dois = ['10.1234/test']
    wrapper = mount(FilterMenuComponent)
    
    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    event.preventDefault = vi.fn()
    event.stopPropagation = vi.fn()
    
    wrapper.vm.handleChipKeydown(event, '10.1234/test')
    
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(event.stopPropagation).not.toHaveBeenCalled()
    expect(mockSessionStore.filter.removeDoi).not.toHaveBeenCalled()
  })

  it('should toggle filter switch when Enter key is pressed', () => {
    mockSessionStore.filter.isActive = true
    wrapper = mount(FilterMenuComponent)
    
    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    event.preventDefault = vi.fn()
    event.stopPropagation = vi.fn()
    
    wrapper.vm.handleSwitchKeydown(event)
    
    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.stopPropagation).toHaveBeenCalled()
    expect(mockSessionStore.filter.isActive).toBe(false)
  })

  it('should toggle filter switch when Space key is pressed', () => {
    mockSessionStore.filter.isActive = false
    wrapper = mount(FilterMenuComponent)
    
    const event = new KeyboardEvent('keydown', { key: ' ' })
    event.preventDefault = vi.fn()
    event.stopPropagation = vi.fn()
    
    wrapper.vm.handleSwitchKeydown(event)
    
    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.stopPropagation).toHaveBeenCalled()
    expect(mockSessionStore.filter.isActive).toBe(true)
  })

  it('should not toggle filter switch when other keys are pressed', () => {
    const initialState = true
    mockSessionStore.filter.isActive = initialState
    wrapper = mount(FilterMenuComponent)
    
    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    event.preventDefault = vi.fn()
    event.stopPropagation = vi.fn()
    
    wrapper.vm.handleSwitchKeydown(event)
    
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(event.stopPropagation).not.toHaveBeenCalled()
    expect(mockSessionStore.filter.isActive).toBe(initialState)
  })


  it('should show year range with en dash for start year only', () => {
    mockSessionStore.filter.yearStart = '2020'
    mockSessionStore.filter.yearEnd = ''
    mockSessionStore.filter.isActive = true
    wrapper = mount(FilterMenuComponent)
    
    expect(wrapper.vm.filterSummaryHtml).toContain('year: 2020–')
  })

  it('should show year range with en dash for end year only', () => {
    mockSessionStore.filter.yearStart = ''
    mockSessionStore.filter.yearEnd = '2025'
    mockSessionStore.filter.isActive = true
    wrapper = mount(FilterMenuComponent)
    
    expect(wrapper.vm.filterSummaryHtml).toContain('year: –2025')
  })

  it('should show year range with en dash for both start and end years', () => {
    mockSessionStore.filter.yearStart = '2020'
    mockSessionStore.filter.yearEnd = '2025'
    mockSessionStore.filter.isActive = true
    wrapper = mount(FilterMenuComponent)
    
    expect(wrapper.vm.filterSummaryHtml).toContain('year: 2020–2025')
  })

  it('should show checkboxes when filters are active', () => {
    mockSessionStore.filter.isActive = true
    wrapper = mount(FilterMenuComponent)
    
    const checkboxes = wrapper.findAll('.v-checkbox')
    expect(checkboxes).toHaveLength(2)
  })

  it('should show checkboxes as disabled when filters are inactive', () => {
    mockSessionStore.filter.isActive = false
    wrapper = mount(FilterMenuComponent)
    
    const checkboxes = wrapper.findAll('.v-checkbox')
    expect(checkboxes).toHaveLength(2)
    // Checkboxes should be disabled when filters are inactive
    expect(checkboxes[0].attributes('disabled')).toBeDefined()
    expect(checkboxes[1].attributes('disabled')).toBeDefined()
  })

  it('should return primary color when only selected is checked', () => {
    mockSessionStore.filter.hasActiveFilters.mockReturnValue(true)
    mockSessionStore.filter.applyToSelected = true
    mockSessionStore.filter.applyToSuggested = false
    wrapper = mount(FilterMenuComponent)
    
    expect(wrapper.vm.buttonColor).toBe('hsl(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l))')
  })

  it('should return info color when only suggested is checked', () => {
    mockSessionStore.filter.hasActiveFilters.mockReturnValue(true)
    mockSessionStore.filter.applyToSelected = false
    mockSessionStore.filter.applyToSuggested = true
    wrapper = mount(FilterMenuComponent)
    
    expect(wrapper.vm.buttonColor).toBe('hsl(var(--bulma-info-h), var(--bulma-info-s), var(--bulma-info-l))')
  })

  it('should return default color when both are checked', () => {
    mockSessionStore.filter.hasActiveFilters.mockReturnValue(true)
    mockSessionStore.filter.applyToSelected = true
    mockSessionStore.filter.applyToSuggested = true
    wrapper = mount(FilterMenuComponent)
    
    expect(wrapper.vm.buttonColor).toBe('default')
  })

  it('should return grey color when no filters are active', () => {
    mockSessionStore.filter.hasActiveFilters.mockReturnValue(false)
    wrapper = mount(FilterMenuComponent)
    
    expect(wrapper.vm.buttonColor).toBe('grey-darken-1')
  })
})