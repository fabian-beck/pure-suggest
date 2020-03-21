<template>
  <div id="app">
    <div class="section has-background-dark media" id="header">
      <b-icon icon="tint" size="is-large" class="media-left has-text-grey-lighter"></b-icon>
      <div class="media-content">
        <div class="title has-text-grey-lighter">PURE suggest</div>
        <div class="subtitle has-text-grey-lighter">
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
    <SelectedPublicationsComponent
      :publications="selectedPublications"
      v-on:add="addPublicationToSelection"
      v-on:activate="activatePublication"
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
      dois.split(/ |"|\{|\}/).forEach(doi => {
        if (doi.indexOf("10.") === 0 && !publications[doi]) {
          publications[doi] = new Publication(doi);
        }
        this.selectedPublications = Object.values(publications).reverse();
      });
      this.updateSuggestions();
    },
    activatePublication: function(doi) {
      this.selectedPublications.concat(this.suggestedPublications).forEach(publication => {
        publication.isReferencedByActive = false;
      });
      this.selectedPublications.forEach(selectedPublication => {
        selectedPublication.isActive = selectedPublication.doi === doi;
        if (selectedPublication.isActive) {
          this.suggestedPublications.forEach(suggestedPublication => {
            suggestedPublication.isReferencedByActive =
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
    this.isReferencedByActive = false;
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
        this.title = metadata.message.title[0];
        this.year = metadata.message.issued["date-parts"][0][0];
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

const publications = {};

async function computeSuggestions() {
  function incrementSuggestedPublicationCounter(doi, counter) {
    if (!publications[doi]) {
      if (!suggestedPublications[doi]) {
        const citingPublication = new Publication(doi);
        suggestedPublications[doi] = citingPublication;
      }
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
      incrementSuggestedPublicationCounter(citationDoi, "citationCount");
    });
    publication.referenceDois.forEach(referenceDoi => {
      incrementSuggestedPublicationCounter(referenceDoi, "referenceCount");
    });
  });
  let filteredSuggestions = Object.values(suggestedPublications);
  filteredSuggestions.sort(
    (a, b) =>
      b.citationCount + b.referenceCount - (a.citationCount + a.referenceCount)
  );
  filteredSuggestions = filteredSuggestions.slice(0, 20);
  filteredSuggestions.forEach(suggestedPublication => {
    suggestedPublication.fetchMetadata();
  });
  return filteredSuggestions;
}

const cache = {};

async function cachedFetch(url, processData) {
  if (cache[url]) {
    processData(cache[url]);
  } else {
    await fetch(url)
      .then(response => response.json())
      .then(data => {
        cache[url] = data;
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

@import "~bulma";
@import "~buefy/src/scss/buefy";

@import "v-tooltip.scss";

#app {
  display: grid;
  grid-template-areas:
    "header header"
    "left right";
  height: 100vh;
  grid-template-rows: 90px auto;
  grid-template-columns: 50fr 50fr;
}
#header {
  padding: 0.5rem 1rem;
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
.icon.is-large {
  margin-top: 0.5rem;
}
.icon.is-small {
  margin-left: 0.5rem;
}
</style>
