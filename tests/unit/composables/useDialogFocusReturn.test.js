import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'

import { useDialogFocusReturn } from '@/composables/useDialogFocusReturn.js'
import { useModalStore } from '@/stores/modal.js'

describe('useDialogFocusReturn', () => {
  let scope, isShown, modalStore

  beforeEach(() => {
    setActivePinia(createPinia())
    modalStore = useModalStore()
    isShown = ref(false)
    scope = effectScope()
    scope.run(() => useDialogFocusReturn(() => isShown.value))
  })

  afterEach(() => {
    scope.stop()
    document.body.innerHTML = ''
  })

  const openAndCloseDialogFrom = async (element) => {
    element.tabIndex = 0
    element.focus()
    isShown.value = true
    await nextTick()
    element.blur()
    isShown.value = false
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve))
    return document.activeElement
  }

  const appendElement = (html) => {
    document.body.insertAdjacentHTML('beforeend', html)
    return document.body.querySelector('[data-target]')
  }

  it('returns focus to the previously focused element', async () => {
    const button = appendElement('<button data-target></button>')

    expect(await openAndCloseDialogFrom(button)).toBe(button)
  })

  it('does not refocus (and thereby reactivate) a publication deactivated meanwhile', async () => {
    const publication = appendElement('<div class="publication-component" data-target></div>')

    expect(await openAndCloseDialogFrom(publication)).not.toBe(publication)
  })

  it('returns focus into a dialog that stays open', async () => {
    // e.g., to a search result after closing its abstract
    const item = appendElement(
      '<div class="v-overlay v-overlay--active"><div class="publication-component dialog-item" data-target></div></div>'
    )
    modalStore.isSearchModalDialogShown = true

    expect(await openAndCloseDialogFrom(item)).toBe(item)
  })

  it('does not pull focus out of another dialog opened meanwhile', async () => {
    const button = appendElement('<button data-target></button>')
    modalStore.isAuthorModalDialogShown = true

    expect(await openAndCloseDialogFrom(button)).not.toBe(button)
  })
})
