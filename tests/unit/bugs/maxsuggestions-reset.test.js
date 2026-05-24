import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useAppState } from '@/composables/useAppState.js'
import { PAGINATION } from '@/constants/config.js'
import Publication from '@/core/Publication.js'
import { useAuthorStore } from '@/stores/author.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'

// Mock useModalManager
vi.mock('@/composables/useModalManager.js', () => ({
  useModalManager: () => ({
    showConfirmDialog: vi.fn()
  })
}))

// Mock services and dependencies
vi.mock('@/services/SuggestionService.js', () => ({
  SuggestionService: {
    computeSuggestions: vi.fn().mockResolvedValue({
      publications: [],
      totalSuggestions: 0
    })
  }
}))

vi.mock('@/lib/Cache.js', () => ({
  clearCache: vi.fn()
}))

/**
 * Test suite for verifying that maxSuggestions is preserved within a session
 * Issue: When updating suggestions, the number of suggestions to load resets to default.
 * This should only happen when clearing the session or loading a new one, but not within a session.
 */
describe('maxSuggestions preservation within session', () => {
  let sessionStore, interfaceStore, authorStore, appState

  beforeEach(() => {
    setActivePinia(createPinia())

    sessionStore = useSessionStore()
    interfaceStore = useInterfaceStore()
    authorStore = useAuthorStore()

    appState = useAppState()

    // Mock interface store methods
    interfaceStore.showErrorMessage = vi.fn()
    interfaceStore.startLoading = vi.fn()
    interfaceStore.endLoading = vi.fn()

    // Mock author store methods
    authorStore.computeSelectedPublicationsAuthors = vi.fn()

    // Mock Publication.fetchData to avoid actual API calls
    vi.spyOn(Publication.prototype, 'fetchData').mockResolvedValue()
  })

  it('should preserve maxSuggestions when adding publications to an existing session', async () => {
    // Arrange: Set up initial session with custom maxSuggestions
    sessionStore.maxSuggestions = 200
    sessionStore.selectedPublications = [
      new Publication('10.1234/existing1'),
      new Publication('10.1234/existing2')
    ]

    // Act: Add new publications to the session
    await appState.addPublicationsAndUpdate(['10.1234/new1'])

    // Assert: maxSuggestions should be preserved
    expect(sessionStore.maxSuggestions).toBe(200)
  })

  it('should preserve maxSuggestions when updating queued publications', async () => {
    // Arrange: Set up session with custom maxSuggestions and queued publications
    sessionStore.maxSuggestions = 150
    sessionStore.selectedPublications = [new Publication('10.1234/existing1')]

    const queueStore = useQueueStore()
    queueStore.selectedQueue = ['10.1234/queued1']

    // Act: Update queued publications
    await appState.updateQueued()

    // Assert: maxSuggestions should be preserved
    expect(sessionStore.maxSuggestions).toBe(150)
  })

  it('should preserve maxSuggestions when retrying to load a publication', async () => {
    // Arrange: Set up session with custom maxSuggestions
    sessionStore.maxSuggestions = 300
    sessionStore.selectedPublications = [new Publication('10.1234/existing1')]
    const publication = new Publication('10.1234/test')
    sessionStore.selectedPublications.push(publication)

    // Mock activatePublicationComponentByDoi to avoid DOM operations
    const mockActivate = vi.spyOn(appState, 'activatePublicationComponentByDoi').mockImplementation(() => {})

    // Act: Retry loading a publication
    await appState.retryLoadingPublication(publication)

    // Assert: maxSuggestions should be preserved
    expect(sessionStore.maxSuggestions).toBe(300)

    mockActivate.mockRestore()
  })

  it('should reset maxSuggestions to default when clearing session', () => {
    // Arrange: Set custom maxSuggestions
    sessionStore.maxSuggestions = 250
    sessionStore.selectedPublications = [new Publication('10.1234/test')]

    // Act: Clear the session
    appState.clear()

    // Assert: maxSuggestions should be reset to default
    expect(sessionStore.maxSuggestions).toBe(PAGINATION.INITIAL_SUGGESTIONS_COUNT)
  })

  it('should reset maxSuggestions to default when loading a new session', () => {
    // Arrange: Set custom maxSuggestions in current session
    sessionStore.maxSuggestions = 350

    const newSessionData = {
      name: 'New Session',
      selected: ['10.1234/new1', '10.1234/new2'],
      excluded: [],
      boost: ''
    }

    // Mock addPublicationsToSelection to avoid actual publication creation
    sessionStore.addPublicationsToSelection = vi.fn()

    // Act: Load a new session
    appState.loadSession(newSessionData)

    // Assert: maxSuggestions should be reset to default (via clear())
    expect(sessionStore.maxSuggestions).toBe(PAGINATION.INITIAL_SUGGESTIONS_COUNT)
  })

  it('should allow explicit override of maxSuggestions when loading more suggestions', async () => {
    // Arrange: Set initial maxSuggestions
    sessionStore.maxSuggestions = 100
    sessionStore.selectedPublications = [new Publication('10.1234/test')]

    // Act: Load more suggestions (should increase by increment)
    await appState.loadMoreSuggestions()

    // Assert: maxSuggestions should be increased by the increment
    expect(sessionStore.maxSuggestions).toBe(100 + PAGINATION.LOAD_MORE_INCREMENT)
  })

  it('should preserve custom maxSuggestions across multiple operations in the same session', async () => {
    // Arrange: Set up session with custom maxSuggestions
    sessionStore.maxSuggestions = 180
    sessionStore.selectedPublications = [new Publication('10.1234/pub1')]

    const queueStore = useQueueStore()

    // Act 1: Add a publication
    await appState.addPublicationsAndUpdate(['10.1234/pub2'])
    expect(sessionStore.maxSuggestions).toBe(180)

    // Act 2: Queue and update
    queueStore.selectedQueue = ['10.1234/pub3']
    await appState.updateQueued()
    expect(sessionStore.maxSuggestions).toBe(180)

    // Act 3: Retry loading
    const publication = sessionStore.selectedPublications[0]
    const mockActivate = vi.spyOn(appState, 'activatePublicationComponentByDoi').mockImplementation(() => {})
    await appState.retryLoadingPublication(publication)
    expect(sessionStore.maxSuggestions).toBe(180)

    mockActivate.mockRestore()

    // Assert: maxSuggestions should still be 180 after all operations
    expect(sessionStore.maxSuggestions).toBe(180)
  })

  it('should use current maxSuggestions value at call time, not definition time', async () => {
    // This test explicitly verifies that default parameters are evaluated at call time
    // Arrange: Start with initial default value
    expect(sessionStore.maxSuggestions).toBe(PAGINATION.INITIAL_SUGGESTIONS_COUNT) // 100
    sessionStore.selectedPublications = [new Publication('10.1234/test')]

    // Act 1: Change maxSuggestions and call updateSuggestions without parameter
    sessionStore.maxSuggestions = 250
    await appState.addPublicationsAndUpdate(['10.1234/pub1'])

    // Assert 1: Should preserve the new value
    expect(sessionStore.maxSuggestions).toBe(250)

    // Act 2: Change maxSuggestions again and call another function that uses updateSuggestions
    sessionStore.maxSuggestions = 350
    const publication = sessionStore.selectedPublications[0]
    const mockActivate = vi.spyOn(appState, 'activatePublicationComponentByDoi').mockImplementation(() => {})
    await appState.retryLoadingPublication(publication)

    // Assert 2: Should preserve this new value too
    expect(sessionStore.maxSuggestions).toBe(350)

    mockActivate.mockRestore()
  })
})
