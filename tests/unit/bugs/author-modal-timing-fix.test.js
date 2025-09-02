import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useInterfaceStore } from '@/stores/interface.js'
import { useAuthorStore } from '@/stores/author.js'
import { useSessionStore } from '@/stores/session.js'

describe('Author Modal Timing Fix', () => {
  let pinia
  let interfaceStore
  let authorStore
  let sessionStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    interfaceStore = useInterfaceStore()
    authorStore = useAuthorStore()
    sessionStore = useSessionStore()

    // Set up test data
    sessionStore.selectedPublications = [
      { 
        doi: '10.1234/test1', 
        title: 'Test Publication 1', 
        year: 2020, 
        author: 'John Doe; Jane Smith',
        authorOrcid: 'John Doe; Jane Smith',
        score: 0.8,
        isNew: false,
        boostKeywords: ['machine learning']
      },
      { 
        doi: '10.1234/test2', 
        title: 'Test Publication 2', 
        year: 2021, 
        author: 'Jane Smith; Bob Wilson',
        authorOrcid: 'Jane Smith; Bob Wilson',
        score: 0.9,
        isNew: true,
        boostKeywords: ['deep learning']
      }
    ]

    // Spy on the methods
    vi.spyOn(authorStore, 'computeSelectedPublicationsAuthors')
    vi.spyOn(sessionStore, 'updateScores')
  })

  it('should automatically compute author data when modal is opened with empty author store', () => {
    // INITIAL STATE: Author store is empty (simulating fresh page load)
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(0)
    expect(sessionStore.selectedPublications).toHaveLength(2)

    // USER ACTION: Open the author modal dialog
    interfaceStore.openAuthorModalDialog()

    // VERIFICATION: Author computation should be triggered automatically
    expect(authorStore.computeSelectedPublicationsAuthors).toHaveBeenCalledWith(sessionStore.selectedPublications)
    
    // Modal should be shown
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
  })

  it('should not recompute author data when modal is opened with existing author data', () => {
    // SETUP: Pre-populate author store with data
    authorStore.selectedPublicationsAuthors = [
      { id: 'john-doe', name: 'John Doe', count: 1 },
      { id: 'jane-smith', name: 'Jane Smith', count: 2 }
    ]

    // USER ACTION: Open the author modal dialog
    interfaceStore.openAuthorModalDialog()

    // VERIFICATION: Author computation should NOT be triggered since data already exists
    expect(authorStore.computeSelectedPublicationsAuthors).not.toHaveBeenCalled()
    
    // Modal should still be shown
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
  })

  it('should pass authorId parameter correctly when provided', () => {
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(0)

    // USER ACTION: Open modal with specific author ID
    interfaceStore.openAuthorModalDialog('jane-smith')

    // VERIFICATION: Author computation triggered and author ID set for scrolling
    expect(authorStore.computeSelectedPublicationsAuthors).toHaveBeenCalledWith(sessionStore.selectedPublications)
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
    expect(interfaceStore.scrollAuthorId).toBe('jane-smith')
  })

  it('should handle case when no selected publications exist', () => {
    // SETUP: Empty selected publications
    sessionStore.selectedPublications = []
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(0)

    // USER ACTION: Open modal 
    interfaceStore.openAuthorModalDialog()

    // VERIFICATION: No author computation should be triggered since no publications
    expect(authorStore.computeSelectedPublicationsAuthors).not.toHaveBeenCalled()
    
    // Modal should still be shown (user might want to see empty state)
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
  })

  it('should identify stale author data correctly', () => {
    const publications = [
      { doi: '10.1234/test1', author: 'John Doe', authorOrcid: 'John Doe' }
    ]

    // Test with no authors (stale)
    expect(interfaceStore.isAuthorDataStale(publications, [])).toBe(true)

    // Test with authors present (not stale)
    const authors = [{ id: 'john-doe', name: 'John Doe', count: 1 }]
    expect(interfaceStore.isAuthorDataStale(publications, authors)).toBe(false)

    // Test with no publications with authors (not stale)
    const publicationsNoAuthors = [{ doi: '10.1234/test1' }] // no author field
    expect(interfaceStore.isAuthorDataStale(publicationsNoAuthors, [])).toBe(false)
  })

  it('should recompute when author data is identified as stale', () => {
    // SETUP: Author store with some data (not empty, but stale)
    const initialAuthors = [{ id: 'old-author', name: 'Old Author', count: 1 }]
    authorStore.selectedPublicationsAuthors = initialAuthors
    
    // Mock isAuthorDataStale to return true (simulating stale data)
    const staleSpy = vi.spyOn(interfaceStore, 'isAuthorDataStale').mockReturnValue(true)

    // USER ACTION: Open modal
    interfaceStore.openAuthorModalDialog()

    // VERIFICATION: Should check staleness and trigger recomputation 
    expect(staleSpy).toHaveBeenCalled()
    expect(authorStore.computeSelectedPublicationsAuthors).toHaveBeenCalledWith(sessionStore.selectedPublications)
  })

  it('should handle session loading scenario: publications with uncomputed scores', () => {
    // SETUP: Simulate session loading with uncomputed publication scores
    sessionStore.selectedPublications = [
      { 
        doi: '10.1234/test1', 
        title: 'Session Publication 1',
        author: 'John Doe; Jane Smith',
        authorOrcid: 'John Doe; Jane Smith',
        year: 2020,
        score: 0,  // Default - not yet computed
        boostKeywords: [],  // Empty - not processed
        citationCount: undefined,  // No citation data loaded yet
        referenceCount: undefined
      }
    ]

    // Mock publicationsNeedScoreUpdate to return true
    vi.spyOn(interfaceStore, 'publicationsNeedScoreUpdate').mockReturnValue(true)

    // USER ACTION: Open modal right after session load
    interfaceStore.openAuthorModalDialog()

    // VERIFICATION: Should trigger updateScores first, then author computation
    expect(interfaceStore.publicationsNeedScoreUpdate).toHaveBeenCalledWith(sessionStore.selectedPublications)
    expect(sessionStore.updateScores).toHaveBeenCalled()
    expect(authorStore.computeSelectedPublicationsAuthors).toHaveBeenCalledWith(sessionStore.selectedPublications)
    
    // Modal should be shown
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
  })
})