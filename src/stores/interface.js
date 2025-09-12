import { defineStore } from 'pinia'

import { useAuthorStore } from './author.js'
import { useSessionStore } from './session.js'

export const useInterfaceStore = defineStore('interface', {
  state: () => {
    return {
      isLoading: false,
      loadingMessage: '',
      errorToast: {
        message: '',
        isShown: false,
        type: '',
        duration: 0
      },
      isNetworkExpanded: false,
      isNetworkCollapsed: false,
      isNetworkClusters: true,
      showPerformancePanel: false,
      searchQuery: '',
      isSearchModalDialogShown: false,
      isAuthorModalDialogShown: false,
      isExcludedModalDialogShown: false,
      isQueueModalDialogShown: false,
      isAboutModalDialogShown: false,
      isShareSessionModalDialogShown: false,
      // Network replot trigger (incremented to notify NetworkVisComponent to replot)
      networkReplotTrigger: 0,
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
      isMobile: true,
      isFilterMenuOpen: false,
      // Hover state management
      hoveredPublication: null // DOI of currently hovered publication
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
  actions: {
    clear() {
      this.isNetworkExpanded = false
      this.isNetworkCollapsed = false
      this.isNetworkClusters = true
      window.scrollTo(0, 0)
    },

    checkMobile() {
      this.isMobile = window.innerWidth < 1023
    },

    startLoading() {
      this.isLoading = true
    },

    endLoading() {
      this.isLoading = false
      this.loadingMessage = ''
    },

    showAbstract(publication) {
      this.infoDialog = {
        title: 'Abstract',
        message: `<div><i>${publication.abstract}</i></div>`,
        isShown: true
      }
    },

    showErrorMessage(errorMessage) {
      console.error(errorMessage)
      this.errorToast = {
        isShown: true,
        message: errorMessage
      }
    },

    showConfirmDialog(message, confirm, title = 'Confirm') {
      this.confirmDialog = {
        message,
        action: confirm,
        isShown: true,
        title
      }
    },

    openSearchModalDialog(query) {
      this.searchQuery = query ? query : ''
      this.isSearchModalDialogShown = true
    },

    openAuthorModalDialog(authorId) {
      // Ensure author data is computed before showing the modal
      const authorStore = useAuthorStore()
      const sessionStore = useSessionStore()

      // Check if we need to compute author data
      if (sessionStore.selectedPublications?.length > 0) {
        // Only recompute if no authors exist OR publications need score updates
        const needsRecomputation =
          authorStore.selectedPublicationsAuthors.length === 0 ||
          this.publicationsNeedScoreUpdate(sessionStore.selectedPublications)

        if (needsRecomputation) {
          // IMPORTANT: Publications need to have their scores updated before computing author data
          // Otherwise authors will have score=0 and no keywords
          if (this.publicationsNeedScoreUpdate(sessionStore.selectedPublications)) {
            sessionStore.updatePublicationScores()
          }

          authorStore.computeSelectedPublicationsAuthors(sessionStore.selectedPublications)
        }
      }

      this.isAuthorModalDialogShown = true

      // If authorId is provided, try to activate that author
      if (authorId) {
        // Check if author exists in the computed authors list
        const authorExists = authorStore.selectedPublicationsAuthors.some(
          (author) => author.id === authorId
        )
        if (authorExists) {
          authorStore.setActiveAuthor(authorId)
        }
      }
    },

    publicationsNeedScoreUpdate(publications) {
      // Check if publications have default/uninitialized scores
      // Publications with score=0 and empty boostKeywords likely haven't had updatePublicationScores() called
      return publications.some(
        (pub) =>
          pub.score === 0 &&
          (!pub.boostKeywords || pub.boostKeywords.length === 0) &&
          // Make sure it's not legitimately a zero score (has citation/reference data but calculated to 0)
          (pub.citationCount === undefined || pub.referenceCount === undefined)
      )
    },

    activatePublicationComponent (publicationComponent) {
      if (publicationComponent && typeof publicationComponent.focus === 'function') {
        publicationComponent.focus()
      }
    },

    triggerNetworkReplot() {
      // Increment trigger counter to notify NetworkVisComponent to replot
      this.networkReplotTrigger++
    },

    openFilterMenu() {
      if (this.isFilterMenuOpen) {
        this.closeFilterMenu()
        return false
      }
      this.isFilterMenuOpen = true
      return true
    },

    closeFilterMenu() {
      this.isFilterMenuOpen = false
    },

    setFilterMenuState(isOpen) {
      this.isFilterMenuOpen = isOpen
    },

    togglePerformancePanel() {
      this.showPerformancePanel = !this.showPerformancePanel
    },

    collapseNetwork() {
      this.isNetworkExpanded = false
      this.isNetworkCollapsed = true
    },

    expandNetwork() {
      this.isNetworkExpanded = true
      this.isNetworkCollapsed = false
    },

    restoreNetwork() {
      this.isNetworkExpanded = false
      this.isNetworkCollapsed = false
    },

    setHoveredPublication(publication) {
      // Set the DOI of the hovered publication, or null if no publication is hovered
      this.hoveredPublication = publication?.doi || null
    }
  }
})
