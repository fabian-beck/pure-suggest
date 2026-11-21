<script>
import LZString from 'lz-string'

import { useAppState } from './composables/useAppState.js'
import { onKey } from './lib/Keys.js'
import { trackRecentSession } from './lib/RecentSessions.js'
import { useInterfaceStore } from './stores/interface.js'
import { useModalStore } from './stores/modal.js'
import { useSessionStore } from './stores/session.js'
import { perfMonitor } from './utils/performance.js'

const GUTTER_SIZE = '0.5vw'

// Gutter areas are named after the grid dimension they resize and the panel track they follow
const GRID_AREAS = {
  networkBottom: `'selected gutter-columns-0 suggested'
    'gutter-rows-0 gutter-rows-0 gutter-rows-0'
    'vis vis vis'`,
  networkRight: `'selected gutter-columns-0 vis'
    'gutter-rows-0 gutter-columns-0 vis'
    'suggested gutter-columns-0 vis'`,
  threeColumns: `'selected gutter-columns-0 suggested gutter-columns-1 vis'`
}

function toGridTracks(panelSizes) {
  return panelSizes.map((size) => `minmax(0, ${size}fr)`).join(` ${GUTTER_SIZE} `)
}

export default {
  name: 'App',
  data() {
    return {
      hasLoadedFromUrl: false, // Track if we loaded session from URL
      originalUrlWithSession: null, // Store the original URL with session parameter
      isInitialLoadComplete: false // Track if initial load is complete
    }
  },
  setup() {
    const sessionStore = useSessionStore()
    const interfaceStore = useInterfaceStore()
    const modalStore = useModalStore()
    const { isEmpty, loadSession } = useAppState()
    trackRecentSession(sessionStore)
    // check if mobile
    interfaceStore.checkMobile()
    window.addEventListener('resize', interfaceStore.checkMobile)
    return { sessionStore, interfaceStore, modalStore, isEmpty, loadSession }
  },
  computed: {
    isNetworkShownCollapsed() {
      return this.interfaceStore.isNetworkCollapsed && this.interfaceStore.isNetworkCollapsible
    },

    mainGridStyle() {
      if (this.interfaceStore.isNetworkExpanded) {
        return { gridTemplateAreas: "'vis'", gridTemplateColumns: '100%', gridTemplateRows: '100%' }
      }
      const layout = this.interfaceStore.effectiveLayout
      const { columns, rows } = this.interfaceStore.panelSizes[layout]
      return {
        gridTemplateAreas: GRID_AREAS[layout],
        gridTemplateColumns: toGridTracks(columns),
        gridTemplateRows: this.isNetworkShownCollapsed
          ? `minmax(0, 1fr) ${GUTTER_SIZE} max-content`
          : toGridTracks(rows)
      }
    },

    panelGutters() {
      if (this.interfaceStore.isMobile || this.interfaceStore.isNetworkExpanded) return []
      const { columns, rows } = this.interfaceStore.panelSizes[this.interfaceStore.effectiveLayout]
      const gutters = columns.slice(1).map((_, index) => ({ axis: 'columns', index }))
      if (!this.isNetworkShownCollapsed) {
        gutters.push(...rows.slice(1).map((_, index) => ({ axis: 'rows', index })))
      }
      return gutters
    }
  },
  methods: {
    clearActivePublicationOnClick(event) {
      // Activating a publication on mouse press can shift the layout so that the release lands on
      // another element; the click then targets their common ancestor and must not undo it
      const focusedElement = document.activeElement
      if (
        focusedElement?.classList.contains('publication-component') &&
        event.target.contains(focusedElement)
      ) {
        return
      }
      this.sessionStore.clearActivePublication('clicked anywhere')
    },

    updatePageTitle() {
      const defaultTitle = 'PUREsuggest – Citation-based literature search'
      if (this.sessionStore.sessionName && this.sessionStore.sessionName.trim() !== '') {
        document.title = `${this.sessionStore.sessionName}: ${defaultTitle}`
      } else {
        document.title = defaultTitle
      }
    },

    checkAndLoadSessionFromUrl() {
      const urlParams = new URLSearchParams(window.location.search)
      const sessionParam = urlParams.get('session')

      if (sessionParam) {
        console.log('Found session parameter in URL, attempting to load...')
        try {
          // Decompress and parse the session data
          const decompressed = LZString.decompressFromEncodedURIComponent(sessionParam)
          if (!decompressed) throw new Error('Failed to decompress session data')

          const sessionData = JSON.parse(decompressed)

          // Store the original URL and set tracking flag
          this.originalUrlWithSession = window.location.href
          this.hasLoadedFromUrl = true

          // Use the loadSession method from useAppState which properly fetches metadata
          this.loadSession(sessionData)

          console.log('Session loaded successfully from URL (URL will be cleaned on first update)')
        } catch (error) {
          console.error('Error loading session from URL:', error)
          this.interfaceStore.showErrorMessage('Cannot read the session from the link.')
        }
      }
    },

    cleanUrlIfNeeded() {
      if (this.hasLoadedFromUrl) {
        const newUrl = window.location.pathname
        window.history.replaceState({}, document.title, newUrl)
        console.log('URL cleaned after first session update')
        this.hasLoadedFromUrl = false
        this.originalUrlWithSession = null
      }
    }
  },
  created() {
    window.addEventListener('keydown', onKey)
  },
  watch: {
    // Watch for any changes to session state and clean URL if we loaded from URL
    // Use shallow watchers since we only care about array length changes, not deep object mutations
    'sessionStore.selectedPublicationsCount': {
      handler() {
        if (this.isInitialLoadComplete) {
          this.cleanUrlIfNeeded()
        }
      }
    },
    'sessionStore.excludedPublicationsCount': {
      handler() {
        if (this.isInitialLoadComplete) {
          this.cleanUrlIfNeeded()
        }
      }
    },
    'sessionStore.boostKeywordString': {
      handler() {
        if (this.isInitialLoadComplete) {
          this.cleanUrlIfNeeded()
        }
      }
    },
    'sessionStore.sessionName': {
      handler() {
        if (this.isInitialLoadComplete) {
          this.cleanUrlIfNeeded()
        }
        this.updatePageTitle()
      }
    }
  },
  mounted() {
    window.onbeforeunload = () => {
      window.scrollTo(0, 0)
      // triggers a prompt before closing/reloading the page
      if (!this.isEmpty) return ''
      return null
    }

    // Check for session parameter in URL and load if present
    this.checkAndLoadSessionFromUrl()

    // Update page title based on current session name
    this.updatePageTitle()

    // Mark initial load as complete after a short delay to allow session loading to finish
    this.$nextTick(() => {
      setTimeout(() => {
        this.isInitialLoadComplete = true
      }, 1000)
    })

    // Log page performance metrics
    setTimeout(() => {
      perfMonitor.logPageMetrics()
      perfMonitor.logMemoryUsage()
    }, 1000)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', onKey)
  }
}
</script>

