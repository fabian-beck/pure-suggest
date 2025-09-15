import { defineStore } from 'pinia'

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
      // Network replot trigger (incremented to notify NetworkVisComponent to replot)
      networkReplotTrigger: 0,
      isMobile: true,
      isFilterMenuOpen: false,
      // Hover state management
      hoveredPublication: null, // DOI of currently hovered publication
      // Keyboard navigation direction tracking
      lastNavigationDirection: null // 'up' or 'down' - for scroll behavior
    }
  },
  getters: {},
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

    showErrorMessage(errorMessage) {
      console.error(errorMessage)
      this.errorToast = {
        isShown: true,
        message: errorMessage
      }
    },

    activatePublicationComponent(publicationComponent, navigationDirection = null) {
      // Store navigation direction for scrolling behavior
      this.lastNavigationDirection = navigationDirection;
      if (publicationComponent && typeof publicationComponent.focus === 'function') {
        publicationComponent.focus();

        // Radical solution: ALWAYS center during keyboard navigation
        if (navigationDirection) {
          this.centerPublication(publicationComponent);
        }
      }
    },

    centerPublication(publicationComponent) {
      // Radical approach: Always center the publication, no conditions
      // Wait briefly for focus/activation to complete, then center
      setTimeout(() => {
        publicationComponent.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest"
        });
      }, 50); // Minimal delay just for focus completion
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