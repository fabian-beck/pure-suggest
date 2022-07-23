<template>
  <div id="app">
    <HeaderPanel
      id="header"
      :isMobile="isMobile"
      v-on:clearSession="clearSession"
      v-on:openFeedback="openFeedback"
      v-on:openAbout="isAboutPageShown = true"
      v-on:openKeyboardControls="isKeyboardControlsShown = true"
      v-on:clearCache="clearCache"
    />
    <div
      id="main"
      @click="clearActivePublication('clicked anywhere')"
      :class="{ 'network-expanded': isNetworkExpanded }"
    >
      <SelectedPublicationsComponent
        id="selected"
        ref="selected"
        v-on:add="addPublicationsToSelection"
        v-on:startSearching="startSearchingSelected"
        v-on:searchEndedWithoutResult="notifySearchEmpty"
        v-on:openSearch="openSearch"
        v-on:remove="removePublication"
        v-on:activate="activatePublicationComponentByDoi"
        v-on:showAbstract="showAbstract"
        v-on:updateBoost="updateBoost"
        v-on:loadExample="loadExample"
        v-on:importSession="importSession"
      />
      <SuggestedPublicationsComponent
        id="suggested"
        ref="suggested"
        :suggestion="sessionStore.suggestion"
        v-on:add="addPublicationsToSelection"
        v-on:remove="removePublication"
        v-on:activate="activatePublicationComponentByDoi"
        v-on:showAbstract="showAbstract"
        v-on:exportSingleBibtex="sessionStore.exportSingleBibtex"
        v-on:loadMore="loadMoreSuggestions"
      />
      <NetworkVisComponent
        id="network"
        ref="network"
        :selectedPublications="sessionStore.selectedPublications"
        :suggestedPublications="sessionStore.suggestion ? sessionStore.suggestion.publications : []"
        :isExpanded="isNetworkExpanded"
        :svgWidth="1500"
        :svgHeight="600"
        v-on:activate="activatePublicationComponentByDoi"
        v-on:expand="isNetworkExpanded = true"
        v-on:collapse="isNetworkExpanded = false"
      />
    </div>
    <QuickAccessBar id="quick-access" class="is-hidden-desktop" />
    <b-modal v-model="isSearchPanelShown">
      <SearchPanel
        :initialSearchQuery="searchQuery"
        :selectedPublicationsDois="sessionStore.selectedPublicationsDois"
        v-on:add="addPublicationsToSelection"
        v-on:searchEmpty="notifySearchEmpty"
      />
    </b-modal>
    <b-modal v-model="isAboutPageShown">
      <AboutPage />
    </b-modal>
    <b-modal v-model="isKeyboardControlsShown">
      <KeyboardControlsPage />
    </b-modal>
  </div>
</template>

<!---------------------------------------------------------------------------------->

<script>
import { useSessionStore } from "./stores/session.js";

import HeaderPanel from "./components/HeaderPanel.vue";
import SelectedPublicationsComponent from "./components/SelectedPublicationsComponent.vue";
import SuggestedPublicationsComponent from "./components/SuggestedPublicationsComponent.vue";
import NetworkVisComponent from "./components/NetworkVisComponent.vue";
import QuickAccessBar from "./components/QuickAccessBar.vue";
import SearchPanel from "./components/SearchPanel.vue";
import AboutPage from "./components/AboutPage.vue";
import KeyboardControlsPage from "./components/KeyboardControlsPage.vue";

import Publication from "./Publication.js";
import { clearCache } from "./Cache.js";

