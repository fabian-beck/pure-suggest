import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'

import { useModalManager } from '@/composables/useModalManager.js'
import { useAuthorStore } from '@/stores/author.js'
import { useModalStore } from '@/stores/modal.js'

describe('Author Modal Integration Workflow', () => {
  let modalStore
  let authorStore
  let modalManager

  beforeEach(() => {
    setActivePinia(createPinia())

    modalStore = useModalStore()
    authorStore = useAuthorStore()
    modalManager = useModalManager()
  })

  describe('Author Modal Opening', () => {
    it('should open modal and set author ID when provided', () => {
      modalManager.openAuthorModal('test-author-id')

      expect(modalStore.isAuthorModalDialogShown).toBe(true)
      expect(authorStore.activeAuthorId).toBe('test-author-id')
    })

    it('should open modal without setting author ID when not provided', () => {
      modalManager.openAuthorModal()

      expect(modalStore.isAuthorModalDialogShown).toBe(true)
      expect(authorStore.activeAuthorId).toBeNull()
    })
  })
})