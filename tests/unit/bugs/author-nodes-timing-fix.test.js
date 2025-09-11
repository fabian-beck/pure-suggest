import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppState } from '@/composables/useAppState.js'

// Mock the stores
const mockSessionStore = {
  selectedPublications: [
    {
      doi: '10.1234/test1',
      title: 'Test Publication 1',
      year: 2020,
      author: 'John Doe; Jane Smith'
    },
    {
      doi: '10.1234/test2',
      title: 'Test Publication 2',
      year: 2021,
      author: 'Jane Smith; Bob Wilson'
    }
  ],
  excludedPublicationsCount: 0,
  selectedPublicationsCount: 2,
  clearActivePublication: vi.fn(),
  updatePublicationScores: vi.fn(),
  hasUpdated: vi.fn(),
  suggestion: null,
  maxSuggestions: 50,
  readPublicationsDois: [],
  isExcluded: vi.fn(),
  isSelected: vi.fn(),
  getSelectedPublicationByDoi: vi.fn()
}

const mockAuthorStore = {
  selectedPublicationsAuthors: [],
  computeSelectedPublicationsAuthors: vi.fn((_publications) => {
    // Simulate computing authors from publications
    mockAuthorStore.selectedPublicationsAuthors = [
      {
        id: 'author1',
        name: 'John Doe',
        initials: 'JD',
        yearMin: 2020,
        yearMax: 2021,
        score: 0.85,
        count: 1,
        publicationDois: ['10.1234/test1']
      },
      {
        id: 'author2',
        name: 'Jane Smith',
        initials: 'JS',
        yearMin: 2020,
        yearMax: 2021,
        score: 0.92,
        count: 2,
        publicationDois: ['10.1234/test1', '10.1234/test2']
      }
    ]
  })
}

const mockInterfaceStore = {
  isLoading: false,
  endLoading: vi.fn(),
  loadingMessage: null,
  triggerNetworkReplot: vi.fn()
}

// Mock the stores
vi.mock('@/stores/session.js', () => ({
  useSessionStore: vi.fn(() => mockSessionStore)
}))

vi.mock('@/stores/interface.js', () => ({
  useInterfaceStore: vi.fn(() => mockInterfaceStore)
}))

vi.mock('@/stores/author.js', () => ({
  useAuthorStore: vi.fn(() => mockAuthorStore)
}))

vi.mock('@/stores/queue.js', () => ({
  useQueueStore: vi.fn(() => ({
    isUpdatable: false
  }))
}))

// Mock SuggestionService
vi.mock('@/services/SuggestionService.js', () => ({
  SuggestionService: {
    computeSuggestions: vi.fn(() =>
      Promise.resolve({
        suggestions: [],
        metadata: {}
      })
    )
  }
}))

// Mock cache
vi.mock('@/lib/Cache.js', () => ({
  clearCache: vi.fn()
}))

describe('Author Nodes Timing Fix', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    // Reset author store state
    mockAuthorStore.selectedPublicationsAuthors = []
  })

  it('should call updatePublicationScores BEFORE computing author data to fix timing issue', async () => {
    const { computeSuggestions } = useAppState()

    // Verify initial state: no author data
    expect(mockAuthorStore.selectedPublicationsAuthors).toHaveLength(0)

    // Call computeSuggestions which internally calls both computeSelectedPublicationsAuthors and updatePublicationScores
    await computeSuggestions()

    // Verify the fix: updatePublicationScores was called BEFORE computeSelectedPublicationsAuthors (correct order)
    const updatePublicationScoresCallOrder =
      mockSessionStore.updatePublicationScores.mock.invocationCallOrder[0]
    const computeAuthorDataCallOrder =
      mockAuthorStore.computeSelectedPublicationsAuthors.mock.invocationCallOrder[0]

    expect(updatePublicationScoresCallOrder).toBeLessThan(computeAuthorDataCallOrder)

    // Verify author data is now populated
    expect(mockAuthorStore.selectedPublicationsAuthors).toHaveLength(2)
    expect(mockAuthorStore.selectedPublicationsAuthors[0]).toMatchObject({
      id: 'author1',
      name: 'John Doe'
    })

    // Verify both functions were called with correct parameters
    expect(mockAuthorStore.computeSelectedPublicationsAuthors).toHaveBeenCalledWith(
      mockSessionStore.selectedPublications
    )
    expect(mockSessionStore.updatePublicationScores).toHaveBeenCalled()
  })

  it('should ensure author data is available after both score updates complete', async () => {
    const { computeSuggestions } = useAppState()

    // Track that updatePublicationScores is called before author computation
    let publicationScoresUpdated = false
    mockSessionStore.updatePublicationScores = vi.fn(() => {
      // At this point, author data should still be empty since it's computed after
      expect(mockAuthorStore.selectedPublicationsAuthors).toHaveLength(0)
      publicationScoresUpdated = true
    })

    await computeSuggestions()

    // Verify that publication scores were updated first
    expect(publicationScoresUpdated).toBe(true)

    // Verify that author data is now available after the complete sequence
    expect(mockAuthorStore.selectedPublicationsAuthors).toHaveLength(2)
    expect(mockAuthorStore.selectedPublicationsAuthors[0]).toMatchObject({
      id: 'author1',
      name: 'John Doe'
    })
    expect(mockAuthorStore.selectedPublicationsAuthors[1]).toMatchObject({
      id: 'author2',
      name: 'Jane Smith'
    })
  })
})
