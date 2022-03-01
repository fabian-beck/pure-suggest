<template>
  <div id="app">
    <HeaderPanel
      id="header"
      :isMobile="isMobile"
      :selectedPublicationsCount="selectedPublications.length"
      v-on:exportDois="exportDois"
      v-on:exportBibtex="exportBibtex"
      v-on:clearSelection="clearSelection"
      v-on:clearCache="clearCache"
      v-on:openAbout="isAboutPageShown = true"
    />
    <div
      id="main"
      @click="clearActivePublication('clicked anywhere')"
      :class="{ 'network-expanded': isNetworkExpanded }"
    >
      <SelectedPublicationsComponent
        id="selected"
        ref="selected"
        :publications="selectedPublications"
        v-on:add="addPublicationsToSelection"
        v-on:remove="removePublication"
        v-on:activate="setActivePublication"
        v-on:updateBoost="updateBoost"
        v-on:loadExample="loadExample"
      />
      <SuggestedPublicationsComponent
        id="suggested"
        ref="suggested"
        :publications="suggestedPublications"
        v-on:add="addPublicationsToSelection"
        v-on:remove="removePublication"
        v-on:activate="setActivePublication"
      />
      <NetworkVisComponent
        id="network"
        :selectedPublications="selectedPublications"
        :suggestedPublications="suggestedPublications"
        :isExpanded="isNetworkExpanded"
        :svgWidth="1500"
        :svgHeight="600"
        v-on:activate="setActivePublication"
        v-on:expand="isNetworkExpanded = true"
        v-on:collapse="isNetworkExpanded = false"
      />
    </div>
    <QuickAccessBar id="quick-access" class="is-hidden-tablet" />
    <b-modal v-model="isAboutPageShown">
      <AboutPage />
    </b-modal>
  </div>
</template>

<!---------------------------------------------------------------------------------->

<script>
import HeaderPanel from "./components/HeaderPanel.vue";
import SelectedPublicationsComponent from "./components/SelectedPublicationsComponent.vue";
import SuggestedPublicationsComponent from "./components/SuggestedPublicationsComponent.vue";
import NetworkVisComponent from "./components/NetworkVisComponent.vue";
import QuickAccessBar from "./components/QuickAccessBar.vue";
import AboutPage from "./components/AboutPage.vue";

import Publication from "./Publication.js";
import { saveAsFile } from "./Util.js";
import { clearCache } from "./Cache.js";