<!---------------------------------------------------------------------------------->

<template>
  <v-app id="app" data-app>
    <HeaderPanel id="header" />
    <main
      id="main"
      @click="clearActivePublicationOnClick"
      :style="mainGridStyle"
    >
      <SelectedPublicationsComponent id="selected" v-show="!interfaceStore.isNetworkExpanded" />
      <SuggestedPublicationsComponent id="suggested" v-show="!interfaceStore.isNetworkExpanded" />
      <NetworkVisComponent id="network" />
      <PanelGutter
        v-for="gutter in panelGutters"
        :key="`${gutter.axis}-${gutter.index}`"
        :axis="gutter.axis"
        :index="gutter.index"
      />
      <LandingComponent v-if="isEmpty" />
    </main>
    <QuickAccessBar
      id="quick-access"
      class="is-hidden-desktop"
      v-show="!modalStore.isAnyOverlayShown && !isEmpty"
    >
    </QuickAccessBar>
    <!-- Modal dialogs -->
    <SearchModalDialog />
    <AuthorModalDialog />
    <ExcludedModalDialog />
    <QueueModalDialog />
    <AboutModalDialog />
    <KeyboardControlsModalDialog />
    <ShareSessionModalDialog />
    <ConceptConfigModalDialog />
    <AiRecommendationModalDialog />
    <LlmSettingsModalDialog />
    <!-- Other dialogs and overlays -->
    <v-overlay
      v-model="interfaceStore.isLoading"
      class="align-center justify-center main-overlay"
      persistent
    >
      <v-btn
        v-if="interfaceStore.isLoadingCancelable"
        class="loading-cancel-button"
        icon="mdi-close"
        variant="text"
        size="small"
        v-tippy="'Stop loading (Esc)'"
        @click="interfaceStore.cancelLoading()"
      ></v-btn>
      <div class="d-flex flex-column align-center justify-center">
        <div>
          <v-progress-circular color="white" indeterminate size="64"></v-progress-circular>
        </div>
        <div
          class="global-loading-message has-text-white mt-4"
          v-if="interfaceStore.loadingMessage"
          role="status"
        >
          {{ interfaceStore.loadingMessage }}
        </div>
      </div>
    </v-overlay>
    <ConfirmDialog />
    <InfoDialog />
    <ErrorToast />
  </v-app>
</template>

<!---------------------------------------------------------------------------------->

<style lang="scss">
$block-spacing: 0.5rem;
$box-padding: 1rem;

/* Chrome scrollbar fix #566 - hide scrollbars at document level */
html,
body {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */

  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
}

// Vuetify teleports dialog overlays to `body > .v-overlay-container`, outside
// `#app`, so modal buttons need the same baseline as in-app buttons to match.
// Explicitly-small buttons keep their size.
#app .v-btn:not(.session-state-button):not(.filter-button):not(.boost-button):not(.v-btn--icon),
.v-overlay-container
  .v-btn:not(.session-state-button):not(.filter-button):not(.boost-button):not(.v-btn--icon):not(
    .v-btn--size-small
  ) {
  min-height: 36px;
  padding: 0 16px;
  font-size: 0.875rem;
}

