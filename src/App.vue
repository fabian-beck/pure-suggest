<template>
  <div id="app">
    <HeaderPanel
      id="header"
      :isMobile="isMobile"
      v-on:clearSession="clearSession"
      v-on:openAbout="isAboutPageShown = true"
      v-on:openKeyboardControls="isKeyboardControlsShown = true"
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
        v-on:remove="removePublication"
        v-on:showAbstract="showAbstract"
        v-on:loadExample="loadExample"
        v-on:importSession="importSession"
      />
      <SuggestedPublicationsComponent
        id="suggested"
        ref="suggested"
        v-on:add="sessionStore.addPublicationsToSelection"
        v-on:remove="removePublication"
        v-on:showAbstract="showAbstract"
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
    <b-modal v-model="isSearchPanelShown">
      <SearchPanel
        :initialSearchQuery="searchQuery"
        v-on:add="sessionStore.addPublicationsToSelection"
        v-on:searchEmpty="notifySearchEmpty"
      />
    </b-modal>
    <b-modal v-model="isAboutPageShown">
      <AboutPage />
    </b-modal>
    <b-modal v-model="isKeyboardControlsShown">
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
      searchQuery: "",
      isSearchPanelShown: false,
      isAboutPageShown: false,
      isKeyboardControlsShown: false,
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

    removePublication: async function (doi) {
      this.sessionStore.excludePublicationByDoi(doi);
      await this.sessionStore.updateSuggestions();
      this.interfaceStore.showMessage("Excluded a publication");
    },

    loadMoreSuggestions: function () {
      this.sessionStore.updateSuggestions(
        this.sessionStore.maxSuggestions + 50
      );
    },

    openSearch: function (query, message) {
      this.searchQuery = query;
      this.isSearchPanelShown = true;
      this.interfaceStore.showImportantMessage(message);
    },

    notifySearchEmpty: function () {
      this.interfaceStore.showErrorMessage("No matching publications found");
      this.interfaceStore.endLoading();
    },

    showAbstract: function (publication) {
      const _this = this;
      const onClose = function () {
        _this.interfaceStore.isOverlay = false;
        _this.sessionStore.activatePublicationComponent(
          document.getElementById(publication.doi)
        );
      };
      this.interfaceStore.isOverlay = true;
      this.$buefy.dialog.alert({
        message: `<div><b>${publication.title}</b></div><div><i>${publication.abstract}</i></div>`,
        type: "is-dark",
        hasIcon: true,
        icon: "text",
        confirmText: "Close",
        canCancel: ["escape", "outside"],
        onConfirm: onClose,
        onCancel: onClose,
      });
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

    clearSession: function () {
      this.interfaceStore.isOverlay = true;
      this.$buefy.dialog.confirm({
        message:
          "You are going to clear all selected and excluded articles and jump back to the initial state.",
        onConfirm: () => {
          this.sessionStore.clear();
          this.interfaceStore.isOverlay = false;
          this.interfaceStore.isNetworkExpanded = false;
        },
        onCancel: () => {
          this.interfaceStore.isOverlay = false;
        },
      });
    },

    clearCache: function () {
      clearCache();
      this.clearSession();
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

  mounted() {
    this._keyListener = function (e) {
      if (
        e.ctrlKey ||
        e.shiftKey ||
        e.metaKey ||
        (e.repeat && !(e.key === "ArrowDown" || e.key === "ArrowUp"))
      ) {
        return;
      } else if (
        this.interfaceStore.isLoading ||
        this.interfaceStore.isOverlay ||
        this.isSearchPanelShown &
          (document.activeElement.nodeName != "INPUT") ||
        this.isAboutPageShown ||
        this.isKeyboardControlsShown
      ) {
        e.preventDefault();
        return;
      } else if (document.activeElement.nodeName === "INPUT") {
        if (e.key === "Escape") {
          document.activeElement.blur();
        } else {
          return;
        }
      } else if (e.key === "c") {
        e.preventDefault();
        this.clearSession();
      } else if (e.key === "Escape") {
        e.preventDefault();
        document.activeElement.blur();
        this.sessionStore.clearActivePublication("escape key");
      } else if (e.key === "a") {
        e.preventDefault();
        this.sessionStore.clearActivePublication("setting focus on text field");
        document.getElementsByClassName("input add-publication")[0].focus();
      } else if (e.key === "s") {
        e.preventDefault();
        this.isSearchPanelShown = true;
      } else if (e.key === "b") {
        e.preventDefault();
        this.sessionStore.clearActivePublication("setting focus on text field");
        document.getElementsByClassName("input boost")[0].focus();
      } else if (e.key === "m") {
        e.preventDefault();
        this.$refs.network.toggleMode();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.sessionStore.activatePublicationComponent(
          document
            .getElementById("selected")
            .getElementsByClassName("publication-component")[0]
        );
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        this.sessionStore.activatePublicationComponent(
          document
            .getElementById("suggested")
            .getElementsByClassName("publication-component")[0]
        );
      } else if (this.sessionStore.activePublication) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const activePublicationComponent = document.getElementsByClassName(
            "publication-component active"
          )[0];
          this.sessionStore.activatePublicationComponent(
            e.key === "ArrowDown"
              ? activePublicationComponent.nextSibling
              : activePublicationComponent.previousSibling
          );
        } else if (e.key === "+") {
          e.preventDefault();
          this.sessionStore.addPublicationsToSelection(
            this.sessionStore.activePublication.doi
          );
        } else if (e.key === "-") {
          e.preventDefault();
          this.removePublication(this.sessionStore.activePublication.doi);
        } else if (e.key === "d") {
          e.preventDefault();
          window.open(this.sessionStore.activePublication.doiUrl);
        } else if (
          e.key === "t" &&
          this.sessionStore.activePublication.abstract
        ) {
          e.preventDefault();
          this.showAbstract(this.sessionStore.activePublication);
        } else if (
          e.key === "o" &&
          this.sessionStore.activePublication.oaLink
        ) {
          e.preventDefault();
          window.open(this.sessionStore.activePublication.oaLink);
        } else if (e.key === "g") {
          e.preventDefault();
          window.open(this.sessionStore.activePublication.gsUrl);
        } else if (e.key === "x") {
          e.preventDefault();
          this.sessionStore.exportSingleBibtex(
            this.sessionStore.activePublication
          );
        }
      }
    };

    document.addEventListener("keydown", this._keyListener.bind(this));

    // triggers a prompt before closing/reloading the page
    window.onbeforeunload = () => {
      if (!this.sessionStore.isEmpty) return "";
      return null;
    };
  },

  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener);
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
      grid-template-rows: auto 65vh;
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