export default {
  name: "App",
  components: {
    HeaderPanel,
    SelectedPublicationsComponent,
    SuggestedPublicationsComponent,
    NetworkVisComponent,
    QuickAccessBar,
    AboutPage,
  },
  data() {
    return {
      selectedPublications: [],
      suggestedPublications: [],
      boostKeywords: [],
      activePublication: undefined,
      isAboutPageShown: false,
      isNetworkExpanded: false,
    };
  },
  computed: {
    isMobile: function () {
      return window.innerWidth <= 768;
    },
  },
  methods: {
    addPublicationsToSelection: async function (dois) {
      console.log(`Adding to selection publications with DOIs: ${dois}.`);
      if (typeof dois === "string") {
        dois = [dois];
      }
      let addedPublicationsCount = 0;
      let addedDoi = "";
      dois.forEach((doi) => {
        if (!publications[doi]) {
          publications[doi] = new Publication(doi);
        }
        addedDoi = doi;
        addedPublicationsCount++;
      });
      await this.update();
      if (addedPublicationsCount == 1) {
        this.setActivePublication(addedDoi);
      }
      this.$buefy.toast.open({
        message: `Added ${
          dois.length === 1 ? "a publication" : dois.length + " publications"
        } to selected`,
      });
    },

    removePublication: async function (doi) {
      removedPublicationDois.add(doi);
      delete publications[doi];
      await this.update();
      this.$buefy.toast.open({
        message: `Excluded a publication`,
      });
    },

    update: async function () {
      const loadingComponent = this.$buefy.loading.open({
        container: null,
      });
      await this.updateSelected();
      await this.updateSuggested();
      loadingComponent.close()
    },

    updateSelected: async function () {
      await Promise.all(
        Object.values(publications).map(async (publication) => {
          await publication.fetchData();
          publication.isSelected = true;
        })
      );
      this.selectedPublications = Object.values(publications);
      this.selectedPublications.forEach((publication) =>
        publication.updateScore(this.boostKeywords)
      );
      Publication.sortPublications(this.selectedPublications);
    },

    updateSuggested: async function () {
      this.clearActivePublication();
      this.suggestedPublications = Object.values(
        await Publication.computeSuggestions(
          publications,
          removedPublicationDois,
          this.boostKeywords
        )
      );
    },

    updateBoost: async function (boostKeywordString) {
      this.boostKeywords = boostKeywordString.toLowerCase().split(/,\s*/);
      await this.update();
    },

    setActivePublication: function (doi) {
      this.clearActivePublication("setting active publication");

      this.selectedPublications.forEach((selectedPublication) => {
        selectedPublication.isActive = selectedPublication.doi === doi;
        if (selectedPublication.isActive) {
          this.activePublication = selectedPublication;
          this.selectedPublications.forEach((publication) => {
            publication.isLinkedToActive =
              selectedPublication.citationDois.indexOf(publication.doi) >= 0 ||
              selectedPublication.referenceDois.indexOf(publication.doi) >= 0;
          });
          this.suggestedPublications.forEach((publication) => {
            publication.isLinkedToActive =
              selectedPublication.citationDois.indexOf(publication.doi) >= 0 ||
              selectedPublication.referenceDois.indexOf(publication.doi) >= 0;
          });
        }
      });
      this.suggestedPublications.forEach((suggestedPublication) => {
        suggestedPublication.isActive = suggestedPublication.doi === doi;
        if (suggestedPublication.isActive) {
          this.activePublication = suggestedPublication;
          this.selectedPublications.forEach((publication) => {
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
      this.selectedPublications
        .concat(this.suggestedPublications)
        .forEach((publication) => {
          publication.isActive = false;
          publication.isLinkedToActive = false;
        });
      console.log(
        `Cleared any highlighted active publication, triggered by "${source}".`
      );
    },

    exportDois: function () {
      saveAsFile(
        "publication_dois.txt",
        JSON.stringify(Object.keys(publications))
      );
    },

    exportBibtex: function () {
      let bib = "";
      Object.values(this.selectedPublications).forEach(
        (publication) => (bib += publication.toBibtex() + "\n\n")
      );
      saveAsFile("publications.bib", bib);
    },

    clearSelection: function () {
      this.$buefy.dialog.confirm({
        message:
          "You are going to clear all selected articles and jump back to the initial state.",
        onConfirm: () => {
          publications = {};
          this.selectedPublications = [];
          removedPublicationDois = new Set();
          this.update();
        },
      });
    },

    clearCache: function () {
      clearCache();
      this.clearSelection();
    },

    loadExample: function () {
      this.$refs.selected.setBoost("cit, vis");
      this.addPublicationsToSelection([
        "10.1109/tvcg.2015.2467757",
        "10.1109/tvcg.2015.2467621",
      ]);
    },
  },

  mounted() {
    this._keyListener = function (e) {
      if (document.activeElement.nodeName === "INPUT") {
        return;
      }
      if (e.key === "c") {
        e.preventDefault();
        this.clearSelection();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.clearActivePublication();
      } else if (e.key === "a") {
        e.preventDefault();
        document.getElementsByClassName("input add-publication")[0].focus();
      } else if (e.key === "b") {
        e.preventDefault();
        document.getElementsByClassName("input boost")[0].focus();
      } else if (this.activePublication) {
        if (e.key === "+") {
          e.preventDefault();
          this.addPublicationsToSelection(this.activePublication.doi);
        } else if (e.key === "-") {
          e.preventDefault();
          this.removePublication(this.activePublication.doi);
        } else if (e.key === "d") {
          e.preventDefault();
          window.open(this.activePublication.doiUrl);
        } else if (e.key === "o" && this.activePublication.oaLink) {
          e.preventDefault();
          window.open(this.activePublication.oaLink);
        } else if (e.key === "g") {
          e.preventDefault();
          window.open(this.activePublication.gsUrl);
        }
      }
    };

    document.addEventListener("keydown", this._keyListener.bind(this));
  },

  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener);
  },
};

// triggers a prompt before closing/reloading the page
window.onbeforeunload = function () {
  return "";
};

let publications = {};
let removedPublicationDois = new Set();
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

  & .key {
    text-decoration: underline;
  }
}

@include mobile {
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

    & .key {
      text-decoration: none;
    }
  }
}
</style>
