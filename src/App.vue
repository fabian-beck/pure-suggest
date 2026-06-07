<script>
import LZString from 'lz-string'
import { watch } from 'vue'
import { useTheme } from 'vuetify'

import { useAppState } from './composables/useAppState.js'
import { isDark } from './composables/useDarkMode.js'
import { onKey } from './lib/Keys.js'
import { useInterfaceStore } from './stores/interface.js'
import { useModalStore } from './stores/modal.js'
import { useSessionStore } from './stores/session.js'
import { perfMonitor } from './utils/performance.js'

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
    interfaceStore.checkMobile()
    window.addEventListener('resize', interfaceStore.checkMobile)
    const theme = useTheme()
    watch(
      isDark,
      (dark) => {
        theme.global.name.value = dark ? 'dark' : 'light'
        document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      },
      { immediate: true }
    )
    return { sessionStore, interfaceStore, modalStore, isEmpty, loadSession }
  },
  methods: {
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
          if (!decompressed) {
            console.error('Failed to decompress session data')
            return
          }

          const sessionData = JSON.parse(decompressed)

          // Store the original URL and set tracking flag
          this.originalUrlWithSession = window.location.href
          this.hasLoadedFromUrl = true

          // Use the loadSession method from useAppState which properly fetches metadata
          this.loadSession(sessionData)

          console.log('Session loaded successfully from URL (URL will be cleaned on first update)')
        } catch (error) {
          console.error('Error loading session from URL:', error)
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
    document.removeEventListener('keydown', onKey)
  }
}
</script>

<!---------------------------------------------------------------------------------->

<template>
  <v-app id="app" data-app>
    <HeaderPanel id="header" />
    <div
      id="main"
      @click="sessionStore.clearActivePublication('clicked anywhere')"
      :class="{
        'network-expanded': interfaceStore.isNetworkExpanded,
        'is-empty': isEmpty
      }"
    >
      <SeedBar id="seeds" v-show="!isEmpty && !interfaceStore.isNetworkExpanded" />
      <div id="map">
        <NetworkVisComponent :svg-width="1500" :svg-height="600" />
        <MapEmptyState v-if="isEmpty" />
      </div>
      <div id="side" v-show="!isEmpty && !interfaceStore.isNetworkExpanded">
        <PublicationDetailPanel class="side__detail" />
        <SuggestedPublicationsComponent class="side__list" />
      </div>
    </div>
    <QuickAccessBar
      id="quick-access"
      class="is-hidden-desktop"
      v-show="!modalStore.isAnyOverlayShown"
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
    <!-- Other dialogs and overlays -->
    <v-overlay
      v-model="interfaceStore.isLoading"
      class="align-center justify-center main-overlay"
      persistent
    >
      <div class="d-flex flex-column align-center justify-center">
        <div>
          <v-progress-circular color="white" indeterminate size="64"></v-progress-circular>
        </div>
        <div class="global-loading-message has-text-white mt-4" v-if="interfaceStore.loadingMessage">
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

#app .v-btn:not(.session-state-button):not(.filter-button):not(.boost-button):not(.v-btn--icon) {
  min-height: 36px;
  padding: 0 16px;
  font-size: 0.875rem;
}

#app .v-btn:not(.session-state-button):not(.filter-button):not(.boost-button) .v-btn__content {
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
    margin: 0.5vw;
    margin-top: 0;
    display: grid;
    grid-template-areas:
      'seeds seeds'
      'list  map';
    height: calc(100% - 0.5vw);
    overflow: hidden;
    grid-template-columns: minmax(340px, 30vw) 1fr;
    grid-template-rows: max-content 1fr;
    gap: 0.5vw;

    /* Empty session: the map fills everything and shows the onboarding overlay */
    &.is-empty {
      grid-template-areas: 'map';
      grid-template-columns: 1fr;
      grid-template-rows: 1fr;
    }

    /* Maximized map: hide the suggestions list */
    &.network-expanded {
      grid-template-areas: 'map';
      grid-template-columns: 1fr;
      grid-template-rows: 1fr;
    }

    & #seeds {
      grid-area: seeds;
    }

    & #map {
      grid-area: map;
      position: relative;
      overflow: hidden;
      min-height: 0;
      min-width: 0;

      /* Anchor the network to exactly fill the map cell so the SVG measures the
         column (not its content width / the screen) — keeps the map centered. */
      & .network-of-references {
        position: absolute;
        inset: 0;

        & .box {
          border-radius: 8px;
          box-shadow: 0 1px 8px rgba(0, 0, 0, 0.12);
          overflow: hidden;
        }
      }
    }

    & #side {
      grid-area: list;
      overflow: hidden;
      min-height: 0;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5vw;

      & .side__detail {
        flex: 0 0 auto;
        max-height: 50%;
        overflow: hidden;
      }

      & .side__list {
        flex: 1 1 0;
        min-height: 0;
      }
    }

    & .box {
      margin: 0;
      padding: min(0.5vw, 1rem);

      & > .level {
        margin-bottom: 0.5rem;
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
      position: static; /* Change to static so intro message flows naturally */
      top: auto;
      left: auto;
      right: auto;
      z-index: 1000;
      background: var(--surface-bg);

      /* Keep header toolbar fixed */
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

      & #seeds {
        margin: 0.25rem;
      }

      & #map {
        min-height: 70vh;
        overflow: visible;
      }

      & #side {
        display: block;
        overflow: visible;

        & .side__detail {
          max-height: none;
          overflow: visible;
          margin-bottom: 0.5rem;
        }

        & .side__list {
          min-height: 24rem;
        }
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

@media screen and (min-width: 2400px) {
  /* On ultra-wide screens give the suggestions list a fixed comfortable width */
  #app .v-application__wrap #main:not(.is-empty):not(.network-expanded) {
    grid-template-columns: 30rem 1fr;
  }
}
</style>
