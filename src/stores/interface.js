import { defineStore } from 'pinia'
import { markRaw } from 'vue'

import { createCancellationToken } from '@/lib/Cancellation.js'

// Desktop arrangements of the selected, suggested, and network panels (mobile always stacks them);
// sizes are relative track weights of the panels along each grid dimension
export const LAYOUTS = {
  networkBottom: { name: 'Network at the bottom', columns: [50, 50], rows: [55, 45] },
  networkRight: { name: 'Network on the right', columns: [45, 55], rows: [50, 50] },
  threeColumns: { name: 'Three columns', columns: [50, 50, 75], rows: [100] }
}

const LAYOUT_STORAGE_KEY = 'layoutSettings'

function loadLayoutSettings() {
  let stored = {}
  try {
    stored = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY)) || {}
  } catch {
    // fall back to defaults
  }
  const panelSizes = {}
  for (const [layout, defaults] of Object.entries(LAYOUTS)) {
    panelSizes[layout] = {}
    for (const axis of ['columns', 'rows']) {
      const sizes = stored.panelSizes?.[layout]?.[axis]
      const isValid =
        Array.isArray(sizes) &&
        sizes.length === defaults[axis].length &&
        sizes.every((size) => Number.isFinite(size) && size > 0)
      panelSizes[layout][axis] = isValid ? sizes : [...defaults[axis]]
    }
  }
  const mode = Object.hasOwn(LAYOUTS, stored.mode) ? stored.mode : 'auto'
  return { mode, panelSizes }
}

export const useInterfaceStore = defineStore('interface', {
  state: () => {
    const layoutSettings = loadLayoutSettings()
    return {
      isLoading: false,
      loadingMessage: '',
      // Token allowing the user to cancel the current loading operation (esc key/close button)
      loadingCancelToken: null,
      // Whether the current loading phase may be cancelled (e.g. loading selected
      // publications must always complete, but computing suggestions may be skipped)
      isLoadingCancelable: false,
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
      isWideScreen: false,
      isShortScreen: false,
      isFilterMenuOpen: false,
      layoutMode: layoutSettings.mode, // 'auto' or a key of LAYOUTS
      panelSizes: layoutSettings.panelSizes,
      // Hover state management
      hoveredPublication: null, // DOI of currently hovered publication
      // Keyboard navigation direction tracking
      lastNavigationDirection: null // 'up' or 'down' - for scroll behavior
    }
  },
  getters: {
    effectiveLayout(state) {
      if (state.layoutMode !== 'auto') return state.layoutMode
      if (state.isWideScreen) return 'threeColumns'
      return state.isShortScreen ? 'networkRight' : 'networkBottom'
    },

    isNetworkCollapsible() {
      return !this.isMobile && this.effectiveLayout === 'networkBottom'
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
      this.isMobile = window.innerWidth < 1024
      // The mobile view offers no control to leave the maximized network
      if (this.isMobile) this.isNetworkExpanded = false
      this.isWideScreen = window.innerWidth >= 2400
      this.isShortScreen = window.innerHeight < 800
    },

    setLayoutMode(mode) {
      this.layoutMode = mode
      this.restoreNetwork()
      this.saveLayoutSettings()
    },

    resetPanelSizes(layout, axis) {
      this.panelSizes[layout][axis] = [...LAYOUTS[layout][axis]]
      this.saveLayoutSettings()
    },

    saveLayoutSettings() {
      try {
        localStorage.setItem(
          LAYOUT_STORAGE_KEY,
          JSON.stringify({ mode: this.layoutMode, panelSizes: this.panelSizes })
        )
      } catch (error) {
        console.warn('Could not store layout settings:', error)
      }
    },

    startLoading() {
      this.isLoading = true
      this.loadingCancelToken = markRaw(createCancellationToken())
      this.isLoadingCancelable = false
    },

    endLoading() {
      this.isLoading = false
      this.loadingMessage = ''
      this.loadingCancelToken = null
      this.isLoadingCancelable = false
    },

    setLoadingCancelable(isCancelable) {
      this.isLoadingCancelable = isCancelable
    },

    cancelLoading() {
      if (this.isLoadingCancelable) {
        this.loadingCancelToken?.cancel()
      }
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