import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppState } from '@/composables/useAppState.js'

// Mock the stores
const mockSessionStore = {
  selectedPublications: [
    { doi: '10.1234/test1', title: 'Test Publication 1', year: 2020, author: 'John Doe; Jane Smith' },
    { doi: '10.1234/test2', title: 'Test Publication 2', year: 2021, author: 'Jane Smith; Bob Wilson' }
  ],
  excludedPublicationsCount: 0,
  selectedPublicationsCount: 2,
  clearActivePublication: vi.fn(),
  updateScores: vi.fn(),
  suggestion: null,
  maxSuggestions: 50,
  readPublicationsDois: [],
  isExcluded: vi.fn(),
  isSelected: vi.fn(),
  getSelectedPublicationByDoi: vi.fn()
}

const mockAuthorStore = {
  selectedPublicationsAuthors: [],
  computeSelectedPublicationsAuthors: vi.fn((publications) => {
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
  loadingMessage: null
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
    computeSuggestions: vi.fn(() => Promise.resolve({
      suggestions: [],
      metadata: {}
    }))
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

  it('should compute author data BEFORE calling updateScores to fix timing issue', async () => {
    const { computeSuggestions } = useAppState()
    
    // Verify initial state: no author data
    expect(mockAuthorStore.selectedPublicationsAuthors).toHaveLength(0)
    
    // Call computeSuggestions which internally calls both computeSelectedPublicationsAuthors and updateScores
    await computeSuggestions()
    
    // Verify the fix: computeSelectedPublicationsAuthors was called BEFORE updateScores
    const computeAuthorDataCallOrder = mockAuthorStore.computeSelectedPublicationsAuthors.mock.invocationCallOrder[0]
    const updateScoresCallOrder = mockSessionStore.updateScores.mock.invocationCallOrder[0]
    
    expect(computeAuthorDataCallOrder).toBeLessThan(updateScoresCallOrder)
    
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
    expect(mockSessionStore.updateScores).toHaveBeenCalled()
  })

  it('should ensure author data is available when updateScores triggers network plotting', async () => {
    const { computeSuggestions } = useAppState()
    
    // Create a spy to track when updateScores is called and what author data is available
    let authorDataAtUpdateScoresTime = null
    mockSessionStore.updateScores = vi.fn(() => {
      // Capture the state of author data when updateScores is called
      authorDataAtUpdateScoresTime = [...mockAuthorStore.selectedPublicationsAuthors]
    })
    
    await computeSuggestions()
    
    // Verify that when updateScores was called, author data was already available
    expect(authorDataAtUpdateScoresTime).toHaveLength(2)
    expect(authorDataAtUpdateScoresTime[0]).toMatchObject({
      id: 'author1',
      name: 'John Doe'
    })
    expect(authorDataAtUpdateScoresTime[1]).toMatchObject({
      id: 'author2',
      name: 'Jane Smith'
    })
  })
})