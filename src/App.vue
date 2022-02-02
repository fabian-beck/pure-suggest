<template>
  <div id="app">
    <div class="box px-2 py-1 m-0 is-radiusless" id="header">
      <div class="level">
        <div class="level-left">
          <div class="level-item">
            <b-icon
              icon="tint"
              size="is-large"
              class="level-item has-text-grey mt-0"
            ></b-icon>
            <h1 class="level-item title">
              <span class="has-text-primary">PURE&nbsp;</span>
              <span class="has-text-info">suggest</span>
            </h1>
          </div>
          <div
            class="subtitle level-item has-text-grey mt-2 ml-4"
            v-show="!isMobile || selectedPublications.length === 0"
          >
            citation-based literature search
          </div>
        </div>
        <div class="level-right">
          <b-navbar>
            <template #start>
              <b-navbar-item href="#" v-on:click="exportDOIs">
                    Export selected DOIs
                </b-navbar-item>
            </template>
          </b-navbar>
        </div>
      </div>
    </div>
    <SelectedPublicationsComponent
      :publications="selectedPublications"
      :collapsed="collapsed['selected']"
      v-on:add="addPublicationsToSelection"
      v-on:remove="removePublication"
      v-on:activate="activatePublication"
      v-on:clear="clearSelection"
      v-on:updateBoost="updateBoost"
      v-on:toggleCollapse="toggleCollapse"
    />
    <SuggestedPublicationsComponent
      :publications="suggestedPublications"
      :loadingSuggestions="loadingSuggestions"
      :collapsed="collapsed['suggested']"
      v-on:add="addPublicationsToSelection"
      v-on:remove="removePublication"
      v-on:activate="activatePublication"
      v-on:toggleCollapse="toggleCollapse"
    />
    <NetworkVisComponent
      :selectedPublications="selectedPublications"
      :suggestedPublications="suggestedPublications"
      :collapsed="collapsed['network']"
      :svgWidth="1500"
      :svgHeight="300"
      v-on:activate="activatePublication"
      v-on:toggleCollapse="toggleCollapse"
    />
  </div>
</template>

<!---------------------------------------------------------------------------------->

<script>
import _ from "lodash";

import SelectedPublicationsComponent from "./components/SelectedPublicationsComponent.vue";
import SuggestedPublicationsComponent from "./components/SuggestedPublicationsComponent.vue";
import NetworkVisComponent from "./components/NetworkVisComponent.vue";

import Publication from "./Publication.js";

export default {
  name: "App",
  components: {
    SelectedPublicationsComponent,
    SuggestedPublicationsComponent,
    NetworkVisComponent,
  },
  data() {
    return {
      selectedPublications: [],
      suggestedPublications: [],
      loadingSuggestions: false,
      boostKeywords: [],
      collapsed: {
        selected: false,
        suggested: window.innerWidth <= 768,
        network: window.innerWidth <= 768,
      },
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
      publications = {};
      this.selectedPublications = [];
      removedPublicationDois = new Set();
      this.updateSuggestions();
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

    toggleCollapse: function (component) {
      if (this.isMobile) {
        if (this.collapsed[component]) {
          Object.keys(this.collapsed).forEach(
            (component) => (this.collapsed[component] = true)
          );
          this.collapsed[component] = false;
        }
      } else if (component === "network") {
        this.collapsed[component] = !this.collapsed[component];
      }
    },

    exportDOIs: function () {
      save("selectedDois.txt", JSON.stringify(Object.keys(publications)));
    },
  },
  beforeMount() {
    this.updateSuggestions();
  },
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
    "header header"
    "left right"
    "vis vis";
  height: 100vh;
  grid-template-rows: max-content 50fr max-content;
  grid-template-columns: 50fr 50fr;
  grid-row-gap: 0.5rem;
}
#app > div {
  margin: 0.5rem;
}
.collapsed {
  max-height: 3rem;
}
#header {
  grid-area: header;
}
.selected-publications {
  grid-area: left;
  overflow-y: hidden;
}
.suggested-publications {
  grid-area: right;
  overflow-y: hidden;
}
.network-of-references {
  grid-area: vis;
}

@include mobile {
  #app {
    grid-template-areas:
      "header"
      "left"
      "right";
    grid-template-rows: max-content auto auto;
    grid-template-columns: 100fr;
    grid-row-gap: 0.25rem;
  }

  #app > div {
    margin: 0.25rem;
    padding: 0.5rem;
  }
}
</style>
