import { watch } from 'vue'

import { useModalStore } from '@/stores/modal.js'

/**
 * Returns keyboard focus to where it was before a dialog opened once the dialog closes,
 * including into another dialog the closed one was opened from.
 * @param {() => boolean} isShown - Getter for the dialog's visibility.
 */
export function useDialogFocusReturn(isShown) {
  const modalStore = useModalStore()
  let focusBeforeDialog = null

  watch(isShown, (shown) => {
    if (shown) {
      focusBeforeDialog = document.activeElement
      return
    }
    const element = focusBeforeDialog
    focusBeforeDialog = null
    setTimeout(() => {
      if (
        !element?.isConnected ||
        // Focusing a listed publication activates it, so skip publications deactivated meanwhile
        element.matches('.publication-component:not(.is-active):not(.dialog-item)') ||
        // Don't pull focus out of another dialog that has opened in the meantime
        (modalStore.isAnyOverlayShown && !element.closest('.v-overlay--active'))
      ) {
        return
      }
      element.focus({ preventScroll: true })
    })
  })
}