export default {
  name: "App",
  setup() {
    const sessionStore = useSessionStore();
    return { sessionStore };
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
      readPublicationsDois: new Set(),
      activePublication: undefined,
      isSearchPanelShown: false,
      isAboutPageShown: false,
      isKeyboardControlsShown: false,
      isNetworkExpanded: false,
      isLoading: false,
      loadingComponent: undefined,
      isOverlay: false,
      feedbackInvitationShown: false,
    };
  },
  computed: {
    isMobile: function () {
      return window.innerWidth <= 1023;
    },
  },
  methods: {
    startSearchingSelected: function () {
      this.startLoading();
      this.updateLoadingToast(
        "Searching for publication with matching title",
        "is-primary"
      );
    },

    addPublicationsToSelection: async function (dois) {
      console.log(`Adding to selection publications with DOIs: ${dois}.`);
      document.activeElement.blur();
      if (typeof dois === "string") {
        dois = [dois];
      }
      let addedPublicationsCount = 0;
      let addedDoi = "";
      dois.forEach((doi) => {
        doi = doi.toLowerCase();
        if (this.sessionStore.isDoiExcluded(doi)) {
          this.sessionStore.removeFromExcludedPublicationByDoi(doi); // todo
        }
        if (!this.sessionStore.getSelectedPublicationByDoi(doi)) {
          this.sessionStore.selectedPublications.push(new Publication(doi));
          addedDoi = doi;
          addedPublicationsCount++;
        }
      });
      if (addedPublicationsCount > 0) {
        await this.updateSuggestions();
        if (addedPublicationsCount == 1) {
          this.activatePublicationComponentByDoi(addedDoi);
        }
        this.$buefy.toast.open({
          message: `Added ${
            addedPublicationsCount === 1
              ? "a publication"
              : addedPublicationsCount + " publications"
          } to selected`,
        });
      } else {
        this.$buefy.toast.open({
          message: `Publication${
            dois.length > 1 ? "s" : ""
          } already in selected`,
        });
        this.endLoading();
      }
      if (
        !this.feedbackInvitationShown &&
        this.sessionStore.selectedPublications.length >= 10
      ) {
        this.showFeedbackInvitation();
      }
    },

    removePublication: async function (doi) {
      this.sessionStore.excludePublicationByDoi(doi);
      await this.updateSuggestions();
      this.$buefy.toast.open({
        message: `Excluded a publication`,
      });
    },

    updateSuggestions: async function (maxSuggestions = 50) {
      this.sessionStore.maxSuggestions = maxSuggestions;
      this.startLoading();
      let publicationsLoaded = 0;
      this.updateLoadingToast(
        `${publicationsLoaded}/${
          this.sessionStore.selectedPublicationsCount
        } selected publications loaded`,
        "is-primary"
      );
      this.clearActivePublication("updating suggestions");
      await Promise.all(
        this.sessionStore.selectedPublications.map(async (publication) => {
          await publication.fetchData();
          publication.isSelected = true;
          publicationsLoaded++;
          this.updateLoadingToast(
            `${publicationsLoaded}/${
              this.sessionStore.selectedPublicationsCount
            } selected publications loaded`,
            "is-primary"
          );
        })
      );
      await this.sessionStore.computeSuggestions(
        this.updateLoadingToast,
      );
      this.sessionStore.suggestion.publications.forEach((publication) => {
        publication.isRead = this.readPublicationsDois.has(publication.doi);
      });
      Publication.sortPublications(this.sessionStore.selectedPublications);
      this.$refs.network.plot(true);
      this.endLoading();
    },

    loadMoreSuggestions: function () {
      this.updateSuggestions(this.sessionStore.maxSuggestions + 50);
    },

    updateBoost: async function (
      boostKeywordString,
      preventUpdateSuggestions = false
    ) {
      this.sessionStore.boostKeywords = boostKeywordString.toLowerCase().split(/,\s*/);
      if (!preventUpdateSuggestions) {
        await this.updateSuggestions();
      }
    },

    setBoostKeywords: async function (boostKeywordString) {
      this.$refs.selected.setBoost(boostKeywordString);
      this.updateBoost(boostKeywordString, true);
    },

    setActivePublication: function (doi) {
      this.clearActivePublication("setting active publication");
      this.sessionStore.selectedPublications.forEach((selectedPublication) => {
        selectedPublication.isActive = selectedPublication.doi === doi;
        if (selectedPublication.isActive) {
          this.activePublication = selectedPublication;
          this.sessionStore.selectedPublications.forEach((publication) => {
            publication.isLinkedToActive =
              selectedPublication.citationDois.indexOf(publication.doi) >= 0 ||
              selectedPublication.referenceDois.indexOf(publication.doi) >= 0;
          });
          this.sessionStore.suggestion.publications.forEach((publication) => {
            publication.isLinkedToActive =
              selectedPublication.citationDois.indexOf(publication.doi) >= 0 ||
              selectedPublication.referenceDois.indexOf(publication.doi) >= 0;
          });
        }
      });
      this.sessionStore.suggestion.publications.forEach((suggestedPublication) => {
        suggestedPublication.isActive = suggestedPublication.doi === doi;
        if (suggestedPublication.isActive) {
          suggestedPublication.isRead = true;
          this.readPublicationsDois.add(doi);
          this.activePublication = suggestedPublication;
          this.sessionStore.selectedPublications.forEach((publication) => {
            publication.isLinkedToActive =
              suggestedPublication.citationDois.indexOf(publication.doi) >= 0 ||
              suggestedPublication.referenceDois.indexOf(publication.doi) >= 0;
          });
        }
      });
      console.log(`Highlighted as active publication with DOI ${doi}.`);
    },

    clearActivePublication: function (source) {
      this.activePublication = undefined;
      this.sessionStore.selectedPublications
        .concat(this.sessionStore.suggestion ? this.sessionStore.suggestion.publications : [])
        .forEach((publication) => {
          publication.isActive = false;
          publication.isLinkedToActive = false;
        });
      console.log(
        `Cleared any highlighted active publication, triggered by "${source}".`
      );
    },

    activatePublicationComponent: function (publicationComponent) {
      if (publicationComponent) {
        publicationComponent.focus();
      }
    },

    activatePublicationComponentByDoi: function (doi) {
      if (doi !== this.activePublication?.doi) {
        this.activatePublicationComponent(document.getElementById(doi));
        this.setActivePublication(doi);
      }
    },

    startLoading: function () {
      if (this.isLoading) return;
      this.loadingComponent = this.$buefy.loading.open({
        container: null,
      });
      this.isLoading = true;
    },

    endLoading: function () {
      this.isLoading = false;
      if (this.loadingToast) {
        this.loadingToast.close();
        this.loadingToast = null;
      }
      if (this.loadingComponent) {
        this.loadingComponent.close();
        this.loadingComponent = null;
      }
    },

    updateLoadingToast: function (message, type) {
      if (!this.loadingToast) {
        this.loadingToast = this.$buefy.toast.open({
          indefinite: true,
        });
      }
      this.loadingToast.message = message;
      this.loadingToast.type = type;
    },

    openSearch: function (query, message) {
      this.searchQuery = query;
      this.isSearchPanelShown = true;
      if (message) {
        this.$buefy.toast.open({
          duration: 5000,
          message: message,
          type: "is-primary",
        });
      }
    },

    notifySearchEmpty: function () {
      this.showErrorMessage("No matching publications found");
      this.endLoading();
    },

    showAbstract: function (publication) {
      const _this = this;
      const onClose = function () {
        _this.isOverlay = false;
        _this.activatePublicationComponent(
          document.getElementById(publication.doi)
        );
      };
      this.isOverlay = true;
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
          this.showErrorMessage(`Cannot read JSON from file.`);
        }
      };
      fileReader.readAsText(file);
    },

    clearSession: function () {
      this.isOverlay = true;
      this.$buefy.dialog.confirm({
        message:
          "You are going to clear all selected articles and jump back to the initial state.",
        onConfirm: () => {
          this.sessionStore.reset();
          this.readPublicationsDois = new Set();
          this.setBoostKeywords("");
          this.updateSuggestions();
          this.isOverlay = false;
          this.isNetworkExpanded = false;
        },
        onCancel: () => {
          this.isOverlay = false;
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
        this.showErrorMessage("Cannot read session state from JSON.");
        return;
      }
      if (session.boost) {
        this.setBoostKeywords(session.boost);
      }
      if (session.excluded) {
        this.sessionStore.excludedPublicationsDois = session.excluded;
      }
      this.addPublicationsToSelection(session.selected);
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

    openFeedback: function () {
      this.isOverlay = true;
      this.$buefy.dialog.confirm({
        message:
          "<p><b>We are interested in your opinion!</b></p><p>&nbsp;</p><p>What you like and do not like, what features are missing, how you are using the tool, bugs, criticism, ... anything.</p><p>&nbsp;</p><p>We invite you to provide feedback publicly. Clicking 'OK' will open a GitHub discussion in another tab where you can post a comment (account required). Alternatively, you can always send a private message to <a href='mailto:fabian.beck@uni-bamberg.de'>fabian.beck@uni-bamberg.de</a>.</p>",
        onConfirm: () => {
          window.open(
            "https://github.com/fabian-beck/pure-suggest/discussions/214"
          );
          this.isOverlay = false;
        },
        onCancel: () => {
          this.isOverlay = false;
        },
      });
    },

    showFeedbackInvitation: function () {
      this.feedbackInvitationShown = true;
      this.$buefy.snackbar.open({
        indefinite: true,
        message:
          "You have added the 10th publication to selected—we invite you to share your <b>feedback</b> on the tool!",
        cancelText: "Maybe later",
        onAction: this.openFeedback,
      });
    },

    showErrorMessage: function (errorMessage) {
      this.$buefy.toast.open({
        duration: 5000,
        message: errorMessage,
        type: "is-danger",
      });
      console.error(errorMessage);
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
        this.isLoading ||
        this.isOverlay ||
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
        this.clearActivePublication("escape key");
      } else if (e.key === "a") {
        e.preventDefault();
        this.clearActivePublication("setting focus on text field");
        document.getElementsByClassName("input add-publication")[0].focus();
      } else if (e.key === "s") {
        e.preventDefault();
        this.isSearchPanelShown = true;
      } else if (e.key === "b") {
        e.preventDefault();
        this.clearActivePublication("setting focus on text field");
        document.getElementsByClassName("input boost")[0].focus();
      } else if (e.key === "m") {
        e.preventDefault();
        this.$refs.network.toggleMode();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.activatePublicationComponent(
          document
            .getElementById("selected")
            .getElementsByClassName("publication-component")[0]
        );
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        this.activatePublicationComponent(
          document
            .getElementById("suggested")
            .getElementsByClassName("publication-component")[0]
        );
      } else if (this.activePublication) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const activePublicationComponent = document.getElementsByClassName(
            "publication-component active"
          )[0];
          this.activatePublicationComponent(
            e.key === "ArrowDown"
              ? activePublicationComponent.nextSibling
              : activePublicationComponent.previousSibling
          );
        } else if (e.key === "+") {
          e.preventDefault();
          this.addPublicationsToSelection(this.activePublication.doi);
        } else if (e.key === "-") {
          e.preventDefault();
          this.removePublication(this.activePublication.doi);
        } else if (e.key === "d") {
          e.preventDefault();
          window.open(this.activePublication.doiUrl);
        } else if (e.key === "t" && this.activePublication.abstract) {
          e.preventDefault();
          this.showAbstract(this.activePublication);
        } else if (e.key === "o" && this.activePublication.oaLink) {
          e.preventDefault();
          window.open(this.activePublication.oaLink);
        } else if (e.key === "g") {
          e.preventDefault();
          window.open(this.activePublication.gsUrl);
        } else if (e.key === "x") {
          e.preventDefault();
          this.sessionStore.exportSingleBibtex(this.activePublication);
        }
      }
    };

    document.addEventListener("keydown", this._keyListener.bind(this));

    // triggers a prompt before closing/reloading the page
    window.onbeforeunload = () => {
      console.log(this.sessionStore.selectedPublications);
      if (
        this.sessionStore.selectedPublications &&
        this.sessionStore.selectedPublications.length
      )
        return "";
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