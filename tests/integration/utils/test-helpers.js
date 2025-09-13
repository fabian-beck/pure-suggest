import { setActivePinia, createPinia } from 'pinia'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useAppState } from '@/composables/useAppState.js'
import Publication from '@/core/Publication.js'

/**
 * Sets up clean test environment with fresh stores
 */
export function setupTestEnvironment() {
  const pinia = createPinia()
  setActivePinia(pinia)
  
  const sessionStore = useSessionStore()
  const interfaceStore = useInterfaceStore()
  const appState = useAppState()
  
  // Clear any existing state
  sessionStore.clear()
  
  return {
    sessionStore,
    interfaceStore,
    appState,
    pinia
  }
}

/**
 * Creates a mock Publication instance with realistic data and mocked methods
 */
export function createMockPublication(overrides = {}) {
  const defaultDoi = '10.1234/test-publication'
  const publication = new Publication(overrides.doi || defaultDoi)
  
  // Set up mock data
  Object.assign(publication, {
    title: 'Test Publication for Integration Testing',
    year: 2023,
    authors: [
      { given: 'John', family: 'Doe' },
      { given: 'Jane', family: 'Smith' }
    ],
    citationCount: 42,
    referenceCount: 28,
    citedByDois: [],
    referencesDois: [],
    boostKeywords: [],
    isQueued: false,
    isSelected: false,
    ...overrides
  })
  
  // Mock the fetchData method to avoid API calls
  publication.fetchData = async () => {
    // Simulate successful data fetching
    return Promise.resolve()
  }
  
  return publication
}

/**
 * Creates a mock DOI that will resolve successfully
 */
export function createValidTestDoi(index = 1) {
  return `10.1234/test-publication-${index}`
}

/**
 * Waits for async operations to complete
 */
export async function waitForAsyncOperations(ms = 100) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Simulates user adding a publication by DOI
 */
export async function simulateAddPublicationByDoi(appState, doi) {
  // Create a proper Publication instance
  const mockPublication = createMockPublication({ doi })
  
  // Add to session using the store's method
  const sessionStore = useSessionStore()
  sessionStore.selectedPublications.push(mockPublication)
  
  return mockPublication
}