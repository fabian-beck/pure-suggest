import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useAppState } from '@/composables/useAppState.js'
import { useAuthorStore } from '@/stores/author.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'

describe('Author Modal Integration Workflow', () => {
  let pinia
  let modalStore
  let authorStore
  let sessionStore
  let appState

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    modalStore = useModalStore()
    authorStore = useAuthorStore()
    sessionStore = useSessionStore()
    appState = useAppState()

    // Spy on the methods
    vi.spyOn(authorStore, 'computeSelectedPublicationsAuthors')
    vi.spyOn(sessionStore, 'updatePublicationScores')
  })

  describe('Author Modal Opening', () => {
    it('should open modal and set author ID when provided', () => {
      appState.openAuthorModalDialog('test-author-id')

      expect(modalStore.isAuthorModalDialogShown).toBe(true)
      expect(authorStore.activeAuthorId).toBe('test-author-id')
    })

    it('should open modal without setting author ID when not provided', () => {
      appState.openAuthorModalDialog()

      expect(modalStore.isAuthorModalDialogShown).toBe(true)
      expect(authorStore.activeAuthorId).toBeNull()
    })
  })

  describe('Session Loading Scenarios', () => {
    it('should identify publications that need score updates after session loading', () => {
      const publicationsAfterSessionLoad = [
        {
          doi: '10.1234/test1',
          title: 'Test Publication 1',
          year: 2020,
          author: 'John Doe; Jane Smith',
          score: 0, // Default score - not yet computed
          boostKeywords: [], // Empty - not yet processed
          citationCount: undefined, // Session data doesn't include these yet
          referenceCount: undefined
        }
      ]

      // Test the logic that would be used by the modal component
      const needsUpdate = publicationsAfterSessionLoad.some(
        (pub) =>
          pub.score === 0 &&
          (!pub.boostKeywords || pub.boostKeywords.length === 0) &&
          (pub.citationCount === undefined || pub.referenceCount === undefined)
      )

      expect(needsUpdate).toBe(true)
    })

    it('should not flag publications with legitimate zero scores as needing updates', () => {
      const publicationsWithLegitimateZeroScores = [
        {
          doi: '10.1234/test1',
          score: 0,
          boostKeywords: ['machine learning'],
          citationCount: 0,
          referenceCount: 3
        }
      ]

      const needsUpdate = publicationsWithLegitimateZeroScores.some(
        (pub) =>
          pub.score === 0 &&
          (!pub.boostKeywords || pub.boostKeywords.length === 0) &&
          (pub.citationCount === undefined || pub.referenceCount === undefined)
      )

      expect(needsUpdate).toBe(false)
    })
  })
})