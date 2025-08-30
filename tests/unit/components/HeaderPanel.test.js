import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HeaderPanel from '@/components/HeaderPanel.vue'

// Mock stores
const mockSessionStore = {
  isEmpty: true,
  selectedPublicationsCount: 0,
  excludedPublicationsCount: 0,
  exportSession: vi.fn(),
  exportAllBibtex: vi.fn(),
  clearSession: vi.fn(),
  clearCache: vi.fn()
}

const mockInterfaceStore = {
  isMobile: false,
  isExcludedModalDialogShown: false,
  isKeyboardControlsModalDialogShown: false,
  isAboutModalDialogShown: false
}

// Mock the store imports
vi.mock('@/stores/session.js', () => ({
  useSessionStore: () => mockSessionStore
}))

vi.mock('@/stores/interface.js', () => ({
  useInterfaceStore: () => mockInterfaceStore
}))

vi.mock('@/composables/useAppState.js', () => ({
  useAppState: () => ({
    isEmpty: mockSessionStore.isEmpty,
    clearSession: mockSessionStore.clearSession,
    clearCache: mockSessionStore.clearCache
  })
}))

// Mock child components
vi.mock('@/components/FilterMenuComponent.vue', () => ({
  default: { template: '<div class="filter-menu">Filter Menu</div>' }
}))

describe('HeaderPanel', () => {
  const mockAppMeta = {
    nameHtml: '<strong>Pure</strong>Suggest',
    subtitle: 'Literature discovery made easy'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionStore.isEmpty = true
    mockSessionStore.selectedPublicationsCount = 0
    mockSessionStore.excludedPublicationsCount = 0
  })

  it('renders the app name and logo', () => {
    const wrapper = mount(HeaderPanel, {
      global: {
        provide: {
          appMeta: mockAppMeta
        },
        stubs: {
          'v-app-bar': { template: '<div class="v-app-bar"><slot></slot></div>' },
          'v-app-bar-title': { template: '<div class="v-app-bar-title"><slot></slot></div>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-menu': { template: '<div class="v-menu"><slot></slot></div>' },
          'v-list': { template: '<div class="v-list"><slot></slot></div>' },
          'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
          'BoostKeywordsComponent': { template: '<div class="boost-keywords">Boost Keywords</div>' },
          'FilterMenuComponent': { template: '<div class="filter-menu">Filter Menu</div>' },
          'SessionMenuComponent': { template: '<div class="session-menu">Session Menu</div>' },
          'HeaderExternalLinks': { template: '<div class="header-external-links">External Links</div>' }
        }
      }
    })

    expect(wrapper.html()).toContain('<strong>Pure</strong>Suggest')
  })

  it('shows intro message when session is empty', () => {
    mockSessionStore.isEmpty = true

    const wrapper = mount(HeaderPanel, {
      global: {
        provide: {
          appMeta: mockAppMeta
        },
        stubs: {
          'v-app-bar': { template: '<div class="v-app-bar"><slot></slot></div>' },
          'v-app-bar-title': { template: '<div class="v-app-bar-title"><slot></slot></div>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-menu': { template: '<div class="v-menu"><slot></slot></div>' },
          'v-list': { template: '<div class="v-list"><slot></slot></div>' },
          'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
          'BoostKeywordsComponent': { template: '<div class="boost-keywords">Boost Keywords</div>' },
          'FilterMenuComponent': { template: '<div class="filter-menu">Filter Menu</div>' },
          'SessionMenuComponent': { template: '<div class="session-menu">Session Menu</div>' },
          'HeaderExternalLinks': { template: '<div class="header-external-links">External Links</div>' }
        }
      }
    })

    expect(wrapper.text()).toContain(mockAppMeta.subtitle)
    expect(wrapper.text()).toContain('Based on a set of selected publications')
  })

  it('hides intro message when session is not empty', () => {
    mockSessionStore.isEmpty = false
    mockSessionStore.selectedPublicationsCount = 5

    const wrapper = mount(HeaderPanel, {
      global: {
        provide: {
          appMeta: mockAppMeta
        },
        stubs: {
          'v-app-bar': { template: '<div class="v-app-bar"><slot></slot></div>' },
          'v-app-bar-title': { template: '<div class="v-app-bar-title"><slot></slot></div>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-menu': { template: '<div class="v-menu"><slot></slot></div>' },
          'v-list': { template: '<div class="v-list"><slot></slot></div>' },
          'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
          'BoostKeywordsComponent': { template: '<div class="boost-keywords">Boost Keywords</div>' },
          'FilterMenuComponent': { template: '<div class="filter-menu">Filter Menu</div>' },
          'SessionMenuComponent': { template: '<div class="session-menu">Session Menu</div>' },
          'HeaderExternalLinks': { template: '<div class="header-external-links">External Links</div>' }
        }
      }
    })

    expect(wrapper.text()).not.toContain('Based on a set of selected publications')
    expect(wrapper.find('.intro-message-placeholder').exists()).toBe(true)
  })

  it('renders SessionMenuComponent when session is not empty', () => {
    mockSessionStore.isEmpty = false
    mockSessionStore.selectedPublicationsCount = 10
    mockSessionStore.excludedPublicationsCount = 3

    const wrapper = mount(HeaderPanel, {
      global: {
        provide: {
          appMeta: mockAppMeta
        },
        stubs: {
          'v-app-bar': { template: '<div class="v-app-bar"><slot></slot></div>' },
          'v-app-bar-title': { template: '<div class="v-app-bar-title"><slot></slot></div>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-menu': { template: '<div class="v-menu"><slot></slot></div>' },
          'v-list': { template: '<div class="v-list"><slot></slot></div>' },
          'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
          'BoostKeywordsComponent': { template: '<div class="boost-keywords">Boost Keywords</div>' },
          'FilterMenuComponent': { template: '<div class="filter-menu">Filter Menu</div>' },
          'SessionMenuComponent': { template: '<div class="session-menu">Session Menu</div>' },
          'HeaderExternalLinks': { template: '<div class="header-external-links">External Links</div>' }
        }
      }
    })

    expect(wrapper.find('.session-menu').exists()).toBe(true)
  })

  it('renders BoostKeywordsComponent and FilterMenuComponent', () => {
    const wrapper = mount(HeaderPanel, {
      global: {
        provide: {
          appMeta: mockAppMeta
        },
        stubs: {
          'v-app-bar': { template: '<div class="v-app-bar"><slot></slot></div>' },
          'v-app-bar-title': { template: '<div class="v-app-bar-title"><slot></slot></div>' },
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'v-menu': { template: '<div class="v-menu"><slot></slot></div>' },
          'v-list': { template: '<div class="v-list"><slot></slot></div>' },
          'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
          'BoostKeywordsComponent': { template: '<div class="boost-keywords">Boost Keywords</div>' },
          'FilterMenuComponent': { template: '<div class="filter-menu">Filter Menu</div>' },
          'SessionMenuComponent': { template: '<div class="session-menu">Session Menu</div>' },
          'HeaderExternalLinks': { template: '<div class="header-external-links">External Links</div>' }
        }
      }
    })

    expect(wrapper.find('.boost-keywords').exists()).toBe(true)
    expect(wrapper.find('.filter-menu').exists()).toBe(true)
  })
})