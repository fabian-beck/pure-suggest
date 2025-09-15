import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import App from '@/App.vue'
import { useSessionStore } from '@/stores/session.js'

// Mock all the child components to isolate the App component
vi.mock('@/components/HeaderPanel.vue', () => ({
  default: { template: '<div>HeaderPanel Mock</div>' }
}))
vi.mock('@/components/SelectedPublicationsComponent.vue', () => ({
  default: { template: '<div>SelectedPublications Mock</div>' }
}))
vi.mock('@/components/SuggestedPublicationsComponent.vue', () => ({
  default: { template: '<div>SuggestedPublications Mock</div>' }
}))
vi.mock('@/components/NetworkVisComponent.vue', () => ({
  default: { template: '<div>NetworkVis Mock</div>' }
}))
vi.mock('@/components/QuickAccessBar.vue', () => ({
  default: { template: '<div>QuickAccessBar Mock</div>' }
}))

// Mock all modal dialogs
vi.mock('@/components/modal/SearchModalDialog.vue', () => ({
  default: { template: '<div>SearchModal Mock</div>' }
}))
vi.mock('@/components/modal/AuthorModalDialog.vue', () => ({
  default: { template: '<div>AuthorModal Mock</div>' }
}))
vi.mock('@/components/modal/ExcludedModalDialog.vue', () => ({
  default: { template: '<div>ExcludedModal Mock</div>' }
}))
vi.mock('@/components/modal/QueueModalDialog.vue', () => ({
  default: { template: '<div>QueueModal Mock</div>' }
}))
vi.mock('@/components/modal/AboutModalDialog.vue', () => ({
  default: { template: '<div>AboutModal Mock</div>' }
}))
vi.mock('@/components/modal/KeyboardControlsModalDialog.vue', () => ({
  default: { template: '<div>KeyboardControlsModal Mock</div>' }
}))
vi.mock('@/components/modal/ShareSessionModalDialog.vue', () => ({
  default: { template: '<div>ShareSessionModal Mock</div>' }
}))

// Mock other UI components
vi.mock('@/components/basic/ConfirmDialog.vue', () => ({
  default: { template: '<div>ConfirmDialog Mock</div>' }
}))
vi.mock('@/components/basic/InfoDialog.vue', () => ({
  default: { template: '<div>InfoDialog Mock</div>' }
}))
vi.mock('@/components/basic/ErrorToast.vue', () => ({
  default: { template: '<div>ErrorToast Mock</div>' }
}))

// Mock utilities
vi.mock('@/utils/performance.js', () => ({
  perfMonitor: {
    logPageMetrics: vi.fn(),
    logMemoryUsage: vi.fn()
  }
}))

// Mock the lib/Keys.js module
vi.mock('@/lib/Keys.js', () => ({
  onKey: vi.fn()
}))

// Mock composables
vi.mock('@/composables/useAppState.js', () => ({
  useAppState: () => ({
    isEmpty: true,
    loadSession: vi.fn()
  })
}))

describe('App - Page Title Management', () => {
  let wrapper
  let sessionStore
  let pinia
  const defaultTitle = 'PUREsuggest – Citation-based literature search'

  beforeEach(() => {
    // Save original document.title
    global.originalDocumentTitle = document.title
    
    // Create fresh Pinia instance
    pinia = createPinia()
    setActivePinia(pinia)

    wrapper = mount(App, {
      global: {
        plugins: [pinia],
        provide: {
          appMeta: {
            name: 'PUREsuggest',
            nameHtml: '<span class="has-text-primary">PURE&ThinSpace;</span><span class="has-text-info">suggest</span>',
            subtitle: 'Citation-based literature search',
            version: '0.11.0'
          }
        }
      }
    })

    sessionStore = useSessionStore()
  })

  afterEach(() => {
    // Restore original document.title
    document.title = global.originalDocumentTitle
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('should set default title when no session name is provided', async () => {
    // Ensure session name is empty
    sessionStore.sessionName = ''
    
    // Call updatePageTitle method directly
    await wrapper.vm.updatePageTitle()
    
    expect(document.title).toBe(defaultTitle)
  })

  it('should update title when session name is set', async () => {
    const sessionName = 'My Research Session'
    sessionStore.sessionName = sessionName
    
    // Call updatePageTitle method directly
    await wrapper.vm.updatePageTitle()
    
    expect(document.title).toBe(`${sessionName}: ${defaultTitle}`)
  })

  it('should revert to default title when session name is cleared', async () => {
    const sessionName = 'My Research Session'
    
    // First set a session name
    sessionStore.sessionName = sessionName
    await wrapper.vm.updatePageTitle()
    expect(document.title).toBe(`${sessionName}: ${defaultTitle}`)
    
    // Then clear it
    sessionStore.sessionName = ''
    await wrapper.vm.updatePageTitle()
    expect(document.title).toBe(defaultTitle)
  })

  it('should handle whitespace-only session names as empty', async () => {
    sessionStore.sessionName = '   '
    
    await wrapper.vm.updatePageTitle()
    
    expect(document.title).toBe(defaultTitle)
  })

  it('should update title reactively when sessionName changes', async () => {
    const sessionName = 'Dynamic Session'
    
    // Change session name in store (this should trigger the watcher)
    sessionStore.sessionName = sessionName
    
    // Wait for reactivity and DOM updates
    await nextTick()
    
    expect(document.title).toBe(`${sessionName}: ${defaultTitle}`)
  })
})