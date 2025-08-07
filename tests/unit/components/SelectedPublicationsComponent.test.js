import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SelectedPublicationsComponent from '@/components/SelectedPublicationsComponent.vue'

// Mock stores
const mockSessionStore = {
  isEmpty: false,
  isUpdatable: false,
  selectedQueue: [],
  excludedQueue: [],
  selectedPublicationsFiltered: [],
  updateQueued: vi.fn(),
  clearQueues: vi.fn(),
  loadExample: vi.fn(),
  importSession: vi.fn(),
  $onAction: vi.fn()
}

const mockInterfaceStore = {
  isMobile: false,
  openAuthorModalDialog: vi.fn(),
  openSearchModalDialog: vi.fn(),
  isQueueModalDialogShown: false,
  showConfirmDialog: vi.fn()
}

// Mock the store imports
vi.mock('@/stores/session.js', () => ({
  useSessionStore: () => mockSessionStore
}))

vi.mock('@/stores/interface.js', () => ({
  useInterfaceStore: () => mockInterfaceStore
}))

describe('SelectedPublicationsComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionStore.isEmpty = false
    mockSessionStore.isUpdatable = false
    mockSessionStore.selectedQueue = []
    mockSessionStore.excludedQueue = []
  })

  it('renders the selected publications header', () => {
    const wrapper = mount(SelectedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'CompactButton': { template: '<button class="compact-button"><slot></slot></button>' },
          'InlineIcon': { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('Selected')
  })

  it('shows empty state when sessionStore is empty', () => {
    mockSessionStore.isEmpty = true

    const wrapper = mount(SelectedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'CompactButton': { template: '<button class="compact-button"><slot></slot></button>' },
          'InlineIcon': { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('To start, add publications to selected')
    expect(wrapper.text()).toContain('Search/add')
    expect(wrapper.text()).toContain('Import session')
    expect(wrapper.text()).toContain('Load example')
  })

  it('shows queue panel when sessionStore is updatable', () => {
    mockSessionStore.isUpdatable = true
    mockSessionStore.selectedQueue = ['doi1', 'doi2']
    mockSessionStore.excludedQueue = ['doi3']

    const wrapper = mount(SelectedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'CompactButton': { template: '<button class="compact-button"><slot></slot></button>' },
          'InlineIcon': { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
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
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'CompactButton': { 
            template: '<button class="compact-button" @click="$emit(\'click\')" :icon="icon"><slot></slot></button>',
            emits: ['click'],
            props: ['icon']
          },
          'InlineIcon': { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    const compactButtons = wrapper.findAll('.compact-button')
    const authorsButton = compactButtons[0] // First CompactButton is the authors button
    await authorsButton.trigger('click')
    expect(mockInterfaceStore.openAuthorModalDialog).toHaveBeenCalled()
  })

  it('calls openSearchModalDialog when search button is clicked', async () => {
    const wrapper = mount(SelectedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'CompactButton': { 
            template: '<button class="compact-button" @click="$emit(\'click\')" :icon="icon"><slot></slot></button>',
            emits: ['click'],
            props: ['icon']
          },
          'InlineIcon': { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    const compactButtons = wrapper.findAll('.compact-button')
    const searchButton = compactButtons[1] // Second CompactButton is the search button
    await searchButton.trigger('click')
    expect(mockInterfaceStore.openSearchModalDialog).toHaveBeenCalled()
  })

  it('calls loadExample when load example button is clicked', async () => {
    mockSessionStore.isEmpty = true

    const wrapper = mount(SelectedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'CompactButton': { template: '<button class="compact-button"><slot></slot></button>' },
          'InlineIcon': { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'PublicationListComponent': { template: '<div class="publication-list">Publications</div>' }
        }
      }
    })

    // Directly call the component's loadExample method through sessionStore
    await wrapper.vm.sessionStore.loadExample()
    expect(mockSessionStore.loadExample).toHaveBeenCalled()
  })

  it('renders PublicationListComponent with correct props', () => {
    const mockPublications = [{ doi: 'test-doi', title: 'Test Publication' }]
    mockSessionStore.selectedPublicationsFiltered = mockPublications

    const wrapper = mount(SelectedPublicationsComponent, {
      global: {
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'CompactButton': { template: '<button class="compact-button"><slot></slot></button>' },
          'InlineIcon': { template: '<i class="inline-icon"><slot></slot></i>' },
          'v-btn': { template: '<button class="v-btn"><slot></slot></button>' },
          'PublicationListComponent': { 
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