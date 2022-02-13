<template>
  <div id="app">
    <div class="box p-0 m-0 is-radiusless" id="header">
      <b-navbar :fixed-top="isMobile">
        <template #brand>
          <b-navbar-item>
            <b-icon icon="tint" size="is-medium" class="has-text-grey"></b-icon>
            <h1 class="title">
              <span class="has-text-primary">PURE&nbsp;</span>
              <span class="has-text-info">suggest</span>
            </h1>
          </b-navbar-item>
        </template>
        <template #start>
          <b-navbar-dropdown
            :label="'Session (' + selectedPublications.length + ' selected)'"
            v-show="selectedPublications.length"
          >
            <b-navbar-item v-on:click="exportDois">
              <b-icon icon="share-square" size="is-small"></b-icon>
              <span class="ml-2">Export selected as DOIs</span>
            </b-navbar-item>
            <b-navbar-item v-on:click="exportBibtex">
              <b-icon icon="share-square" size="is-small"></b-icon>
              <span class="ml-2">Export selected as BibTeX</span>
            </b-navbar-item>
            <b-navbar-item
              v-on:click="clearSelection"
              class="has-text-danger"
            >
              <b-icon icon="trash" size="is-small"></b-icon
              ><span class="ml-2">Clear</span>
            </b-navbar-item>
          </b-navbar-dropdown>
        </template>
        <template #end>
          <b-navbar-item v-on:click="isAboutActive = true">
            About
          </b-navbar-item>
        </template>
      </b-navbar>
      <div class="columns" v-show="selectedPublications.length === 0">
        <div class="column">
          <div class="subtitle level-item mt-2">
            Citation-based literature search
          </div>
        </div>
        <div class="column is-three-quarters">
          <div
            class="notification has-text-centered p-2"
            v-show="selectedPublications.length === 0"
          >
            <p>
              Based on a set of selected publications,
              <b class="has-text-info" v-on:click="srollTo('suggest')"
                >suggest</b
              >ing related <b class="has-text-primary">pu</b>blications
              connected by <b class="has-text-primary">re</b>ferences.
            </p>
          </div>
        </div>
      </div>
    </div>
    <div id="main">
      <SelectedPublicationsComponent
        id="selected"
        :publications="selectedPublications"
        v-on:add="addPublicationsToSelection"
        v-on:remove="removePublication"
        v-on:activate="activatePublication"
        v-on:updateBoost="updateBoost"
      />
      <SuggestedPublicationsComponent
        id="suggested"
        :publications="suggestedPublications"
        :loadingSuggestions="loadingSuggestions"
        v-on:add="addPublicationsToSelection"
        v-on:remove="removePublication"
        v-on:activate="activatePublication"
      />
      <NetworkVisComponent
        id="network"
        :selectedPublications="selectedPublications"
        :suggestedPublications="suggestedPublications"
        :svgWidth="1500"
        :svgHeight="600"
        v-on:activate="activatePublication"
      />
    </div>
    <div id="quick-access" class="is-hidden-tablet">
      <b-button
        type="has-background-primary has-text-white"
        icon-right="file-export"
        v-on:click="scrollTo('selected')"
      />
      <b-button
        type="has-background-info has-text-white"
        icon-right="file-import"
        v-on:click="scrollTo('suggested')"
      />
      <b-button
        type="has-background-grey has-text-white"
        icon-right="chart-bar"
        v-on:click="scrollTo('network')"
      />
    </div>
    <b-modal v-model="isAboutActive">
      <AboutPage />
    </b-modal>
  </div>
</template>

<!---------------------------------------------------------------------------------->

<script>
import SelectedPublicationsComponent from "./components/SelectedPublicationsComponent.vue";
import SuggestedPublicationsComponent from "./components/SuggestedPublicationsComponent.vue";
import NetworkVisComponent from "./components/NetworkVisComponent.vue";
import AboutPage from "./components/AboutPage.vue";

import Publication from "./Publication.js";

