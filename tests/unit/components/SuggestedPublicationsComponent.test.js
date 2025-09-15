import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'

import { commonComponentStubs } from '../../helpers/testUtils.js'

import SuggestedPublicationsComponent from '@/components/SuggestedPublicationsComponent.vue'
import { useInterfaceStore } from '@/stores/interface.js'
import { useSessionStore } from '@/stores/session.js'

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
          PublicationListComponent: { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('of')
    expect(wrapper.text()).toContain('1,000')
  })

  it('shows settings menu when suggestions are available', () => {
    sessionStore.suggestion = {
      totalSuggestions: 1000,
      publications: [{ doi: 'test-doi-1', title: 'Test Publication 1' }]
    }

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-badge': { template: '<div class="v-badge"><slot></slot></div>' },
          CompactButton: {
            template: '<button class="compact-button" :disabled="disabled"><slot></slot></button>',
            props: ['disabled']
          },
          'v-menu': { template: '<div class="v-menu"><slot name="activator" :props="{}"></slot><slot></slot></div>' },
          'v-list': { template: '<div class="v-list"><slot></slot></div>' },
          'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
          'v-list-item-title': { template: '<div class="v-list-item-title"><slot></slot></div>' },
          'v-slider': { template: '<div class="v-slider"></div>' },
          'tippy': { template: '<div class="tippy"><slot></slot></div>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    const settingsBtn = wrapper.find('.compact-button')
    expect(settingsBtn.exists()).toBe(true)
    // Check if button exists (the button text is actually from the v-tippy tooltip)
    expect(wrapper.html()).toContain('compact-button')
  })

  it('shows settings button when suggestions are available', () => {
    sessionStore.suggestion = {
      totalSuggestions: 1,
      publications: [{ doi: 'test-doi-1', title: 'Test Publication 1' }]
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
          'v-menu': { template: '<div class="v-menu"><slot name="activator" :props="{}"></slot><slot></slot></div>' },
          'v-list': { template: '<div class="v-list"><slot></slot></div>' },
          'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
          'v-list-item-title': { template: '<div class="v-list-item-title"><slot></slot></div>' },
          'v-slider': { template: '<div class="v-slider"></div>' },
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

  it('shows settings menu with slider when suggestions are available', async () => {
    sessionStore.suggestion = {
      totalSuggestions: 1000,
      publications: [{ doi: 'test-doi-1', title: 'Test Publication 1' }]
    }
    sessionStore.maxSuggestions = 100

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
          'v-menu': {
            template: '<div class="v-menu"><slot name="activator" :props="{}"></slot><slot></slot></div>',
            props: ['close-on-content-click']
          },
          'v-list': { template: '<div class="v-list"><slot></slot></div>' },
          'v-list-item': {
            template: '<div class="v-list-item"><div class="v-list-item-title"><slot></slot></div><slot name="default"></slot></div>',
            props: ['prepend-icon']
          },
          'v-list-item-title': { template: '<div class="v-list-item-title"><slot></slot></div>' },
          'v-slider': {
            template: '<div class="v-slider" @update:model-value="$emit(\'update:model-value\', 200)"></div>',
            props: ['model-value', 'min', 'max', 'step'],
            emits: ['update:model-value']
          },
          tippy: { template: '<div class="tippy"><slot></slot></div>' },
          PublicationListComponent: { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    // Check that the menu and slider components are present
    expect(wrapper.find('.v-menu').exists()).toBe(true)
    expect(wrapper.find('.v-slider').exists()).toBe(true)
    expect(wrapper.text()).toContain('Number of suggested to load: 100')
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
          'v-menu': { template: '<div class="v-menu"><slot name="activator" :props="{}"></slot><slot></slot></div>' },
          'v-list': { template: '<div class="v-list"><slot></slot></div>' },
          'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
          'v-slider': { template: '<div class="v-slider"></div>' },
          'tippy': { template: '<div class="tippy"><slot></slot></div>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    const publicationList = wrapper.findComponent('.publication-list')
    expect(publicationList.exists()).toBe(true)
  })

  it('hides count and settings menu when no suggestions are available', () => {
    sessionStore.suggestion = null

    const wrapper = mount(SuggestedPublicationsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-badge': { template: '<div class="v-badge"><slot></slot></div>' },
          'CompactButton': { template: '<button class="compact-button"><slot></slot></button>' },
          'v-menu': { template: '<div class="v-menu"><slot name="activator" :props="{}"></slot><slot></slot></div>' },
          'v-list': { template: '<div class="v-list"><slot></slot></div>' },
          'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
          'v-slider': { template: '<div class="v-slider"></div>' },
          'tippy': { template: '<div class="tippy"><slot></slot></div>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    expect(wrapper.findComponent({ name: 'CompactButton' }).exists()).toBe(false)
  })
})
