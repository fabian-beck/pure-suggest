import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BoostKeywordsComponent from '@/components/BoostKeywordsComponent.vue'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useQueueStore } from '@/stores/queue.js'

describe('BoostKeywordsComponent', () => {
  let pinia
  let sessionStore
  let interfaceStore
  let queueStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    interfaceStore = useInterfaceStore()
    queueStore = useQueueStore()
    
    // Set up default values
    sessionStore.boostKeywordString = 'test, example'
    sessionStore.isBoost = true
    sessionStore.setBoostKeywordString = vi.fn()
    sessionStore.updateScores = vi.fn()
    interfaceStore.isMobile = false
  })

  it('does not render when sessionStore is empty', () => {
    // Set up empty session state to make isEmpty = true
    sessionStore.selectedPublications = []
    sessionStore.excludedPublicationsDois = []
    queueStore.selectedQueue = []
    queueStore.excludedQueue = []

    const wrapper = mount(BoostKeywordsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-menu': { template: '<div class="v-menu"><slot></slot><div class="activator"><slot name="activator"></slot></div></div>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-sheet': { template: '<div class="v-sheet"><slot></slot></div>' },
          'v-text-field': { template: '<input class="v-text-field" />' },
          'v-checkbox': { template: '<input type="checkbox" class="v-checkbox" />' }
        }
      }
    })

    expect(wrapper.find('.v-menu').exists()).toBe(false)
  })

  it('renders menu when sessionStore is not empty', () => {
    // Set up non-empty session state to make isEmpty = false
    sessionStore.selectedPublications = [{ doi: '10.1000/test' }]

    const wrapper = mount(BoostKeywordsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-menu': { template: '<div class="v-menu"><slot></slot><div class="activator"><slot name="activator"></slot></div></div>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-sheet': { template: '<div class="v-sheet"><slot></slot></div>' },
          'v-text-field': { template: '<input class="v-text-field" />' },
          'v-checkbox': { template: '<input type="checkbox" class="v-checkbox" />' }
        }
      }
    })

    expect(wrapper.find('.v-menu').exists()).toBe(true)
  })

  it('generates correct HTML for boost keyword string', () => {
    sessionStore.boostKeywordString = 'word1, word2|alt, word3'
    sessionStore.selectedPublications = [{ doi: '10.1000/test' }] // Make not empty

    const wrapper = mount(BoostKeywordsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-menu': { template: '<div class="v-menu"><slot></slot></div>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-sheet': { template: '<div class="v-sheet"><slot></slot></div>' },
          'v-text-field': { template: '<input class="v-text-field" />' },
          'v-checkbox': { template: '<input type="checkbox" class="v-checkbox" />' }
        }
      }
    })

    const html = wrapper.vm.boostKeywordStringHtml
    expect(html).toContain("<span class='word'>")
    expect(html).toContain("<span class='alt'>|</span>")
    expect(html).toContain("<span class='comma'>,</span>")
  })

  it('generates empty HTML when boostKeywordString is empty', () => {
    sessionStore.boostKeywordString = ''
    sessionStore.selectedPublications = [{ doi: '10.1000/test' }] // Make not empty

    const wrapper = mount(BoostKeywordsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-menu': true,
          'v-btn': true,
          'v-icon': true,
          'v-sheet': true,
          'v-text-field': true,
          'v-checkbox': true
        }
      }
    })

    expect(wrapper.vm.boostKeywordStringHtml).toBe('')
  })

  it('has correct mobile state', () => {
    interfaceStore.isMobile = true
    sessionStore.selectedPublications = [{ doi: '10.1000/test' }] // Make not empty

    const wrapper = mount(BoostKeywordsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-menu': true,
          'v-btn': true,
          'v-icon': true,
          'v-sheet': true,
          'v-text-field': true,
          'v-checkbox': true
        }
      }
    })

    expect(wrapper.vm.interfaceStore.isMobile).toBe(true)
  })
})