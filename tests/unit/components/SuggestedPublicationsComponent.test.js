import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SuggestedPublicationsComponent from '@/components/SuggestedPublicationsComponent.vue'

// Mock stores
const mockSessionStore = {
  suggestion: null,
  unreadSuggestionsCount: 0,
  suggestedPublicationsFiltered: [],
  suggestedPublications: [],
  loadMoreSuggestions: vi.fn(),
  $onAction: vi.fn()
}

const mockInterfaceStore = {
  isMobile: false
}

// Mock the store imports
vi.mock('@/stores/session.js', () => ({
  useSessionStore: () => mockSessionStore
}))

vi.mock('@/stores/interface.js', () => ({
  useInterfaceStore: () => mockInterfaceStore
}))

describe('SuggestedPublicationsComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionStore.suggestion = null
    mockSessionStore.unreadSuggestionsCount = 0
    mockSessionStore.suggestedPublicationsFiltered = []
    mockSessionStore.suggestedPublications = []
  })

  it('renders the suggested publications header', () => {
    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-badge': { template: '<div class="v-badge"><slot></slot></div>' },
          'CompactButton': { template: '<button class="compact-button"><slot></slot></button>' },
          'tippy': { template: '<div class="tippy"><slot></slot></div>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('Suggested')
  })

  it('shows suggestion count when suggestions are available', () => {
    mockSessionStore.suggestion = {
      totalSuggestions: 1000
    }
    mockSessionStore.suggestedPublicationsFiltered = [
      { doi: 'test-doi-1', title: 'Test Publication 1' },
      { doi: 'test-doi-2', title: 'Test Publication 2' }
    ]
    mockSessionStore.unreadSuggestionsCount = 5

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-badge': { 
            template: '<div class="v-badge" :content="content"><slot></slot></div>',
            props: ['content', 'color', 'offset-y', 'offset-x', 'value', 'transition']
          },
          'CompactButton': { template: '<button class="compact-button"><slot></slot></button>' },
          'tippy': { template: '<div class="tippy"><slot></slot></div>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('of')
    expect(wrapper.text()).toContain('1,000')
  })

  it('shows load more button when suggestions are available', () => {
    mockSessionStore.suggestion = {
      totalSuggestions: 1000
    }
    mockSessionStore.suggestedPublications = [
      { doi: 'test-doi-1', title: 'Test Publication 1' }
    ]

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-badge': { template: '<div class="v-badge"><slot></slot></div>' },
          'CompactButton': { 
            template: '<button class="compact-button" :disabled="disabled"><slot></slot></button>',
            props: ['disabled']
          },
          'tippy': { template: '<div class="tippy"><slot></slot></div>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    const loadMoreBtn = wrapper.find('.compact-button')
    expect(loadMoreBtn.exists()).toBe(true)
    // Check if button exists (the button text is actually from the v-tippy tooltip)
    expect(wrapper.html()).toContain('compact-button')
  })

  it('disables load more button when all suggestions are loaded', () => {
    mockSessionStore.suggestion = {
      totalSuggestions: 1
    }
    mockSessionStore.suggestedPublications = [
      { doi: 'test-doi-1', title: 'Test Publication 1' }
    ]

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-badge': { template: '<div class="v-badge"><slot></slot></div>' },
          'CompactButton': { 
            template: '<button class="compact-button" :disabled="disabled"><slot></slot></button>',
            props: ['disabled']
          },
          'tippy': { template: '<div class="tippy"><slot></slot></div>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    const loadMoreBtn = wrapper.find('.compact-button')
    expect(loadMoreBtn.exists()).toBe(true)
    // The button should be disabled when all suggestions are loaded
    expect(loadMoreBtn.attributes('disabled')).toBeDefined()
  })

  it('calls loadMoreSuggestions when load more button is clicked', async () => {
    mockSessionStore.suggestion = {
      totalSuggestions: 1000
    }
    mockSessionStore.suggestedPublications = [
      { doi: 'test-doi-1', title: 'Test Publication 1' }
    ]

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-badge': { template: '<div class="v-badge"><slot></slot></div>' },
          'CompactButton': { 
            template: '<button class="compact-button" @click="$emit(\'click\')" :disabled="disabled"><slot></slot></button>',
            emits: ['click'],
            props: ['disabled']
          },
          'tippy': { template: '<div class="tippy"><slot></slot></div>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    const loadMoreBtn = wrapper.find('.compact-button')
    await loadMoreBtn.trigger('click')
    expect(mockSessionStore.loadMoreSuggestions).toHaveBeenCalled()
  })

  it('renders PublicationListComponent with correct props', () => {
    const mockPublications = [{ doi: 'test-doi', title: 'Test Publication' }]
    mockSessionStore.suggestedPublicationsFiltered = mockPublications

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-badge': { template: '<div class="v-badge"><slot></slot></div>' },
          'CompactButton': { template: '<button class="compact-button"><slot></slot></button>' },
          'tippy': { template: '<div class="tippy"><slot></slot></div>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    const publicationList = wrapper.findComponent('.publication-list')
    expect(publicationList.exists()).toBe(true)
  })

  it('hides count and load more when no suggestions are available', () => {
    mockSessionStore.suggestion = null

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-badge': { template: '<div class="v-badge"><slot></slot></div>' },
          'CompactButton': { template: '<button class="compact-button"><slot></slot></button>' },
          'tippy': { template: '<div class="tippy"><slot></slot></div>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    expect(wrapper.findComponent({ name: 'CompactButton' }).exists()).toBe(false)
  })
})