export default {
  name: "App",
  components: {
    SelectedPublicationsComponent,
    SuggestedPublicationsComponent,
    NetworkVisComponent,
    AboutPage,
  },
  data() {
    return {
      selectedPublications: [],
      suggestedPublications: [],
      loadingSuggestions: false,
      boostKeywords: [],
      isAboutActive: false,
    };
  },
  computed: {
    isMobile: function () {
      return window.innerWidth <= 768;
    },
  },
  methods: {
    updateSuggestions: async function () {
      this.loadingSuggestions = true;
      this.clearActive();
      this.suggestedPublications = Object.values(await computeSuggestions());
      this.suggestedPublications.forEach((publication) =>
        publication.updateScore(this.boostKeywords)
      );
      Publication.sortPublications(this.suggestedPublications);
      this.loadingSuggestions = false;
    },

    addPublicationsToSelection: async function (dois) {
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
      await this.updateSuggestions();
      if (addedPublicationsCount == 1) {
        this.activatePublication(addedDoi);
      }
      this.rankSelectedPublications();
      this.$buefy.toast.open({
        message: `Added ${
          dois.length === 1 ? "a publication" : dois.length + " publications"
        } to selected`,
      });
    },

    activatePublication: function (doi) {
      this.clearActive();
      this.selectedPublications.forEach((selectedPublication) => {
        selectedPublication.isActive = selectedPublication.doi === doi;
        if (selectedPublication.isActive) {
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
          this.selectedPublications.forEach((publication) => {
            publication.isLinkedToActive =
              suggestedPublication.citationDois.indexOf(publication.doi) >= 0 ||
              suggestedPublication.referenceDois.indexOf(publication.doi) >= 0;
          });
        }
      });
    },

    clearSelection: function () {
      this.$buefy.dialog.confirm({
        message:
          "You are going to clear all selected articles and jump back to the initial state.",
        onConfirm: () => {
          publications = {};
          this.selectedPublications = [];
          removedPublicationDois = new Set();
          this.updateSuggestions();
        },
      });
    },

    clearActive: function () {
      this.selectedPublications
        .concat(this.suggestedPublications)
        .forEach((publication) => {
          publication.isActive = false;
          publication.isLinkedToActive = false;
        });
    },

    removePublication: function (doi) {
      removedPublicationDois.add(doi);
      delete publications[doi];
      this.rankSelectedPublications();
      this.updateSuggestions();
      this.$buefy.toast.open({
        message: `Excluded a publication`,
      });
    },

    rankSelectedPublications: function () {
      this.selectedPublications = Object.values(publications);
      this.selectedPublications.forEach((publication) =>
        publication.updateScore(this.boostKeywords)
      );
      Publication.sortPublications(this.selectedPublications);
    },

    updateBoost: function (boostKeywordString) {
      this.boostKeywords = boostKeywordString.toLowerCase().split(/,\s*/);
      this.rankSelectedPublications();
      this.updateSuggestions();
    },

    exportDois: function () {
      save("publication_dois.txt", JSON.stringify(Object.keys(publications)));
    },

    exportBibtex: function () {
      let bib = "";
      Object.values(this.selectedPublications).forEach(
        (publication) => (bib += publication.toBibtex() + "\n\n")
      );
      save("publications.bib", bib);
    },

    scrollTo(id) {
      scrollToTargetAdjusted(id);
    },
  },
  beforeMount() {
    this.updateSuggestions();
  },
};

// triggers a prompt before closing/reloading the page
window.onbeforeunload = function () {
  return "";
};

let publications = {};
let removedPublicationDois = new Set();

async function computeSuggestions() {
  function incrementSuggestedPublicationCounter(
    doi,
    counter,
    doiList,
    sourceDoi
  ) {
    if (!removedPublicationDois.has(doi)) {
      if (!publications[doi]) {
        if (!suggestedPublications[doi]) {
          const citingPublication = new Publication(doi);
          suggestedPublications[doi] = citingPublication;
        }
        suggestedPublications[doi][doiList].push(sourceDoi);
        suggestedPublications[doi][counter]++;
      } else {
        publications[doi][counter]++;
      }
    }
  }

  const suggestedPublications = {};
  await Promise.all(
    Object.values(publications).map(async (publication) => {
      await publication.fetchData();
      publication.isSelected = true;
    })
  );
  Object.values(publications).forEach((publication) => {
    publication.citationCount = 0;
    publication.referenceCount = 0;
  });
  Object.values(publications).forEach((publication) => {
    publication.citationDois.forEach((citationDoi) => {
      incrementSuggestedPublicationCounter(
        citationDoi,
        "citationCount",
        "referenceDois",
        publication.doi
      );
    });
    publication.referenceDois.forEach((referenceDoi) => {
      incrementSuggestedPublicationCounter(
        referenceDoi,
        "referenceCount",
        "citationDois",
        publication.doi
      );
    });
  });
  let filteredSuggestions = Object.values(suggestedPublications);
  // titles not yet fetched, that is why sorting can be only done on citations/references
  filteredSuggestions.sort(
    (a, b) =>
      b.citationCount + b.referenceCount - (a.citationCount + a.referenceCount)
  );
  filteredSuggestions = filteredSuggestions.slice(0, 50);
  filteredSuggestions.forEach(async (suggestedPublication) => {
    suggestedPublication.fetchData();
  });
  return filteredSuggestions;
}

// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server?answertab=active#tab-top
function save(filename, data) {
  const blob = new Blob([data], { type: "text/csv" });
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveBlob(blob, filename);
  } else {
    const elem = window.document.createElement("a");
    elem.href = window.URL.createObjectURL(blob);
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  }
}

// https://stackoverflow.com/questions/49820013/javascript-scrollintoview-smooth-scroll-and-offset
function scrollToTargetAdjusted(id) {
  var element = document.getElementById(id);
  var headerOffset = 55;
  var elementPosition = element.getBoundingClientRect().top;
  var offsetPosition = elementPosition + window.pageYOffset - headerOffset;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
}
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

    & .title {
      font-size: $size-4;
    }

    & .subtitle {
      font-size: $size-5;
    }

    & .columns {
      & .column {
        margin: $block-spacing;
      }
    }
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

    & #quick-access {
      position: fixed;
      bottom: 0.5rem;
      width: 100%;
      text-align: center;

      & button {
        margin: $block-spacing;
        box-shadow: 0.25rem 0.25rem 0.75rem grey;
      }
    }
  }
}
</style>
