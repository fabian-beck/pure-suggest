<template>
  <v-app id="app" data-app>
    <HeaderPanel id="header" />
    <div id="main" @click="sessionStore.clearActivePublication('clicked anywhere')"
      :class="{ 'network-expanded': interfaceStore.isNetworkExpanded, 'network-collapsed': interfaceStore.isNetworkCollapsed }">
      <SelectedPublicationsComponent id="selected" v-show="!interfaceStore.isNetworkExpanded" />
      <SuggestedPublicationsComponent id="suggested" v-show="!interfaceStore.isNetworkExpanded" />
      <NetworkVisComponent id="network" :svgWidth="1500" :svgHeight="600" />
    </div>
    <QuickAccessBar id="quick-access" class="is-hidden-desktop" v-show="!interfaceStore.isAnyOverlayShown">
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
    <v-overlay v-model="interfaceStore.isLoading" class="align-center justify-center main-overlay" persistent>
      <div class="d-flex flex-column align-center justify-center">
        <div>
          <v-progress-circular color="white" indeterminate size="64"></v-progress-circular>
        </div>
        <div class="has-text-white mt-4" v-if="interfaceStore.loadingMessage">{{ interfaceStore.loadingMessage }}</div>
      </div>
    </v-overlay>
    <ConfirmDialog />
    <InfoDialog />
    <ErrorToast />
  </v-app>
</template>

<!---------------------------------------------------------------------------------->

<script>
import { useSessionStore } from "./stores/session.js";
import { useInterfaceStore } from "./stores/interface.js";
import { perfMonitor } from "./utils/performance.js";
import { useAppState } from "./composables/useAppState.js";
import LZString from 'lz-string';

import { onKey } from "./lib/Keys.js";

export default {
  name: "App",
  data() {
    return {
      hasLoadedFromUrl: false, // Track if we loaded session from URL
      originalUrlWithSession: null, // Store the original URL with session parameter
      isInitialLoadComplete: false, // Track if initial load is complete
    };
  },
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    const { isEmpty, loadSession } = useAppState();
    // check if mobile 
    interfaceStore.checkMobile();
    window.addEventListener("resize", interfaceStore.checkMobile);
    return { sessionStore, interfaceStore, isEmpty, loadSession };
  },
  methods: {
    checkAndLoadSessionFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionParam = urlParams.get('session');
      
      if (sessionParam) {
        console.log("Found session parameter in URL, attempting to load...");
        try {
          // Decompress and parse the session data
          const decompressed = LZString.decompressFromEncodedURIComponent(sessionParam);
          if (!decompressed) {
            console.error("Failed to decompress session data");
            return;
          }
          
          const sessionData = JSON.parse(decompressed);
          
          // Store the original URL and set tracking flag
          this.originalUrlWithSession = window.location.href;
          this.hasLoadedFromUrl = true;
          
          // Use the loadSession method from useAppState which properly fetches metadata
          this.loadSession(sessionData);
          
          console.log("Session loaded successfully from URL (URL will be cleaned on first update)");
        } catch (error) {
          console.error("Error loading session from URL:", error);
        }
      }
    },
    
    cleanUrlIfNeeded() {
      if (this.hasLoadedFromUrl) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        console.log("URL cleaned after first session update");
        this.hasLoadedFromUrl = false;
        this.originalUrlWithSession = null;
      }
    }
  },
  created() {
    window.addEventListener("keydown", onKey);
  },
  watch: {
    // Watch for any changes to session state and clean URL if we loaded from URL
    'sessionStore.selectedPublications': {
      handler() {
        if (this.isInitialLoadComplete) {
          this.cleanUrlIfNeeded();
        }
      },
      deep: true
    },
    'sessionStore.excludedPublicationsDois': {
      handler() {
        if (this.isInitialLoadComplete) {
          this.cleanUrlIfNeeded();
        }
      },
      deep: true
    },
    'sessionStore.boostKeywordString': {
      handler() {
        if (this.isInitialLoadComplete) {
          this.cleanUrlIfNeeded();
        }
      }
    },
    'sessionStore.sessionName': {
      handler() {
        if (this.isInitialLoadComplete) {
          this.cleanUrlIfNeeded();
        }
      }
    }
  },
  mounted() {
    window.onbeforeunload = () => {
      window.scrollTo(0, 0);
      // triggers a prompt before closing/reloading the page
      if (!this.isEmpty) return "";
      return null;
    };
    
    // Check for session parameter in URL and load if present
    this.checkAndLoadSessionFromUrl();
    
    // Mark initial load as complete after a short delay to allow session loading to finish
    this.$nextTick(() => {
      setTimeout(() => {
        this.isInitialLoadComplete = true;
      }, 1000);
    });
    
    // Log page performance metrics
    setTimeout(() => {
      perfMonitor.logPageMetrics();
      perfMonitor.logMemoryUsage();
    }, 1000);
    
  },
  beforeUnmount() {
    document.removeEventListener("keydown", this.onKey);
  },
};
</script>

<!---------------------------------------------------------------------------------->

<style lang="scss">
$block-spacing: 0.5rem;
$box-padding: 1rem;

/* Chrome scrollbar fix #566 - hide scrollbars at document level */
html, body {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  
  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
}


#app .v-application__wrap {
  display: grid;
  grid-template-areas:
    "header"
    "main";
  height: 100vh;
  grid-template-rows: max-content auto;
  font-family: BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, Helvetica, Arial, sans-serif !important;
  
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
    display: grid;
    grid-template-areas:
      "selected suggested"
      "vis vis";
    height: calc(100% - 1vw);
    overflow: hidden;
    grid-template-columns: 50fr 50fr;
    grid-template-rows: auto 35vh;
    gap: 0.5vw;

    &.network-expanded {
      grid-template-areas: "vis";
      grid-template-columns: auto;
      grid-template-rows: auto;
    }

    &.network-collapsed {
      grid-template-rows: auto max-content;
    }

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

      &>.level {
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

/* Ensure only modal dialogs (not confirm dialogs) appear above header */
.modal-dialog-overlay {
  z-index: 6000 !important;
}

.modal-dialog-overlay .v-overlay__scrim {
  z-index: 6000 !important;
}



@media screen and (max-width: 1023px) {
  #app .v-application__wrap {
    display: block;
    margin-bottom: 5rem;

    & #main {
      display: block;
      margin: 0;
      overflow: scroll;
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

      & .level-left+.level-right {
        margin-top: 0.5rem;
      }

      /* Empty space for quick access buttons; used "::after" instead of plain margin-bottom as workaround for Chrome */
      &::after {
        content: "";
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
  #app .v-application__wrap #main {
    grid-template-areas: "selected suggested vis";
    grid-template-columns: 50fr 50fr 75fr;
    grid-template-rows: auto;
  }
}
</style>