#app .v-btn:not(.session-state-button):not(.filter-button):not(.boost-button) .v-btn__content,
.v-overlay-container
  .v-btn:not(.session-state-button):not(.filter-button):not(.boost-button):not(.v-btn--size-small)
  .v-btn__content {
  letter-spacing: 0.0892857143em;
  text-transform: uppercase;
}

#app .v-application__wrap {
  display: grid;
  grid-template-areas:
    'header'
    'main';
  height: 100vh;
  grid-template-rows: max-content auto;
  font-family:
    BlinkMacSystemFont,
    -apple-system,
    Segoe UI,
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    Fira Sans,
    Droid Sans,
    Helvetica Neue,
    Helvetica,
    Arial,
    sans-serif !important;

  /* Hide the main application-level scrollbar that causes Chrome issue #566 */
  overflow: hidden;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */

  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  & p {
    margin: 0;
  }

  & #header {
    grid-area: header;
  }

  & #main {
    grid-area: main;
    position: relative;
    margin: 0.5vw;
    margin-top: 0;
    display: grid;
    height: calc(100% - 0.5vw);
    overflow: hidden;

    & #selected {
      grid-area: selected;
      overflow-y: auto;
    }

    & #suggested {
      grid-area: suggested;
      overflow-y: auto;
    }

    & #network {
      grid-area: vis;
    }

    & .box {
      margin: 0;
      padding: min(0.5vw, 1rem);

      & > .level {
        margin-bottom: calc(0.5rem - 2px);

        & .v-btn {
          height: 28px !important;
          min-height: 28px !important;
        }

        & .v-btn--icon {
          width: 28px !important;
        }
      }
    }
  }
}

// placed outside the #app scope to apply to tooltips also
.key {
  text-decoration: underline;
}

.unknown {
  color: var(--bulma-danger);
}

.dialog .modal-card {
  max-width: 720px;
}

.modal {
  & .card {
    position: relative;
  }

  & .card-content {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
}

.main-overlay {
  z-index: 6000 !important;
}

.loading-cancel-button {
  position: fixed;
  top: 1rem;
  right: 1rem;
  color: white;
}

.global-loading-message {
  max-width: min(80vw, 36rem);
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: rgb(0 0 0 / 52%);
  line-height: 1.35;
  text-align: center;
  overflow-wrap: anywhere;
  box-shadow: 0 0.25rem 1rem rgb(0 0 0 / 20%);
}

/* Global modal dialog overlay styles - ensures all modals appear above header and block interaction */
/* Use attribute selectors to target the specific dialog classes we set */
.v-overlay.v-dialog.modal-dialog-overlay,
.v-overlay.v-dialog.info-dialog-overlay,
.v-overlay.v-dialog.confirm-dialog-overlay {
  z-index: 9000 !important; /* Much higher than default Vuetify z-indexes */
}

.v-overlay.v-dialog.modal-dialog-overlay .v-overlay__scrim,
.v-overlay.v-dialog.info-dialog-overlay .v-overlay__scrim,
.v-overlay.v-dialog.confirm-dialog-overlay .v-overlay__scrim {
  z-index: 8999 !important;
  /* Ensure the dark overlay covers the full viewport including header */
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  position: fixed !important;
}

.v-overlay.v-dialog.modal-dialog-overlay .v-overlay__content,
.v-overlay.v-dialog.info-dialog-overlay .v-overlay__content,
.v-overlay.v-dialog.confirm-dialog-overlay .v-overlay__content {
  z-index: 9001 !important;
}

@media screen and (max-width: 1023px) {
  /* Re-enable scrolling for mobile but keep scrollbars hidden */
  html,
  body {
    overflow: visible !important; /* Allow scrolling but hide scrollbars */
  }

  #app .v-application__wrap {
    display: block;
    margin-bottom: 5rem;
    overflow: visible !important;

    & #header {
      position: static;
      top: auto;
      left: auto;
      right: auto;
      z-index: 1000;
      background: white;

      & .v-app-bar {
        position: fixed !important;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
      }
    }

    & #main {
      display: block;
      margin: 0;
      padding-top: 2.8rem; /* Account for fixed header height */
      overflow: visible; /* Let document handle scrolling, not main element */
      height: auto;

      & .box {
        margin: 0.25rem;
        padding: 0.25rem;
      }

      & #selected {
        min-height: 20rem;
      }

      & #suggested {
        min-height: 20rem;
      }

      & #network .box {
        min-height: 70vh;
      }

      & .level-left + .level-right {
        margin-top: 0.5rem;
      }

      /* Empty space for quick access buttons; used "::after" instead of plain margin-bottom as workaround for Chrome */
      &::after {
        content: '';
        min-height: 4rem;
        display: block;
      }
    }

    #quick-access {
      position: fixed;
      bottom: 0.5rem;
      width: 100%;
      text-align: center;
      z-index: 3000;
    }
  }

  // placed outside the #app scope to apply to tooltips also
  .key {
    text-decoration: none;
  }

  .modal {
    & .modal-content {
      max-height: 100%;
    }

    & .card-content {
      max-height: calc(100vh - 140px);
    }
  }

  .modal-close {
    right: 5px;
    top: 5px;
  }
}
</style>
