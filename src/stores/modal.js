import { defineStore } from 'pinia'

export const useModalStore = defineStore('modal', {
  state: () => {
    return {
      isSearchModalDialogShown: false,
      isAuthorModalDialogShown: false,
      isExcludedModalDialogShown: false,
      isQueueModalDialogShown: false,
      isAboutModalDialogShown: false,
      isShareSessionModalDialogShown: false,
      isKeyboardControlsModalDialogShown: false,
      confirmDialog: {
        message: '',
        action: () => {},
        isShown: false,
        title: ''
      },
      infoDialog: {
        message: '',
        isShown: false,
        title: ''
      },
      searchQuery: ''
    }
  },
  getters: {
    isAnyOverlayShown() {
      return (
        this.confirmDialog.isShown ||
        this.infoDialog.isShown ||
        this.isSearchModalDialogShown ||
        this.isAuthorModalDialogShown ||
        this.isExcludedModalDialogShown ||
        this.isQueueModalDialogShown ||
        this.isAboutModalDialogShown ||
        this.isShareSessionModalDialogShown ||
        this.isKeyboardControlsModalDialogShown
      )
    }
  },
  actions: {}
})