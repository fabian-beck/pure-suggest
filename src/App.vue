<template>
  <div id="app">
    <HeaderPanel
      id="header"
      :isMobile="isMobile"
      v-on:openAbout="interfaceStore.isAboutPageShown = true"
      v-on:openKeyboardControls="interfaceStore.isKeyboardControlsShown = true"
      v-on:clearCache="clearCache"
    />
    <div
      id="main"
      @click="sessionStore.clearActivePublication('clicked anywhere')"
      :class="{ 'network-expanded': interfaceStore.isNetworkExpanded }"
    >
      <SelectedPublicationsComponent
        id="selected"
        ref="selected"
        v-on:add="sessionStore.addPublicationsToSelection"
        v-on:startSearching="startSearchingSelected"
        v-on:searchEndedWithoutResult="notifySearchEmpty"
        v-on:openSearch="openSearch"
        v-on:loadExample="loadExample"
        v-on:importSession="importSession"
      />
      <SuggestedPublicationsComponent
        id="suggested"
        ref="suggested"
        v-on:loadMore="loadMoreSuggestions"
      />
      <NetworkVisComponent
        id="network"
        ref="network"
        :svgWidth="1500"
        :svgHeight="600"
      />
    </div>
    <QuickAccessBar id="quick-access" class="is-hidden-desktop" />
    <b-modal v-model="interfaceStore.isSearchPanelShown">
      <SearchPanel
        :initialSearchQuery="interfaceStore.searchQuery"
        v-on:add="sessionStore.addPublicationsToSelection"
        v-on:searchEmpty="notifySearchEmpty"
      />
    </b-modal>
    <b-modal v-model="interfaceStore.isAboutPageShown">
      <AboutPage />
    </b-modal>
    <b-modal v-model="interfaceStore.isKeyboardControlsShown">
      <KeyboardControlsPage />
    </b-modal>
    <b-loading
      :is-full-page="true"
      v-model="interfaceStore.isLoading"
      :can-cancel="false"
    ></b-loading>
  </div>
</template>

<!---------------------------------------------------------------------------------->

<script>
import { useSessionStore } from "./stores/session.js";
import { useInterfaceStore } from "./stores/interface.js";

import HeaderPanel from "./components/HeaderPanel.vue";
import SelectedPublicationsComponent from "./components/SelectedPublicationsComponent.vue";
import SuggestedPublicationsComponent from "./components/SuggestedPublicationsComponent.vue";
import NetworkVisComponent from "./components/NetworkVisComponent.vue";
import QuickAccessBar from "./components/QuickAccessBar.vue";
import SearchPanel from "./components/SearchPanel.vue";
import AboutPage from "./components/AboutPage.vue";
import KeyboardControlsPage from "./components/KeyboardControlsPage.vue";

import { clearCache } from "./Cache.js";
import { onKey } from "./Keys.js";

export default {
  name: "App",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
  },
  components: {
    HeaderPanel,
    SelectedPublicationsComponent,
    SuggestedPublicationsComponent,
    NetworkVisComponent,
    QuickAccessBar,
    SearchPanel,
    AboutPage,
    KeyboardControlsPage,
  },
  data() {
    return {
      
    };
  },
  computed: {
    isMobile: function () {
      return window.innerWidth <= 1023;
    },
  },
  methods: {
    startSearchingSelected: function () {
      this.interfaceStore.startLoading();
      this.interfaceStore.updateLoadingToast(
        "Searching for publication with matching title",
        "is-primary"
      );
    },

    loadMoreSuggestions: function () {
      this.sessionStore.updateSuggestions(
        this.sessionStore.maxSuggestions + 50
      );
    },

    openSearch: function (query, message) {
      this.interfaceStore.searchQuery = query;
      this.interfaceStore.isSearchPanelShown = true;
      this.interfaceStore.showImportantMessage(message);
    },

    notifySearchEmpty: function () {
      this.interfaceStore.showErrorMessage("No matching publications found");
      this.interfaceStore.endLoading();
    },

    importSession: function (file) {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        try {
          const content = fileReader.result;
          const session = JSON.parse(content);
          this.loadSession(session);
        } catch {
          this.interfaceStore.showErrorMessage(`Cannot read JSON from file.`);
        }
      };
      fileReader.readAsText(file);
    },

    clearCache: function () {
      clearCache();
      this.sessionStore.clearSession();
    },

    loadSession: function (session) {
      console.log(`Loading session ${JSON.stringify(session)}`);
      if (!session || !session.selected) {
        this.interfaceStore.showErrorMessage(
          "Cannot read session state from JSON."
        );
        return;
      }
      if (session.boost) {
        this.sessionStore.setBoostKeywordString(session.boost);
      }
      if (session.excluded) {
        this.sessionStore.excludedPublicationsDois = session.excluded;
      }
      this.sessionStore.addPublicationsToSelection(session.selected);
    },

    loadExample: function () {
      const session = {
        selected: [
          "10.1109/tvcg.2015.2467757",
          "10.1109/tvcg.2015.2467621",
          "10.1002/asi.24171",
        ],
        boost: "cit, vis",
      };
      this.loadSession(session);
    },
  },

  created() {
    window.addEventListener("keydown", onKey);
  },

  mounted() {
    // triggers a prompt before closing/reloading the page
    window.onbeforeunload = () => {
      if (!this.sessionStore.isEmpty) return "";
      return null;
    };
  },

  beforeDestroy() {
    document.removeEventListener("keydown", this.onKey);
  },
};
</script>

<!---------------------------------------------------------------------------------->

<style lang="scss">
@import "~bulma/sass/utilities/_all";

$block-spacing: 0.5rem;
$box-padding: 1rem;

@import "~bulma";
@import "~buefy/src/scss/buefy";

#app {
  display: grid;
  grid-template-areas:
    "header"
    "main";
  height: 100vh;
  grid-template-rows: max-content auto;

  & #header {
    grid-area: header;
  }

  & #main {
    grid-area: main;
    margin: 0.5rem;
    display: grid;
    grid-template-areas:
      "selected suggested"
      "vis vis";
    height: calc(100% - 1rem);
    overflow: auto;

    grid-template-columns: 50fr 50fr;
    grid-template-rows: auto 35vh;
    gap: $block-spacing;

    &.network-expanded {
      grid-template-rows: auto 60vh;
    }

    & #selected {
      grid-area: selected;
      overflow-y: hidden;
    }

    & #suggested {
      grid-area: suggested;
      overflow-y: hidden;
    }

    & #network {
      grid-area: vis;
    }

    & > div {
      margin: 0;
    }
  }

  & .compact-button {
    background: transparent;
    color: $white;
    height: 1.5rem;
    margin-right: 0 !important;
    margin-left: 1rem;
    padding: 0.5rem;

    &:hover {
      color: $light;
    }
  }
}

// placed outside the #app scope to apply to tooltips also
.key {
  text-decoration: underline;
}

.unknown {
  color: $danger;
}

.dialog .modal-card {
  max-width: 720px;
}

@include touch {
  #app {
    display: block;
    margin-bottom: 5rem;

    & #main {
      display: block;
      margin: 0;
      overflow: scroll;
      height: auto;

      & > div {
        margin: 0.25rem;
        padding: 0.5rem;
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
    }
  }

  // placed outside the #app scope to apply to tooltips also
  .key {
    text-decoration: none;
  }
}
</style>