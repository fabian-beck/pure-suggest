import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useAppState } from '@/composables/useAppState.js'
import { useAuthorStore } from '@/stores/author.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useSessionStore } from '@/stores/session.js'

describe('Author Modal Session Loading Issue', () => {
  let pinia
  let interfaceStore
  let authorStore
  let sessionStore
  let appState

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    interfaceStore = useInterfaceStore()
    authorStore = useAuthorStore()
    sessionStore = useSessionStore()
    appState = useAppState()

    // Spy on the methods
    vi.spyOn(authorStore, 'computeSelectedPublicationsAuthors')
    vi.spyOn(sessionStore, 'updatePublicationScores')
  })

  it('should identify publications that need score updates after session loading', () => {
    // SCENARIO: Publications loaded from session but scores not yet computed
    const publicationsAfterSessionLoad = [
      {
        doi: '10.1234/test1',
        title: 'Test Publication 1',
        year: 2020,
        author: 'John Doe; Jane Smith',
        authorOrcid: 'John Doe; Jane Smith',
        score: 0, // Default score - not yet computed
        boostKeywords: [], // Empty - not yet processed
        citationCount: undefined, // Session data doesn't include these yet
        referenceCount: undefined
      },
      {
        doi: '10.1234/test2',
        title: 'Test Publication 2',
        year: 2021,
        author: 'Jane Smith; Bob Wilson',
        authorOrcid: 'Jane Smith; Bob Wilson',
        score: 0, // Default score - not yet computed
        boostKeywords: [], // Empty - not yet processed
        citationCount: undefined, // Session data doesn't include these yet
        referenceCount: undefined
      }
    ]

    // Should identify these as needing score updates
    expect(appState.publicationsNeedScoreUpdate(publicationsAfterSessionLoad)).toBe(true)

    // Test with properly scored publications
    const publicationsWithScores = [
      {
        doi: '10.1234/test1',
        title: 'Test Publication 1',
        score: 2.5,
        boostKeywords: ['machine learning'],
        citationCount: 10,
        referenceCount: 25
      },
      {
        doi: '10.1234/test2',
        title: 'Test Publication 2',
        score: 1.8,
        boostKeywords: ['deep learning'],
        citationCount: 5,
        referenceCount: 15
      }
    ]

    // Should not identify these as needing updates
    expect(appState.publicationsNeedScoreUpdate(publicationsWithScores)).toBe(false)
  })

  it('should handle legitimate zero scores correctly', () => {
    // SCENARIO: Publication with legitimately calculated zero score
    const publicationsWithLegitimateZeroScore = [
      {
        doi: '10.1234/test1',
        title: 'Test Publication 1',
        score: 0, // Legitimate zero score
        boostKeywords: [], // No boost keywords found
        citationCount: 0, // Has citation data but zero citations
        referenceCount: 0 // Has reference data but zero references
      }
    ]

    // Should not identify this as needing updates (it's a legitimate zero)
    expect(appState.publicationsNeedScoreUpdate(publicationsWithLegitimateZeroScore)).toBe(
      false
    )
  })

  it('should trigger updatePublicationScores and then compute authors when opening modal after session load', () => {
    // SCENARIO: Session just loaded, publications have uncomputed scores
    sessionStore.selectedPublications = [
      {
        doi: '10.1234/test1',
        title: 'Test Publication 1',
        year: 2020,
        author: 'John Doe; Jane Smith',
        authorOrcid: 'John Doe; Jane Smith',
        score: 0, // Uncomputed
        boostKeywords: [], // Empty
        citationCount: undefined,
        referenceCount: undefined
      },
      {
        doi: '10.1234/test2',
        title: 'Test Publication 2',
        year: 2021,
        author: 'Jane Smith; Bob Wilson',
        authorOrcid: 'Jane Smith; Bob Wilson',
        score: 0, // Uncomputed
        boostKeywords: [], // Empty
        citationCount: undefined,
        referenceCount: undefined
      }
    ]

    // Mock updatePublicationScores to simulate score computation
    sessionStore.updatePublicationScores.mockImplementation(() => {
      sessionStore.selectedPublications.forEach((pub) => {
        pub.score = Math.random() * 3 + 0.5 // Random score between 0.5-3.5
        pub.boostKeywords = ['machine learning'] // Add some keywords
        pub.citationCount = 10
        pub.referenceCount = 20
      })
    })

    // Initially no author data
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(0)

    // USER ACTION: Open author modal right after session load
    appState.openAuthorModalDialog()

    // VERIFICATION: Should trigger score updates first, then author computation
    expect(sessionStore.updatePublicationScores).toHaveBeenCalled()
    expect(authorStore.computeSelectedPublicationsAuthors).toHaveBeenCalledWith(
      sessionStore.selectedPublications
    )

    // Should be called in the correct order: updatePublicationScores before computeSelectedPublicationsAuthors
    const updatePublicationScoresCallOrder =
      sessionStore.updatePublicationScores.mock.invocationCallOrder[0]
    const computeAuthorsCallOrder =
      authorStore.computeSelectedPublicationsAuthors.mock.invocationCallOrder[0]
    expect(updatePublicationScoresCallOrder).toBeLessThan(computeAuthorsCallOrder)

    // Modal should be shown
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
  })

  it('should not trigger unnecessary updatePublicationScores when publications already have valid scores', () => {
    // SCENARIO: Publications already have computed scores (normal operation)
    sessionStore.selectedPublications = [
      {
        doi: '10.1234/test1',
        title: 'Test Publication 1',
        author: 'John Doe; Jane Smith',
        authorOrcid: 'John Doe; Jane Smith',
        year: 2020,
        score: 2.5, // Already computed
        boostKeywords: ['machine learning'], // Already processed
        citationCount: 10,
        referenceCount: 25
      },
      {
        doi: '10.1234/test2',
        title: 'Test Publication 2',
        author: 'Jane Smith; Bob Wilson',
        authorOrcid: 'Jane Smith; Bob Wilson',
        year: 2021,
        score: 1.8, // Already computed
        boostKeywords: ['deep learning'], // Already processed
        citationCount: 5,
        referenceCount: 15
      }
    ]

    // Initially no author data
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(0)

    // USER ACTION: Open author modal
    appState.openAuthorModalDialog()

    // VERIFICATION: Should NOT trigger updatePublicationScores since scores are already valid
    expect(sessionStore.updatePublicationScores).not.toHaveBeenCalled()

    // Should still compute authors
    expect(authorStore.computeSelectedPublicationsAuthors).toHaveBeenCalledWith(
      sessionStore.selectedPublications
    )

    // Modal should be shown
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
  })

  it('should handle mixed scenario: some publications with scores, some without', () => {
    // SCENARIO: Mixed state - some publications scored, others not
    sessionStore.selectedPublications = [
      {
        doi: '10.1234/test1',
        title: 'Test Publication 1',
        author: 'John Doe; Jane Smith',
        authorOrcid: 'John Doe; Jane Smith',
        year: 2020,
        score: 2.5, // Already computed
        boostKeywords: ['machine learning'],
        citationCount: 10,
        referenceCount: 25
      },
      {
        doi: '10.1234/test2',
        title: 'Test Publication 2',
        author: 'Jane Smith; Bob Wilson',
        authorOrcid: 'Jane Smith; Bob Wilson',
        year: 2021,
        score: 0, // Not yet computed
        boostKeywords: [],
        citationCount: undefined,
        referenceCount: undefined
      }
    ]

    // USER ACTION: Open author modal
    appState.openAuthorModalDialog()

    // VERIFICATION: Should trigger updatePublicationScores because at least one publication needs it
    expect(sessionStore.updatePublicationScores).toHaveBeenCalled()
    expect(authorStore.computeSelectedPublicationsAuthors).toHaveBeenCalled()
  })

  it('should handle empty publications gracefully', () => {
    // SCENARIO: No publications
    sessionStore.selectedPublications = []

    // USER ACTION: Open author modal
    appState.openAuthorModalDialog()

    // VERIFICATION: Should not trigger any computation
    expect(sessionStore.updatePublicationScores).not.toHaveBeenCalled()
    expect(authorStore.computeSelectedPublicationsAuthors).not.toHaveBeenCalled()

    // Modal should still be shown (user might want to see empty state)
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
  })
})
