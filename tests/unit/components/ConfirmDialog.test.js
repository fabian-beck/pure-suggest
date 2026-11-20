import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import ConfirmDialog from '@/components/basic/ConfirmDialog.vue'
import { useModalStore } from '@/stores/modal.js'

describe('ConfirmDialog keyboard support', () => {
  let modalStore, action

  const mountDialog = (message = 'Clear the session?') => {
    const pinia = createPinia()
    setActivePinia(pinia)
    modalStore = useModalStore()
    action = vi.fn()
    modalStore.confirmDialog = { message, action, isShown: true, title: 'Confirm' }
    return mount(ConfirmDialog, { global: { plugins: [pinia] } })
  }

  beforeEach(() => setActivePinia(createPinia()))

  it('confirms with Enter', async () => {
    const wrapper = mountDialog()

    await wrapper.find('span').trigger('keydown', { key: 'Enter' })

    expect(action).toHaveBeenCalled()
    expect(modalStore.confirmDialog.isShown).toBe(false)
  })

  it('leaves Enter on the Cancel button to the button', async () => {
    const wrapper = mountDialog()

    await wrapper.findAll('button')[0].trigger('keydown', { key: 'Enter' })

    expect(action).not.toHaveBeenCalled()
  })

  it('does not confirm an import before a file was chosen', async () => {
    const wrapper = mountDialog('<input type="file" />')

    await wrapper.find('input[type="file"]').trigger('keydown', { key: 'Enter' })

    expect(action).not.toHaveBeenCalled()
  })

  it('cancels with Escape', async () => {
    const wrapper = mountDialog()

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    wrapper.find('span').element.dispatchEvent(event)

    expect(action).not.toHaveBeenCalled()
    expect(modalStore.confirmDialog.isShown).toBe(false)
    // Marked as handled, so that the global Escape does not also deactivate the publication
    expect(event.defaultPrevented).toBe(true)
  })
})
