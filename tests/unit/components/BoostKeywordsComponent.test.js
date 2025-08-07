import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BoostKeywordsComponent from '@/components/BoostKeywordsComponent.vue'

// Mock stores
const mockSessionStore = {
  isEmpty: false,
  boostKeywordString: 'test, example',
  isBoost: true,
  setBoostKeywordString: vi.fn(),
  updateScores: vi.fn()
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

describe('BoostKeywordsComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when sessionStore is empty', () => {
    mockSessionStore.isEmpty = true

    const wrapper = mount(BoostKeywordsComponent, {
      global: {
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
    mockSessionStore.isEmpty = false

    const wrapper = mount(BoostKeywordsComponent, {
      global: {
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
    mockSessionStore.boostKeywordString = 'word1, word2|alt, word3'
    mockSessionStore.isEmpty = false

    const wrapper = mount(BoostKeywordsComponent, {
      global: {
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
    mockSessionStore.boostKeywordString = ''
    mockSessionStore.isEmpty = false

    const wrapper = mount(BoostKeywordsComponent, {
      global: {
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
    mockInterfaceStore.isMobile = true
    mockSessionStore.isEmpty = false

    const wrapper = mount(BoostKeywordsComponent, {
      global: {
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