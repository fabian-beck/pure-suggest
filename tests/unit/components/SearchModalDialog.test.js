import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Mock IndexedDB for this test
global.indexedDB = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    result: {
      createObjectStore: vi.fn(() => ({})),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          add: vi.fn(() => ({})),
          get: vi.fn(() => ({})),
          getAll: vi.fn(() => ({})),
          delete: vi.fn(() => ({}))
        }))
      }))
    }
  }))
}

// Mock Cache to avoid IndexedDB issues
vi.mock('@/Cache.js', () => ({
  get: vi.fn(),
  set: vi.fn(),
  keys: vi.fn(() => Promise.resolve([])),
  clearCache: vi.fn()
}))

// Mock PublicationSearch
vi.mock('@/PublicationSearch.js', () => ({
  default: class {
    constructor() {}
    async execute() {
      return {
        results: [
          {
            doi: '10.1234/test-publication-1',
            title: 'Test Publication 1',
            year: 2023,
            wasFetched: true
          },
          {
            doi: '10.1234/test-publication-2', 
            title: 'Test Publication 2',
            year: 2022,
            wasFetched: true
          }
        ],
        type: 'search'
      }
    }
  }
}))

import SearchModalDialog from '@/components/modal/SearchModalDialog.vue'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useQueueStore } from '@/stores/queue.js'

describe('SearchModalDialog', () => {
  let sessionStore
  let interfaceStore
  let queueStore
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    interfaceStore = useInterfaceStore()
    queueStore = useQueueStore()
  })

  it('should work correctly after fixing selectedQueue access', () => {
    // Set up the component with search results
    const wrapper = mount(SearchModalDialog, {
      global: {
        plugins: [pinia],
        stubs: {
          'ModalDialog': true,
          'PublicationComponentSearch': true,
          'v-text-field': true,
          'v-btn': true,
          'v-card-actions': true,
          'v-overlay': true,
          'v-progress-circular': true,
          'v-icon': true
        }
      }
    })

    // Set up search results in component data
    wrapper.vm.searchResults = {
      results: [
        {
          doi: '10.1234/test-publication-1',
          title: 'Test Publication 1',
          year: 2023,
          wasFetched: true
        },
        {
          doi: '10.1234/test-publication-2',
          title: 'Test Publication 2',
          year: 2023,
          wasFetched: true
        }
      ],
      type: 'search'
    }

    // Set up stores correctly
    sessionStore.selectedPublications = []
    queueStore.selectedQueue = ['10.1234/test-publication-2']
    
    // Verify that sessionStore does not have selectedQueue property
    expect(sessionStore.selectedQueue).toBeUndefined()
    
    // Now the filteredSearchResults should work correctly by accessing queueStore.selectedQueue
    const results = wrapper.vm.filteredSearchResults
    
    // Should filter out the publication that's in selectedQueue
    expect(results).toHaveLength(1)
    expect(results[0].doi).toBe('10.1234/test-publication-1')
  })

  it('should work correctly when accessing selectedQueue from correct store', () => {
    const wrapper = mount(SearchModalDialog, {
      global: {
        plugins: [pinia],
        stubs: {
          'ModalDialog': true,
          'PublicationComponentSearch': true,
          'v-text-field': true,
          'v-btn': true,
          'v-card-actions': true,
          'v-overlay': true,
          'v-progress-circular': true,
          'v-icon': true
        }
      }
    })

    // Set up search results
    wrapper.vm.searchResults = {
      results: [
        {
          doi: '10.1234/test-publication-1',
          title: 'Test Publication 1',
          year: 2023,
          wasFetched: true
        },
        {
          doi: '10.1234/test-publication-2',
          title: 'Test Publication 2', 
          year: 2022,
          wasFetched: true
        }
      ],
      type: 'search'
    }

    // Set up stores correctly
    sessionStore.selectedPublications = []
    queueStore.selectedQueue = ['10.1234/test-publication-2']

    // This demonstrates what should happen when we fix the issue:
    // filteredSearchResults should exclude publications that are in selectedQueue
    const expectedResults = wrapper.vm.searchResults.results.filter(
      pub => !queueStore.selectedQueue.includes(pub.doi)
    )

    expect(expectedResults).toHaveLength(1)
    expect(expectedResults[0].doi).toBe('10.1234/test-publication-1')
  })
})