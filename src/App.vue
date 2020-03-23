<template>
  <div id="app">
    <div class="section has-background-dark media" id="header">
      <b-icon icon="tint" size="is-medium" class="media-left has-text-grey-lighter pure-icon"></b-icon>
      <div class="media-content level">
        <div class="level-left">
          <div class="title has-text-grey-lighter level-item">PURE suggest</div>
          <div class="subtitle has-text-grey-lighter level-item">
            <span>
              Suggest scientific
              <b>pu</b>blications by
              <b>re</b>ference
            </span>
            <b-icon
              icon="info-circle"
              size="is-small"
              v-tooltip.right-end="'For a set of selected publications, the tool looks up all citations <br/>and lists those papers often citing the selected ones as suggestions.'"
            ></b-icon>
          </div>
        </div>
      </div>
    </div>
    <SelectedPublicationsComponent
      :publications="selectedPublications"
      v-on:add="addPublicationToSelection"
      v-on:activate="activatePublication"
      v-on:clear="clearSelection"
    />
    <SuggestedPublicationsComponent
      :publications="suggestedPublications"
      :loadingSuggestions="loadingSuggestions"
      v-on:add="addPublicationToSelection"
      v-on:activate="activatePublication"
    />
  </div>
</template>

<!---------------------------------------------------------------------------------->

<script>
import SelectedPublicationsComponent from "./components/SelectedPublicationsComponent.vue";
import SuggestedPublicationsComponent from "./components/SuggestedPublicationsComponent.vue";

export default {
  name: "App",
  components: {
    SelectedPublicationsComponent,
    SuggestedPublicationsComponent
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
      this.suggestedPublications = Object.values(await computeSuggestions());
      this.loadingSuggestions = false;
    },

    addPublicationToSelection: function(dois) {
      this.clearActive();
      dois.split(/ |"|\{|\}/).forEach(doi => {
        if (doi.indexOf("10.") === 0 && !publications[doi]) {
          publications[doi] = new Publication(doi);
        }
        this.selectedPublications = Object.values(publications).reverse();
      });
      this.updateSuggestions();
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
      this.updateSuggestions();
    },

    clearActive: function() {
      this.selectedPublications
        .concat(this.suggestedPublications)
        .forEach(publication => {
          publication.isActive = false;
          publication.isLinkedToActive = false;
        });
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
    this.cointainer = "";
    this.year = undefined;
    this.authorShort = undefined;
    this.isActive = false;
    this.isLinkedToActive = false;
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
        this.title =
          metadata.message.title[0] +
          (metadata.message.subtitle[0] ? ': '+metadata.message.subtitle[0] : "");
        this.year = metadata.message.issued["date-parts"][0][0];
        if (!this.year) {
          this.year = '[unknown year]';
        }
        this.authorShort = metadata.message.author[0].family;
        if (metadata.message.author.length > 2) {
          this.authorShort += " et al.";
        } else if (metadata.message.author.length === 2) {
          this.authorShort += " and " + metadata.message.author[1].family;
        }
        this.author = metadata.message.author
          .map(author => author.given + " " + author.family)
          .join(", ");
        this.container = metadata.message["container-title"][0];
      }
    );
  }
}

let publications = {};

async function computeSuggestions() {
  function incrementSuggestedPublicationCounter(
    doi,
    counter,
    doiList,
    sourceDoi
  ) {
    if (!publications[doi]) {
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
        localStorage[url] = JSON.stringify(data);
        processData(data);
      })
      .catch(function(error) {
        console.log(error);
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

@import "v-tooltip.scss";

#app {
  display: grid;
  grid-template-areas:
    "header header"
    "left right";
  height: 100vh;
  grid-template-rows: max-content auto;
  grid-template-columns: 50fr 50fr;
}
#header {
  padding: 0.5rem 1rem;
  grid-area: header;
}
#header .subtitle {
  margin-top: 0.25rem;
  margin-left: 1rem;
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
</style>
