import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { useAppState } from '@/composables/useAppState.js'
import Publication from '@/core/Publication.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'

// Mock heavy dependencies that cause timeouts
vi.mock('@/services/SuggestionService.js', () => ({
  SuggestionService: {
    computeSuggestions: vi.fn().mockResolvedValue({ publications: [] })
  }
}))

vi.mock('@/lib/Cache.js', () => ({
  clearCache: vi.fn(),
  cachedFetch: vi.fn().mockResolvedValue(null)
}))

// Mock Publication.fetchData to avoid network calls
const originalFetchData = Publication.prototype.fetchData
beforeEach(() => {
  Publication.prototype.fetchData = vi.fn().mockResolvedValue()
})

afterEach(() => {
  Publication.prototype.fetchData = originalFetchData
})

describe('Newly Added Selected Papers', () => {
  let sessionStore
  let queueStore
  let appState

  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStore = useSessionStore()
    queueStore = useQueueStore()
    appState = useAppState()
  })

  describe('Publication.isNewlyAdded property', () => {
    it('initializes isNewlyAdded as false', () => {
      const publication = new Publication('10.1000/test')
      expect(publication.isNewlyAdded).toBe(false)
    })

    it('resets isNewlyAdded to false when resetToDefaults is called', () => {
      const publication = new Publication('10.1000/test')
      publication.isNewlyAdded = true
      publication.resetToDefaults()
      expect(publication.isNewlyAdded).toBe(false)
    })
  })

  describe('Session store newly added functionality', () => {
    it('marks publications as newly added when session was not empty', () => {
      // Add initial publication to make session non-empty
      sessionStore.selectedPublications.push(new Publication('10.1000/initial'))
      
      // Add new publications
      sessionStore.addPublicationsToSelection(['10.1000/new1', '10.1000/new2'])
      
      // Mark them as newly added (session was not empty)
      sessionStore.markPublicationsAsNewlyAdded(['10.1000/new1', '10.1000/new2'], false)
      
      const new1 = sessionStore.getSelectedPublicationByDoi('10.1000/new1')
      const new2 = sessionStore.getSelectedPublicationByDoi('10.1000/new2')
      const initial = sessionStore.getSelectedPublicationByDoi('10.1000/initial')
      
      expect(new1.isNewlyAdded).toBe(true)
      expect(new2.isNewlyAdded).toBe(true)
      expect(initial.isNewlyAdded).toBe(false)
    })

    it('does not mark publications as newly added when session was empty', () => {
      // Empty session - add first publications
      sessionStore.addPublicationsToSelection(['10.1000/first1', '10.1000/first2'])
      
      // Mark them as newly added (but session was empty)
      sessionStore.markPublicationsAsNewlyAdded(['10.1000/first1', '10.1000/first2'], true)
      
      const first1 = sessionStore.getSelectedPublicationByDoi('10.1000/first1')
      const first2 = sessionStore.getSelectedPublicationByDoi('10.1000/first2')
      
      expect(first1.isNewlyAdded).toBe(false)
      expect(first2.isNewlyAdded).toBe(false)
    })

    it('clears previously newly added flags when marking new ones', () => {
      // Add initial publications
      sessionStore.selectedPublications.push(new Publication('10.1000/initial'))
      sessionStore.addPublicationsToSelection(['10.1000/old'])
      sessionStore.markPublicationsAsNewlyAdded(['10.1000/old'], false)
      
      const oldPub = sessionStore.getSelectedPublicationByDoi('10.1000/old')
      expect(oldPub.isNewlyAdded).toBe(true)
      
      // Add newer publications
      sessionStore.addPublicationsToSelection(['10.1000/new'])
      sessionStore.markPublicationsAsNewlyAdded(['10.1000/new'], false)
      
      const newPub = sessionStore.getSelectedPublicationByDoi('10.1000/new')
      expect(newPub.isNewlyAdded).toBe(true)
      expect(oldPub.isNewlyAdded).toBe(false) // Should be cleared
    })

    it('clears all newly added flags', () => {
      sessionStore.selectedPublications.push(new Publication('10.1000/initial'))
      sessionStore.addPublicationsToSelection(['10.1000/new1', '10.1000/new2'])
      sessionStore.markPublicationsAsNewlyAdded(['10.1000/new1', '10.1000/new2'], false)
      
      const new1 = sessionStore.getSelectedPublicationByDoi('10.1000/new1')
      const new2 = sessionStore.getSelectedPublicationByDoi('10.1000/new2')
      
      expect(new1.isNewlyAdded).toBe(true)
      expect(new2.isNewlyAdded).toBe(true)
      
      sessionStore.clearNewlyAddedFlags()
      
      expect(new1.isNewlyAdded).toBe(false)
      expect(new2.isNewlyAdded).toBe(false)
    })
  })

  describe('Integration with queue operations', () => {
    it('handles empty session correctly in updateQueued', async () => {
      // Start with empty session
      expect(sessionStore.selectedPublicationsCount).toBe(0)

      // Queue some publications
      queueStore.selectedQueue = ['10.1000/first1', '10.1000/first2']

      await appState.updateQueued()

      const first1 = sessionStore.getSelectedPublicationByDoi('10.1000/first1')
      const first2 = sessionStore.getSelectedPublicationByDoi('10.1000/first2')

      // Should not be marked as newly added since session was empty
      expect(first1.isNewlyAdded).toBe(false)
      expect(first2.isNewlyAdded).toBe(false)
    })

    it('handles non-empty session correctly in updateQueued', async () => {
      // Start with non-empty session
      sessionStore.selectedPublications.push(new Publication('10.1000/initial'))

      // Queue some publications
      queueStore.selectedQueue = ['10.1000/new1', '10.1000/new2']

      await appState.updateQueued()

      const new1 = sessionStore.getSelectedPublicationByDoi('10.1000/new1')
      const new2 = sessionStore.getSelectedPublicationByDoi('10.1000/new2')
      const initial = sessionStore.getSelectedPublicationByDoi('10.1000/initial')

      // Should be marked as newly added since session was not empty
      expect(new1.isNewlyAdded).toBe(true)
      expect(new2.isNewlyAdded).toBe(true)
      expect(initial.isNewlyAdded).toBe(false)
    })
  })
})