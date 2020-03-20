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
          <b-tooltip
            label="For a set of selected publications, the tool looks up all citations and lists those papers often citing the selected ones as suggestions."
            position="is-right"
            multilined
          >
            <b-icon icon="info-circle" size="is-small"></b-icon>
          </b-tooltip>
        </div>
      </div>
    </div>
    <SelectedPublicationsComponent
      :publications="selectedPublications"
      v-on:add="addPublicationToSelection"
    />
    <SuggestedPublicationsComponent
      :publications="suggestedPublications"
      v-on:add="addPublicationToSelection"
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
      suggestedPublications: []
    };
  },
  methods: {
    updateSuggestions: async function() {
      this.suggestedPublications = Object.values(await computeSuggestions());
    },
    addPublicationToSelection: function(dois) {
      dois.split(/ |"|\{|\}/).forEach(doi => {
        if (doi.indexOf("10.") === 0 && !publications[doi]) {
          publications[doi] = new Publication(doi);
        }
        this.selectedPublications = Object.values(publications).reverse();
      });
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
    this.citationDOIs = [];
    this.citationCount = 0;
    this.title = "";
    this.year = undefined;
    this.author = undefined;
  }

  async fetchCitations() {
    await cachedFetch(
      `https://opencitations.net/index/coci/api/v1/citations/${this.doi}`,
      citations => {
        this.citationDOIs = [];
        citations.forEach(citation => {
          this.citationDOIs.push(citation.citing);
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
        this.author = metadata.message.author[0].family;
        if (metadata.message.author.length > 2) {
          this.author += " et al.";
        } else if (metadata.message.author.length === 2) {
          this.author += " and " + metadata.message.author[1].family;
        }
      }
    );
  }
}

const publications = {};

async function computeSuggestions() {
  const suggestedPublications = {};
  await Promise.all(
    Object.values(publications).map(async publication => {
      await publication.fetchCitations();
      await publication.fetchMetadata();
    })
  );
  Object.values(publications).forEach(publication => {
    publication.citationDOIs.forEach(citationDOI => {
      if (!publications[citationDOI]) {
        if (!suggestedPublications[citationDOI]) {
          const citingPublication = new Publication(citationDOI);
          citingPublication.fetchMetadata();
          suggestedPublications[citationDOI] = citingPublication;
        }
        suggestedPublications[citationDOI].citationCount++;
      }
    });
  });
  const filteredSuggestions = Object.values(suggestedPublications);
  filteredSuggestions.sort((a, b) => b.citationCount - a.citationCount);
  return filteredSuggestions.slice(0, 10);
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
