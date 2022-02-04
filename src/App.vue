<template>
  <div id="app">
    <div class="box p-0 m-0 is-radiusless" id="header">
      <b-navbar>
        <template #brand>
          <b-navbar-item>
            <b-icon
              icon="tint"
              size="is-large"
              class="has-text-grey mt-0"
            ></b-icon>
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
            <b-navbar-item href="#" v-on:click="exportDOIs">
              <b-icon icon="share-square" size="is-small"></b-icon>
              <span class="ml-2">Export selected DOIs</span>
            </b-navbar-item>
            <b-navbar-item
              href="#"
              v-on:click="clearSelection"
              class="has-text-danger"
            >
              <b-icon icon="trash" size="is-small"></b-icon
              ><span class="ml-2">Clear</span>
            </b-navbar-item>
          </b-navbar-dropdown>
        </template>
        <template #end>
          <b-navbar-item href="#" v-on:click="isAboutActive = true">
            About
          </b-navbar-item>
        </template>
      </b-navbar>
      <div class="columns" v-show="selectedPublications.length === 0">
        <div class="column">
          <div class="subtitle level-item mt-3">
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
              <b class="has-text-info">suggest</b>ing related
              <b class="has-text-primary">pu</b>blications connected by
              <b class="has-text-primary">re</b>ferences.
            </p>
            <p>
              To start, add one or more publications to the selection by
              providing their <b>DOIs</b> (<a href="https://www.doi.org/"
                >Document Object Intentfier</a
              >) or a <b>title</b> (one publication).
            </p>
          </div>
        </div>
      </div>
    </div>
    <SelectedPublicationsComponent
      :publications="selectedPublications"
      :collapsed="collapsed['selected']"
      v-on:add="addPublicationsToSelection"
      v-on:remove="removePublication"
      v-on:activate="activatePublication"
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
    <b-modal v-model="isAboutActive">
      <div id="about" class="box content">
        <section>
          <h1 class="title mb-5">
            PURE suggest &ndash; citation-based literature search
          </h1>
          <p>
            created by <a href="https://github.com/fabian-beck">Fabian Beck</a>
          </p>
          <p>
            PURE suggest is a scientific literature search tool that, starting
            from some seed papers, suggests scientific publications through
            citations/references.
          </p>
          <h3>Data Sources</h3>
          <ul>
            <li><a href="https://opencitations.net/">OpenCitations</a></li>
            <li><a href="https://www.crossref.org/">CrossRef</a></li>
          </ul>
        </section>
      </div>
    </b-modal>
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
        position: "is-bottom",
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
        position: "is-bottom",
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

    toggleCollapse: function (component) {
      if (this.isMobile) {
        if (this.collapsed[component]) {
          Object.keys(this.collapsed).forEach(
            (component) => (this.collapsed[component] = true)
          );
          this.collapsed[component] = false;
        }
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
  grid-template-rows: max-content 50fr 30fr;
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

  & .columns {
    & .column {
      margin: $block-spacing;
      vertical-align: middle;
    }
  }
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
