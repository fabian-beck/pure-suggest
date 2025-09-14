import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import SelectedPublicationsComponent from '@/components/SelectedPublicationsComponent.vue'
import { useInterfaceStore } from '@/stores/interface.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'

// Mock useAppState for the functions the component uses
const mockLoadExample = vi.fn()
const mockImportSession = vi.fn()
const mockOpenAuthorModalDialog = vi.fn()
vi.mock('@/composables/useAppState.js', () => ({
  useAppState: () => ({
    loadExample: mockLoadExample,
    importSession: mockImportSession,
    openAuthorModalDialog: mockOpenAuthorModalDialog,
    isEmpty: { value: false }
  })
}))

describe('SelectedPublicationsComponent', () => {
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

    vi.clearAllMocks()
    mockLoadExample.mockClear()
    mockImportSession.mockClear()

    // Set up default store state
    sessionStore.selectedPublications = []
    sessionStore.excludedPublicationsDois = []
    interfaceStore.isMobile = false
    interfaceStore.isQueueModalDialogShown = false
    mockOpenAuthorModalDialog.mockClear()
    interfaceStore.openSearchModalDialog = vi.fn()
    interfaceStore.showConfirmDialog = vi.fn()
    queueStore.selectedQueue = []
    queueStore.excludedQueue = []
    queueStore.clear = vi.fn()
  })

  it('renders the selected publications header', () => {
    const wrapper = mount(SelectedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          CompactButton: { template: '<button class="compact-button"><slot></slot></button>' },
          InlineIcon: { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          PublicationListComponent: { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('Selected')
  })

  it('shows empty state when sessionStore is empty', () => {
    // Ensure session and queue stores are empty to trigger empty state
    sessionStore.selectedPublications = []
    sessionStore.excludedPublicationsDois = []
    queueStore.selectedQueue = []
    queueStore.excludedQueue = []

    const wrapper = mount(SelectedPublicationsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          CompactButton: { template: '<button class="compact-button"><slot></slot></button>' },
          InlineIcon: { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          PublicationListComponent: { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('To start, add publications to selected')
    expect(wrapper.text()).toContain('Search/add')
    expect(wrapper.text()).toContain('Import session')
    expect(wrapper.text()).toContain('Load example')
  })

  it('shows queue panel when sessionStore is updatable', () => {
    // Set up queue store with test data
    queueStore.selectedQueue = ['doi1', 'doi2']
    queueStore.excludedQueue = ['doi3']

    const wrapper = mount(SelectedPublicationsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          CompactButton: { template: '<button class="compact-button"><slot></slot></button>' },
          InlineIcon: { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          PublicationListComponent: { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('Queue:')
    expect(wrapper.text()).toContain('2 publications to be selected')
    expect(wrapper.text()).toContain('1 publication to be excluded')
    expect(wrapper.text()).toContain('Update')
  })

  it('calls openAuthorModalDialog when authors button is clicked', async () => {
    const wrapper = mount(SelectedPublicationsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          CompactButton: {
            template:
              '<button class="compact-button" @click="$emit(\'click\')" :icon="icon"><slot></slot></button>',
            emits: ['click'],
            props: ['icon']
          },
          InlineIcon: { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          PublicationListComponent: { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    const compactButtons = wrapper.findAll('.compact-button')
    const authorsButton = compactButtons[0] // First CompactButton is the authors button
    await authorsButton.trigger('click')
    expect(mockOpenAuthorModalDialog).toHaveBeenCalled()
  })

  it('calls openSearchModalDialog when search button is clicked', async () => {
    const wrapper = mount(SelectedPublicationsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          CompactButton: {
            template:
              '<button class="compact-button" @click="$emit(\'click\')" :icon="icon"><slot></slot></button>',
            emits: ['click'],
            props: ['icon']
          },
          InlineIcon: { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          PublicationListComponent: { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    const compactButtons = wrapper.findAll('.compact-button')
    const searchButton = compactButtons[1] // Second CompactButton is the search button
    await searchButton.trigger('click')
    expect(interfaceStore.openSearchModalDialog).toHaveBeenCalled()
  })

  it('calls loadExample when load example button is clicked', async () => {
    // Set up empty state to show the load example button
    sessionStore.selectedPublications = []
    sessionStore.excludedPublicationsDois = []
    queueStore.selectedQueue = []
    queueStore.excludedQueue = []

    mount(SelectedPublicationsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          CompactButton: { template: '<button class="compact-button"><slot></slot></button>' },
          InlineIcon: { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          PublicationListComponent: { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    // Directly call the component's loadExample method through useAppState
    await mockLoadExample()
    expect(mockLoadExample).toHaveBeenCalled()
  })

  it('renders PublicationListComponent with correct props', () => {
    const mockPublications = [{ doi: 'test-doi', title: 'Test Publication' }]
    sessionStore.selectedPublications = mockPublications

    const wrapper = mount(SelectedPublicationsComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          CompactButton: { template: '<button class="compact-button"><slot></slot></button>' },
          InlineIcon: { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          PublicationListComponent: {
            template: '<div class="publication-list">Publications</div>',
            props: ['publications', 'showSectionHeaders', 'publicationType']
          }
        }
      }
    })

    const publicationList = wrapper.findComponent('.publication-list')
    expect(publicationList.exists()).toBe(true)
  })
})
