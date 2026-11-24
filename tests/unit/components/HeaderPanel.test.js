import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

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
    isEmpty: ref(mockSessionStore.isEmpty),
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

  const defaultStubs = {
    'v-app-bar': { template: '<div class="v-app-bar"><slot></slot></div>' },
    'v-app-bar-title': { template: '<div class="v-app-bar-title"><slot></slot></div>' },
    'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
    'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
    'v-menu': { template: '<div class="v-menu"><slot></slot></div>' },
    'v-list': { template: '<div class="v-list"><slot></slot></div>' },
    'v-list-item': { template: '<div class="v-list-item"><slot></slot></div>' },
    KeywordMenuComponent: { template: '<div class="boost-keywords">Boost Keywords</div>' },
    FilterMenuComponent: { template: '<div class="filter-menu">Filter Menu</div>' },
    SessionMenuComponent: {
      props: ['compact'],
      template: '<div class="session-menu" :class="{ compact }">Session Menu</div>'
    },
    LayoutMenuComponent: {
      props: ['collapsed'],
      template: '<div class="layout-menu" :class="{ collapsed }">Layout Menu</div>'
    },
    HeaderExternalLinks: { template: '<div class="header-external-links">External Links</div>' }
  }

  const createWrapper = (props = {}) =>
    mount(HeaderPanel, {
      global: {
        provide: { appMeta: mockAppMeta },
        stubs: defaultStubs
      },
      ...props
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionStore.isEmpty = true
    mockSessionStore.selectedPublicationsCount = 0
    mockSessionStore.excludedPublicationsCount = 0
  })

  it('renders without errors', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  describe('fitting the header content', () => {
    const simulateOverflow = (isOverflowing) =>
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function () {
        return this.classList.contains('session-state') && isOverflowing(this) ? 1 : 0
      })

    const compaction = (wrapper) => ({
      logo: wrapper.find('.app-logo .is-sr-only').exists(),
      session: wrapper.find('.session-menu').classes('compact'),
      layout: wrapper.find('.layout-menu').classes('collapsed')
    })

    beforeEach(() => {
      // Browsers notify a resize observer once when starting to observe
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback) {
            this.callback = callback
          }
          observe() {
            this.callback()
          }
          disconnect() {}
        }
      )
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    })

    it('keeps the full header when the content fits', async () => {
      mockSessionStore.isEmpty = false
      simulateOverflow(() => false)
      const wrapper = createWrapper()
      await flushPromises()

      expect(compaction(wrapper)).toEqual({ logo: false, session: false, layout: false })
    })

    it('compacts logo, session, and layout one after another until the content fits', async () => {
      mockSessionStore.isEmpty = false
      simulateOverflow((sessionState) => !sessionState.querySelector('.session-menu.compact'))
      const wrapper = createWrapper()
      await flushPromises()

      expect(compaction(wrapper)).toEqual({ logo: true, session: true, layout: false })
    })

    it('also collapses the layout selection when the content still does not fit', async () => {
      mockSessionStore.isEmpty = false
      simulateOverflow(() => true)
      const wrapper = createWrapper()
      await flushPromises()

      expect(compaction(wrapper)).toEqual({ logo: true, session: true, layout: true })
    })
  })
})
