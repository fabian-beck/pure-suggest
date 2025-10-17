import { useAuthorStore } from '@/stores/author.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'
import { findAllKeywordMatches, highlightTitle, parseUniqueBoostKeywords } from '@/utils/scoringUtils.js'

/**
 * Composable for managing modal dialogs and their associated actions
 * Centralizes all modal-related functionality and provides a clean API
 * for components to interact with modals without directly accessing stores
 */
export function useModalManager() {
  const modalStore = useModalStore()
  const authorStore = useAuthorStore()
  const sessionStore = useSessionStore()

  /**
   * Opens the search modal dialog
   * @param {string} [query] - Optional initial search query
   */
  const openSearchModal = (query) => {
    modalStore.searchQuery = query || ''
    modalStore.isSearchModalDialogShown = true
  }

  /**
   * Opens the author modal dialog
   * @param {string} [authorId] - Optional author ID to set as active
   */
  const openAuthorModal = (authorId) => {
    modalStore.isAuthorModalDialogShown = true

    // If authorId is provided, set the active author
    if (authorId) {
      authorStore.setActiveAuthor(authorId)
    }
  }

  /**
   * Opens the excluded publications modal dialog
   */
  const openExcludedModal = () => {
    modalStore.isExcludedModalDialogShown = true
  }

  /**
   * Opens the queue modal dialog
   */
  const openQueueModal = () => {
    modalStore.isQueueModalDialogShown = true
  }

  /**
   * Opens the about modal dialog
   */
  const openAboutModal = () => {
    modalStore.isAboutModalDialogShown = true
  }

  /**
   * Opens the keyboard controls modal dialog
   */
  const openKeyboardControlsModal = () => {
    modalStore.isKeyboardControlsModalDialogShown = true
  }

  /**
   * Opens the share session modal dialog
   */
  const openShareSessionModal = () => {
    modalStore.isShareSessionModalDialogShown = true
  }

  /**
   * Opens the FCA configuration modal dialog
   */
  const openFcaConfigModal = () => {
    modalStore.isFcaConfigModalDialogShown = true
  }

  /**
   * Shows a confirmation dialog
   * @param {string} message - The confirmation message (supports HTML)
   * @param {Function} confirmAction - The action to execute on confirmation
   * @param {string} [title='Confirm'] - The dialog title
   */
  const showConfirmDialog = (message, confirmAction, title = 'Confirm') => {
    modalStore.confirmDialog = {
      message,
      action: confirmAction,
      isShown: true,
      title
    }
  }

  /**
   * Shows an information dialog (typically used for abstracts)
   * @param {Object} publication - The publication object with abstract
   */
  const showAbstract = (publication) => {
    // Get boost keywords and apply highlighting to abstract
    // Unlike titles, abstracts highlight ALL occurrences of ALL keywords and alternatives
    const uniqueBoostKeywords = parseUniqueBoostKeywords(sessionStore.boostKeywordString)
    const matches = findAllKeywordMatches(publication.abstract || '', uniqueBoostKeywords)
    const highlightedAbstract = highlightTitle(publication.abstract || '', matches)
    
    modalStore.infoDialog = {
      title: 'Abstract',
      message: `<div><i>${highlightedAbstract}</i></div>`,
      isShown: true
    }
  }

  /**
   * Closes all modal dialogs
   */
  const closeAllModals = () => {
    modalStore.isSearchModalDialogShown = false
    modalStore.isAuthorModalDialogShown = false
    modalStore.isExcludedModalDialogShown = false
    modalStore.isQueueModalDialogShown = false
    modalStore.isAboutModalDialogShown = false
    modalStore.isKeyboardControlsModalDialogShown = false
    modalStore.isShareSessionModalDialogShown = false
    modalStore.isFcaConfigModalDialogShown = false
    modalStore.confirmDialog.isShown = false
    modalStore.infoDialog.isShown = false
  }

  return {
    // Modal opening functions
    openSearchModal,
    openAuthorModal,
    openExcludedModal,
    openQueueModal,
    openAboutModal,
    openKeyboardControlsModal,
    openShareSessionModal,
    openFcaConfigModal,

    // Dialog functions
    showConfirmDialog,
    showAbstract,

    // Utility functions
    closeAllModals,

    // Expose computed properties from modal store for convenience
    isAnyOverlayShown: modalStore.isAnyOverlayShown
  }
}