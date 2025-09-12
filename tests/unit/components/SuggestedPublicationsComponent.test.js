import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SuggestedPublicationsComponent from '@/components/SuggestedPublicationsComponent.vue'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { commonComponentStubs } from '../../helpers/testUtils.js'

describe('SuggestedPublicationsComponent', () => {
  let pinia
  let sessionStore
  let interfaceStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    interfaceStore = useInterfaceStore()
    
    // Set up default store state
    interfaceStore.isMobile = false
    
    // Set up default session store state
    sessionStore.suggestion = null
    sessionStore.selectedPublications = []
    sessionStore.excludedPublicationsDois = []
  })


  it('shows suggestion count when suggestions are available', () => {
    sessionStore.suggestion = {
      totalSuggestions: 1000,
      publications: [
        { doi: 'test-doi-1', title: 'Test Publication 1' },
        { doi: 'test-doi-2', title: 'Test Publication 2' }
      ]
    }

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          ...commonComponentStubs,
          'v-badge': { 
            template: '<div class="v-badge" :content="content"><slot></slot></div>',
            props: ['content', 'color', 'offset-y', 'offset-x', 'value', 'transition']
          },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('of')
    expect(wrapper.text()).toContain('1,000')
  })

  it('shows load more button when suggestions are available', () => {
    sessionStore.suggestion = {
      totalSuggestions: 1000,
      publications: [
        { doi: 'test-doi-1', title: 'Test Publication 1' }
      ]
    }

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        plugins: [pinia],
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

  it('shows settings button when suggestions are available', () => {
    sessionStore.suggestion = {
      totalSuggestions: 1,
      publications: [
        { doi: 'test-doi-1', title: 'Test Publication 1' }
      ]
    }

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-badge': { template: '<div class="v-badge"><slot></slot></div>' },
          'CompactButton': { 
            template: '<button class="compact-button"><slot></slot></button>',
          },
          'tippy': { template: '<div class="tippy"><slot></slot></div>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    const settingsBtn = wrapper.find('.compact-button')
    expect(settingsBtn.exists()).toBe(true)
    // The settings button should always be enabled (no disabled attribute)
    expect(settingsBtn.attributes('disabled')).toBeUndefined()
  })

  it('opens settings dialog when settings button is clicked', async () => {
    sessionStore.suggestion = {
      totalSuggestions: 1000,
      publications: [
        { doi: 'test-doi-1', title: 'Test Publication 1' }
      ]
    }

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-badge': { template: '<div class="v-badge"><slot></slot></div>' },
          'CompactButton': { 
            template: '<button class="compact-button" @click="$emit(\'click\')"><slot></slot></button>',
            emits: ['click']
          },
          'tippy': { template: '<div class="tippy"><slot></slot></div>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    expect(interfaceStore.isSuggestionsSettingsDialogShown).toBe(false)
    
    const settingsBtn = wrapper.find('.compact-button')
    await settingsBtn.trigger('click')
    
    expect(interfaceStore.isSuggestionsSettingsDialogShown).toBe(true)
  })

  it('renders PublicationListComponent with correct props', () => {
    const mockPublications = [{ doi: 'test-doi', title: 'Test Publication' }]
    sessionStore.suggestion = {
      publications: mockPublications,
      totalSuggestions: 100
    }

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        plugins: [pinia],
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
    sessionStore.suggestion = null

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        plugins: [pinia],
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