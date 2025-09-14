import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useAppState } from '@/composables/useAppState.js'
import { useAuthorStore } from '@/stores/author.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useSessionStore } from '@/stores/session.js'

// Mock constants
vi.mock('@/constants/config.js', () => ({
  SCORING: {
    FIRST_AUTHOR_BOOST: 2,
    NEW_PUBLICATION_BOOST: 1.5
  },
  PAGINATION: {
    INITIAL_SUGGESTIONS_COUNT: 20,
    LOAD_MORE_INCREMENT: 10
  }
}))

describe('Issue #552: Modal Deterministic Behavior', () => {
  let interfaceStore, authorStore, sessionStore, openAuthorModalDialog

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)

    interfaceStore = useInterfaceStore()
    authorStore = useAuthorStore()
    sessionStore = useSessionStore()

    const appState = useAppState()
    openAuthorModalDialog = appState.openAuthorModalDialog

    // Mock the stores
    vi.spyOn(authorStore, 'computeSelectedPublicationsAuthors').mockReturnValue()
    vi.spyOn(sessionStore, 'updatePublicationScores').mockImplementation(() => {
      // Mark publications as having scores to avoid repeated updates
      sessionStore.selectedPublications.forEach((pub) => {
        pub.score = 10 // Some non-zero score
        pub.boostKeywords = ['test']
        pub.citationCount = 5
        pub.referenceCount = 10
      })
    })
  })

  it('should not recompute authors when opening modal multiple times with valid author data', () => {
    // SETUP: Publications with valid scores and existing author data
    sessionStore.selectedPublications = [
      {
        doi: '10.1234/test1',
        title: 'Test Publication 1',
        author: 'Smith, John; Doe, Jane',
        authorOrcid: 'Smith, John; Doe, Jane',
        score: 10,
        boostKeywords: ['test'],
        citationCount: 5,
        referenceCount: 10,
        year: 2023,
        isNew: false
      }
    ]

    // Set up existing author data (simulating already computed authors)
    authorStore.selectedPublicationsAuthors = [
      { id: 'smith, john', name: 'Smith, John', score: 10, count: 1 },
      { id: 'doe, jane', name: 'Doe, Jane', score: 10, count: 1 }
    ]

    // TEST: Open modal multiple times in sequence (simulating user behavior in issue #552)
    for (let i = 0; i < 5; i++) {
      // Reset computation spy before each test
      authorStore.computeSelectedPublicationsAuthors.mockClear()

      // Open modal
      openAuthorModalDialog()

      // Close modal (this sets isAuthorModalDialogShown = false)
      interfaceStore.isAuthorModalDialogShown = false

      // VERIFICATION: Authors should NOT be recomputed since data is valid
      expect(authorStore.computeSelectedPublicationsAuthors).not.toHaveBeenCalled()
    }
  })

  it('should be deterministic - same inputs always produce same decision', () => {
    // SETUP: Identical conditions each time
    const setupIdenticalState = () => {
      sessionStore.selectedPublications = [
        {
          doi: '10.1234/test1',
          title: 'Test Publication 1',
          author: 'Smith, John; Doe, Jane',
          authorOrcid: 'Smith, John; Doe, Jane',
          score: 10,
          boostKeywords: ['test'],
          citationCount: 5,
          referenceCount: 10,
          year: 2023,
          isNew: false
        }
      ]

      authorStore.selectedPublicationsAuthors = [
        { id: 'smith, john', name: 'Smith, John', score: 10, count: 1 },
        { id: 'doe, jane', name: 'Doe, Jane', score: 10, count: 1 }
      ]
    }

    const results = []

    // TEST: Run the same scenario multiple times
    for (let i = 0; i < 10; i++) {
      setupIdenticalState()

      // Clear spy
      authorStore.computeSelectedPublicationsAuthors.mockClear()

      // Open modal
      openAuthorModalDialog()

      // Record whether computation was triggered
      results.push(authorStore.computeSelectedPublicationsAuthors.mock.calls.length > 0)
    }

    // VERIFICATION: All results should be identical (deterministic behavior)
    const firstResult = results[0]
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBe(firstResult)
    }

    // In this case, all should be false (no recomputation needed)
    expect(results.every((result) => result === false)).toBe(true)
  })

  it('should provide consistent modal opening behavior', () => {
    sessionStore.selectedPublications = [
      {
        doi: '10.1234/test1',
        title: 'Test Publication 1',
        author: 'Smith, John',
        authorOrcid: 'Smith, John',
        score: 10,
        boostKeywords: ['test'],
        citationCount: 5,
        referenceCount: 10
      }
    ]

    // Test that modal opening is consistent
    openAuthorModalDialog()
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)

    // Test with author ID
    openAuthorModalDialog('test-author')
    expect(authorStore.activeAuthorId).toBe('test-author')
    openAuthorModalDialog()
    expect(authorStore.computeSelectedPublicationsAuthors).not.toHaveBeenCalled()
  })
})
