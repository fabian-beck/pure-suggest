<template>
  <div id="app">
    <div class="section media box" id="header">
      <b-icon icon="tint" size="is-medium" class="media-left has-text-grey pure-icon"></b-icon>
      <div class="media-content level">
        <div class="level-left">
          <div class="title level-item">
            <span>
              <span class="has-text-primary">PURE&nbsp;</span>
              <span class="has-text-info">suggest</span>
            </span>
          </div>
          <div class="subtitle level-item has-text-grey">
            <span>
              Suggest scientific
              <b>pu</b>blications by
              <b>re</b>ference
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
      v-on:add="addPublicationToSelection"
      v-on:remove="removePublication"
      v-on:activate="activatePublication"
      v-on:clear="clearSelection"
    />
    <SuggestedPublicationsComponent
      :publications="suggestedPublications"
      :loadingSuggestions="loadingSuggestions"
      v-on:add="addPublicationToSelection"
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

export default {
  name: "App",
  components: {
    SelectedPublicationsComponent,
    SuggestedPublicationsComponent,
    NetworkVisComponent
  },
  data() {
    return {
      selectedPublications: [],
      suggestedPublications: [],
      loadingSuggestions: false
    };
  },
  methods: {
    updateSuggestions: async function() {
      this.loadingSuggestions = true;
      this.clearActive();
      this.suggestedPublications = Object.values(await computeSuggestions());
      this.loadingSuggestions = false;
    },

    addPublicationToSelection: async function(dois) {
      let addedPublicationsCount = 0;
      let addedDoi = "";
      dois.split(/ |"|\{|\}|doi:|doi.org\//).forEach(doi => {
        doi = _.trim(doi, ".");
        if (doi.indexOf("10.") === 0 && !publications[doi]) {
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

    activatePublication: function(doi) {
      this.clearActive();
      this.selectedPublications.forEach(selectedPublication => {
        selectedPublication.isActive = selectedPublication.doi === doi;
        if (selectedPublication.isActive) {
          this.suggestedPublications.forEach(suggestedPublication => {
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
      this.suggestedPublications.forEach(suggestedPublication => {
        suggestedPublication.isActive = suggestedPublication.doi === doi;
        if (suggestedPublication.isActive) {
          this.selectedPublications.forEach(selectedPublication => {
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

    clearSelection: function() {
      publications = {};
      this.selectedPublications = [];
      removedPublicationDois = new Set();
      this.updateSuggestions();
    },

    clearActive: function() {
      this.selectedPublications
        .concat(this.suggestedPublications)
        .forEach(publication => {
          publication.isActive = false;
          publication.isLinkedToActive = false;
        });
    },

    removePublication: function(doi) {
      removedPublicationDois.add(doi);
      delete publications[doi];
      this.selectedPublications = Object.values(publications).reverse();
      this.updateSuggestions();
    }
  },
  beforeMount() {
    this.updateSuggestions();
  }
};

class Publication {
  constructor(doi) {
    this.doi = doi;
    this.citationDois = [];
    this.referenceDois = [];
    this.citationCount = 0;
    this.referenceCount = 0;
    this.title = "";
    this.container = "";
    this.year = undefined;
    this.authorShort = undefined;
    this.isActive = false;
    this.isLinkedToActive = false;
    this.isSelected = false;
  }

  async fetchCitations() {
    await cachedFetch(
      `https://opencitations.net/index/coci/api/v1/citations/${this.doi}`,
      citations => {
        this.citationDois = [];
        citations.forEach(citation => {
          this.citationDois.push(citation.citing);
        });
      }
    );
  }

  async fetchReferences() {
    await cachedFetch(
      `https://opencitations.net/index/coci/api/v1/references/${this.doi}`,
      references => {
        this.referenceDois = [];
        references.forEach(reference => {
          this.referenceDois.push(reference.cited);
        });
      }
    );
  }

  async fetchMetadata() {
    await cachedFetch(
      `https://api.crossref.org/works/${this.doi}`,
      metadata => {
        console.log(metadata);
        this.title =
          metadata.message.title[0] +
          (metadata.message.subtitle[0]
            ? ": " + metadata.message.subtitle[0]
            : "");
        this.year = metadata.message.issued["date-parts"][0][0];
        if (metadata.message.author) {
          this.authorShort = metadata.message.author[0].family;
          if (metadata.message.author.length > 2) {
            this.authorShort += " et al.";
          } else if (metadata.message.author.length === 2) {
            this.authorShort += " and " + metadata.message.author[1].family;
          }
          this.author = metadata.message.author
            .map(author => author.given + " " + author.family)
            .join(", ");
        }
        this.container = metadata.message["container-title"][0];
        this.shortReference = `${
          this.authorShort ? this.authorShort : "[unknown author]"
        }, ${this.year ? this.year : "[unknown year]"}`;
      }
    );
  }
}

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
    Object.values(publications).map(async publication => {
      await publication.fetchCitations();
      await publication.fetchReferences();
      publication.fetchMetadata();
      publication.isSelected = true;
    })
  );
  Object.values(publications).forEach(publication => {
    publication.citationDois.forEach(citationDoi => {
      incrementSuggestedPublicationCounter(
        citationDoi,
        "citationCount",
        "referenceDois",
        publication.doi
      );
    });
    publication.referenceDois.forEach(referenceDoi => {
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
  filteredSuggestions.forEach(async suggestedPublication => {
    suggestedPublication.fetchMetadata();
  });
  return filteredSuggestions;
}

async function cachedFetch(url, processData) {
  if (localStorage[url]) {
    processData(JSON.parse(localStorage[url]));
  } else {
    await fetch(url)
      .then(response => response.json())
      .then(data => {
        try {
          localStorage[url] = JSON.stringify(data);
        } catch (error) {
          try {
            // local storage cache full, delete random elements
            for (let i = 0; i < 100; i++) {
              const randomStoredUrl = Object.keys(localStorage)[
                Math.floor(Math.random() * Object.keys(localStorage).length)
              ];
              localStorage.removeItem(randomStoredUrl);
            }
            localStorage[url] = JSON.stringify(data);
          } catch (error2) {
            console.error(
              `Unable to cache information for request "${url}" in local storage: ${error2}`
            );
          }
        }
        processData(data);
      })
      .catch(function(error) {
        console.error(`Failed to fetch and process "${url}": ${error}`);
      });
  }
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
