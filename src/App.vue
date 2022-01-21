<template>
  <div id="app">
    <div class="section media box" id="header">
      <b-icon
        icon="tint"
        size="is-medium"
        class="media-left has-text-grey pure-icon"
      ></b-icon>
      <div class="media-content level">
        <div class="level-left">
          <div class="title level-item">
            <h1>
              <span class="has-text-primary">PURE&nbsp;</span>
              <span class="has-text-info">suggest</span>
            </h1>
          </div>
          <div class="subtitle level-item has-text-grey">
            <span>
              literature search &ndash; suggest scientific
              <b>pu</b>blications by <b>re</b>ference
            </span>
            <b-icon
              icon="info-circle"
              size="is-small"
              data-tippy-content="For a set of selected publications, the tool looks up all citations and references and lists those publications as suggestions often referencing or getting referenced by the selected ones."
              v-tippy
            ></b-icon>
          </div>
        </div>
      </div>
    </div>
    <SelectedPublicationsComponent
      :publications="selectedPublications"
      :noPublicationWarning="noPublicationWarning"
      v-on:addByQuery="addPublicationsToSelectionByQuery"
      v-on:remove="removePublication"
      v-on:activate="activatePublication"
      v-on:clear="clearSelection"
      v-on:closeNoPublicationWarning="closeNoPublicationWarning"
    />
    <SuggestedPublicationsComponent
      :publications="suggestedPublications"
      :loadingSuggestions="loadingSuggestions"
      v-on:add="addPublicationsToSelection"
      v-on:remove="removePublication"
      v-on:activate="activatePublication"
    />
    <NetworkVisComponent
      :selectedPublications="selectedPublications"
      :suggestedPublications="suggestedPublications"
      :svgWidth="1500"
      :svgHeight="300"
      v-on:activate="activatePublication"
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
import cachedFetch from "./Cache";

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
      noPublicationWarning: false,
    };
  },
  methods: {
    updateSuggestions: async function () {
      this.loadingSuggestions = true;
      this.clearActive();
      this.suggestedPublications = Object.values(await computeSuggestions());
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
        this.selectedPublications = Object.values(publications).reverse();
        addedDoi = doi;
        addedPublicationsCount++;
      });
      await this.updateSuggestions();
      if (addedPublicationsCount == 1) {
        this.activatePublication(addedDoi);
      }
    },

    addPublicationsToSelectionByQuery: async function (query) {
      function computeTitleSimilarity(query, title) {
        let equivalentWordCounter = 0;
        const words = query.split("+");
        words.forEach((word) => {
          if (title.indexOf(word) >= 0) {
            equivalentWordCounter++;
          }
        });
        return (
          equivalentWordCounter /
          Math.max(words.length, title.split(/\W+/).length)
        );
      }

      let dois = [];
      query.split(/ |"|\{|\}|doi:|doi.org\//).forEach((doi) => {
        doi = _.trim(doi, ".");
        if (doi.indexOf("10.") === 0) {
          dois.push(doi);
        }
      });
      if (dois.length === 0) {
        query = query.replace(/\W+/g, "+").toLowerCase();
        await cachedFetch(
          "https://api.crossref.org/works?query.bibliographic=" + query,
          (data) => {
            let maxSimilarity = 0.5;
            data.message.items.forEach((item) => {
              const title = (
                item.title[0] +
                " " +
                (item.subtitle ? item.subtitle[0] : "")
              ).toLowerCase();
              const similarity = computeTitleSimilarity(query, title);
              if (similarity > maxSimilarity) {
                dois = [item.DOI];
                maxSimilarity = similarity;
              }
            });
          }
        );
        if (dois.length === 0) {
          this.noPublicationWarning = true;
        }
      }
      this.addPublicationsToSelection(dois);
    },

    activatePublication: function (doi) {
      this.clearActive();
      this.selectedPublications.forEach((selectedPublication) => {
        selectedPublication.isActive = selectedPublication.doi === doi;
        if (selectedPublication.isActive) {
          this.suggestedPublications.forEach((suggestedPublication) => {
            suggestedPublication.isLinkedToActive =
              selectedPublication.citationDois.indexOf(
                suggestedPublication.doi
              ) >= 0 ||
              selectedPublication.referenceDois.indexOf(
                suggestedPublication.doi
              ) >= 0;
          });
        }
      });
      this.suggestedPublications.forEach((suggestedPublication) => {
        suggestedPublication.isActive = suggestedPublication.doi === doi;
        if (suggestedPublication.isActive) {
          this.selectedPublications.forEach((selectedPublication) => {
            selectedPublication.isLinkedToActive =
              suggestedPublication.citationDois.indexOf(
                selectedPublication.doi
              ) >= 0 ||
              suggestedPublication.referenceDois.indexOf(
                selectedPublication.doi
              ) >= 0;
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
      this.selectedPublications = Object.values(publications).reverse();
      this.updateSuggestions();
    },

    closeNoPublicationWarning: function () {
      this.noPublicationWarning = false;
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
    if (!publications[doi] && !removedPublicationDois.has(doi)) {
      if (!suggestedPublications[doi]) {
        const citingPublication = new Publication(doi);
        suggestedPublications[doi] = citingPublication;
      }
      suggestedPublications[doi][doiList].push(sourceDoi);
      suggestedPublications[doi][counter]++;
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
  filteredSuggestions.sort(
    (a, b) =>
      b.citationCount + b.referenceCount - (a.citationCount + a.referenceCount)
  );
  filteredSuggestions = filteredSuggestions.slice(0, 30);
  filteredSuggestions.forEach(async (suggestedPublication) => {
    suggestedPublication.fetchData();
  });
  return filteredSuggestions;
}
</script>

<!---------------------------------------------------------------------------------->

<style lang="scss">
@import "~bulma/sass/utilities/_all";

$block-spacing: 0.5rem;

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
}
#header {
  padding: 0.5rem 1rem;
  grid-area: header;
}
#header .subtitle {
  margin-top: 0.25rem;
  margin-left: 2rem;
}
.selected-publications {
  grid-area: left;
  overflow-y: hidden;
}
.suggested-publications {
  grid-area: right;
  overflow-y: hidden;
}
.pure-icon {
  margin-top: 0.3rem;
}
.icon.is-small {
  margin-left: 0.5rem;
}
.network-of-references {
  grid-area: vis;
}
</style>
