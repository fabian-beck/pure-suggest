import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'

import { useModalManager } from '@/composables/useModalManager.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'

describe('useModalManager - Abstract Highlighting', () => {
  let modalStore, sessionStore, modalManager

  beforeEach(() => {
    setActivePinia(createPinia())
    modalStore = useModalStore()
    sessionStore = useSessionStore()
    modalManager = useModalManager()
  })

  describe('showAbstract', () => {
    it('should display abstract without highlighting when no boost keywords are set', () => {
      sessionStore.boostKeywordString = ''
      
      const publication = {
        abstract: 'This is a test abstract about machine learning and data visualization.'
      }

      modalManager.showAbstract(publication)

      expect(modalStore.infoDialog.isShown).toBe(true)
      expect(modalStore.infoDialog.title).toBe('Abstract')
      expect(modalStore.infoDialog.message).toBe('<div><i>This is a test abstract about machine learning and data visualization.</i></div>')
    })

    it('should highlight matching keywords in abstract', () => {
      sessionStore.boostKeywordString = 'visualization, machine learning'
      
      const publication = {
        abstract: 'This is a test abstract about machine learning and data visualization.'
      }

      modalManager.showAbstract(publication)

      expect(modalStore.infoDialog.isShown).toBe(true)
      expect(modalStore.infoDialog.title).toBe('Abstract')
      
      // Check that the message contains highlighted keywords with underline styling
      const message = modalStore.infoDialog.message
      expect(message).toContain('<u style=')
      expect(message).toContain('text-decoration-color: hsl(48, 100%, 67%)')
      expect(message).toContain('text-decoration-thickness: 0.25rem')
      expect(message).toContain('machine learning')
      expect(message).toContain('visualization')
    })

    it('should handle abstracts with alternative keywords', () => {
      sessionStore.boostKeywordString = 'ML|machine learning, viz|visualization'
      
      const publication = {
        abstract: 'This abstract discusses ML and viz techniques.'
      }

      modalManager.showAbstract(publication)

      const message = modalStore.infoDialog.message
      expect(message).toContain('<u style=')
      expect(message).toContain('ML')
      expect(message).toContain('viz')
    })

    it('should handle empty or missing abstracts', () => {
      sessionStore.boostKeywordString = 'test'
      
      const publicationWithoutAbstract = {}
      modalManager.showAbstract(publicationWithoutAbstract)
      
      expect(modalStore.infoDialog.message).toBe('<div><i></i></div>')

      const publicationWithEmptyAbstract = { abstract: '' }
      modalManager.showAbstract(publicationWithEmptyAbstract)
      
      expect(modalStore.infoDialog.message).toBe('<div><i></i></div>')
    })

    it('should be case-insensitive when matching keywords', () => {
      sessionStore.boostKeywordString = 'MACHINE LEARNING'
      
      const publication = {
        abstract: 'This abstract discusses machine learning techniques.'
      }

      modalManager.showAbstract(publication)

      const message = modalStore.infoDialog.message
      expect(message).toContain('<u style=')
      expect(message).toContain('machine learning')
    })

    it('should only match first occurrence of each keyword group', () => {
      sessionStore.boostKeywordString = 'test'
      
      const publication = {
        abstract: 'This is a test abstract with multiple test occurrences for testing.'
      }

      modalManager.showAbstract(publication)

      const message = modalStore.infoDialog.message
      // Count number of underline tags - should only be one
      const underlineCount = (message.match(/<u style=/g) || []).length
      expect(underlineCount).toBe(1)
    })

    it('should use word boundary matching for short keywords', () => {
      sessionStore.boostKeywordString = 'AI'
      
      const publication = {
        abstract: 'AI techniques are different from contained letters.'
      }

      modalManager.showAbstract(publication)

      const message = modalStore.infoDialog.message
      // Should highlight "AI" at word boundary but not "AI" in "contained"
      expect(message).toContain('<u style=')
      expect(message).toContain('>AI<')
      // Verify "contained" is present without highlighting in the middle
      expect(message).toContain('contained')
      // Verify only one match (the word "AI", not the letters in "contained")
      const underlineCount = (message.match(/<u style=/g) || []).length
      expect(underlineCount).toBe(1)
    })
  })
})
