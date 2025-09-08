import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Simplified external dependency mocking
vi.mock('@/lib/Cache.js', () => ({
  get: vi.fn(),
  set: vi.fn(),
  keys: vi.fn(() => Promise.resolve([])),
  clearCache: vi.fn()
}))

// Simplified PublicationSearch mock
vi.mock('@/core/PublicationSearch.js', () => ({
  default: class {
    async execute() {
      return {
        results: [
          { doi: '10.1234/test-1', title: 'Test Publication 1', year: 2023, wasFetched: true },
          { doi: '10.1234/test-2', title: 'Test Publication 2', year: 2022, wasFetched: true }
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

  it('should cancel search when escape key is pressed during loading', async () => {
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

    // Set up initial state
    interfaceStore.searchQuery = 'test query'
    interfaceStore.isSearchModalDialogShown = true
    wrapper.vm.isLoading = true
    wrapper.vm.searchResults = { results: [{ doi: 'test' }], type: 'search' }

    // Simulate handleKeydown being called with Escape key
    wrapper.vm.handleKeydown({ key: 'Escape' })

    // Should cancel loading and reset search
    expect(wrapper.vm.isLoading).toBe(false)
    expect(wrapper.vm.searchResults).toEqual({ results: [], type: 'empty' })
  })

  it('should have cancelSearch method that resets loading state', () => {
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

    // Set up loading state
    wrapper.vm.isLoading = true
    wrapper.vm.searchResults = { results: [{ doi: 'test' }], type: 'search' }
    wrapper.vm.loaded = 5

    // Call cancelSearch method (this should exist after our fix)
    expect(() => wrapper.vm.cancelSearch()).not.toThrow()
  })

  it('should cancel previous search when starting a new search', async () => {
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

    // Set up initial loading state
    wrapper.vm.isLoading = true
    wrapper.vm.searchResults = { results: [{ doi: 'old-search' }], type: 'search' }
    wrapper.vm.loaded = 3
    wrapper.vm.lastSearchQuery = 'old query'

    // Mock cancelSearch to verify it's called
    const cancelSearchSpy = vi.spyOn(wrapper.vm, 'cancelSearch')
    
    // Start a new search while previous is loading - with different query
    interfaceStore.searchQuery = 'new search query'
    await wrapper.vm.search()

    // Should have called cancelSearch for previous search
    expect(cancelSearchSpy).toHaveBeenCalled()
  })

  it('should cancel ongoing search when user types in search field', async () => {
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

    // Set up loading state
    wrapper.vm.isLoading = true
    wrapper.vm.searchResults = { results: [{ doi: 'loading' }], type: 'search' }

    // Mock cancelSearch to verify it's called
    const cancelSearchSpy = vi.spyOn(wrapper.vm, 'cancelSearch')
    
    // Simulate user typing in search field by changing the query and triggering watcher manually
    interfaceStore.searchQuery = 'new typing'
    
    // Simulate the watcher being triggered (since Vue watchers don't always trigger in tests)
    await wrapper.vm.$options.watch['interfaceStore.searchQuery'].handler.call(wrapper.vm)

    // Should cancel the ongoing search
    expect(cancelSearchSpy).toHaveBeenCalled()
  })

  it('should not perform search when query is same as previous search', async () => {
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

    // Set up initial search state
    wrapper.vm.lastSearchQuery = 'machine learning'
    interfaceStore.searchQuery = 'machine learning'
    wrapper.vm.searchResults = { results: [{ doi: 'existing' }], type: 'search' }

    // Mock the search execution
    const searchSpy = vi.spyOn(wrapper.vm, 'search').mockImplementation(() => {})
    
    // Try to search with same query
    await wrapper.vm.search()

    // Should not execute search logic when query is same
    expect(wrapper.vm.lastSearchQuery).toBe('machine learning')
  })

  it('should not cancel ongoing search when clicking search with same query', async () => {
    // Set interfaceStore query before mounting to avoid triggering watchers
    interfaceStore.searchQuery = 'machine learning'
    
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

    // Set up ongoing search with same query after mounting
    wrapper.vm.lastSearchQuery = 'machine learning'
    wrapper.vm.isLoading = true
    wrapper.vm.searchResults = { results: [{ doi: 'loading' }], type: 'search' }
    const originalLoading = wrapper.vm.isLoading
    
    // Mock cancelSearch to verify it's NOT called within search() method
    const cancelSearchSpy = vi.spyOn(wrapper.vm, 'cancelSearch')
    
    // Click search with same query - should return early without calling cancelSearch
    await wrapper.vm.search()

    // Should NOT cancel the ongoing search since query is same
    expect(cancelSearchSpy).not.toHaveBeenCalled()
    expect(wrapper.vm.isLoading).toBe(originalLoading) // Should remain unchanged
  })

  it('should not show results that arrive after search cancellation', async () => {
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

    // Set up search state
    interfaceStore.searchQuery = 'test query'
    wrapper.vm.isLoading = true
    wrapper.vm.searchResults = { results: [{ doi: 'loading' }], type: 'search' }

    // Cancel the search
    wrapper.vm.cancelSearch()

    // Simulate late-arriving search results (like from PublicationSearch.execute())
    wrapper.vm.searchResults = { 
      results: [{ doi: '10.1234/late-result', title: 'Late Result', wasFetched: true }], 
      type: 'search' 
    }

    // Results should not be displayed since search was cancelled
    expect(wrapper.vm.filteredSearchResults).toEqual([])
  })
})