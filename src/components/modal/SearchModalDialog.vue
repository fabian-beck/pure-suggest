<template>
  <ModalDialog v-model="isSearchModalDialogShown" @close="cancel" title="Search/add publications" icon="mdi-magnify"
    headerColor="primary" noCloseButton>
    <div class="content">
      <section>
        <form v-on:submit.prevent="search" class="field has-addons mb-2">
          <v-text-field clearable v-model="interfaceStore.searchQuery" type="input" ref="searchInput" variant="solo"
            append-icon="mdi-magnify" @click:append="search" density="compact" hide-details
            placeholder="Search for keywords, names, etc. or add by providing DOI(s) in any format">
          </v-text-field>
        </form>
        <p class="notification has-background-white p-2 mb-2">
          <span v-show="['doi', 'search'].includes(searchResults.type)">Showing
            <b>{{ filteredSearchResults.length }} publication{{
              filteredSearchResults.length != 1 ? "s" : ""
            }}</b>
            based on
            <span v-show="searchResults.type === 'doi'">detected <b>DOIs</b></span><span
              v-show="searchResults.type === 'search'"><b>search</b></span>.</span>
          <v-btn class="has-background-primary has-text-white ml-4" v-on:click="addAllPublications"
            v-show="searchResults.type === 'doi' && filteredSearchResults.length > 0" small>
            <v-icon left>mdi-plus-thick</v-icon> Add all
          </v-btn>
        </p>
        <ul class="publication-list">
          <li v-for="publication in filteredSearchResults" class="publication-component media" :key="publication.doi">
            <div class="media-content">
              <b v-if="publication.wasFetched && !publication.title" class="has-text-danger-dark">[No metadata
                available]</b>
              <b v-html="publication.title" v-if="publication.wasFetched"></b>
              <span v-if="publication.author">
                (<span>{{
                  publication.authorShort
                  ? publication.authorShort + ", "
                  : ""
                }}</span><span :class="publication.year ? '' : 'unknown'">{{
  publication.year ? publication.year : "[unknown year]"
}}</span>)</span>
              <span>
                DOI:
                <a :href="`https://doi.org/${publication.doi}`">{{
                  publication.doi
                }}</a>
              </span>
              <span v-show="publication.title">
                <CompactButton icon="mdi-school" v-tippy="'Google Scholar'" :href="publication.gsUrl" class="ml-2">
                </CompactButton>
              </span>
            </div>
            <div class="media-right">
              <div>
                <CompactButton icon="mdi-plus-thick" v-tippy="'Mark publication to be added to selected publications.'"
                  @click="addPublication(publication.doi)" v-if="publication.wasFetched"></CompactButton>
              </div>
            </div>
            <v-overlay :model-value="!publication.wasFetched" contained class="align-center justify-center" persistent
              theme="dark">
              <v-icon class="has-text-grey-light">mdi-progress-clock</v-icon>
            </v-overlay>
          </li>
          <v-overlay :model-value="isLoading" contained class="align-center justify-center" persistent theme="dark">
            <v-progress-circular indeterminate size="64"></v-progress-circular>
          </v-overlay>
        </ul>
      </section>
    </div>
    <div class="level">
      <div class="level-left">
        <div class="level-item">
          <p>
            <b><span v-show="addedPublications.length === 0">No</span><span v-show="addedPublications.length > 0">{{
              addedPublications.length
            }}</span>
              publication<span v-show="addedPublications.length > 1">s</span></b>
            <span v-show="addedPublications.length === 0">&nbsp;yet marked</span>
            to be added to selected.
          </p>
        </div>
      </div>
      <div class="level-right">
        <v-btn class="level-item" @click="cancel()">Close</v-btn>
        <v-btn class="level-item has-background-primary has-text-white" @click="updateAndClose"
          :disabled="addedPublications.length === 0">
          <v-icon left>mdi-update</v-icon>Update</v-btn>
      </div>
    </div>
  </ModalDialog>
</template>

<script>
import { storeToRefs } from "pinia";

import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";

import PublicationSearch from "@/PublicationSearch.js";

export default {
  name: "SearchModalDialog",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    const { isSearchModalDialogShown } = storeToRefs(interfaceStore);
    return { sessionStore, interfaceStore, isSearchModalDialogShown };
  },
  data() {
    return {
      searchResults: { results: [], type: "empty" },
      addedPublications: [],
      isLoading: false,
    };
  },
  computed: {
    filteredSearchResults: function () {
      return this.searchResults.results.filter(
        (publication) =>
          !this.sessionStore.selectedPublicationsDois.includes(
            publication.doi
          ) &&
          !this.sessionStore.selectedQueue.includes(publication.doi) &&
          !this.addedPublications.includes(publication.doi)
      );
    },
  },
  watch: {
    isSearchModalDialogShown: {
      handler: function () {
        if (!this.isSearchModalDialogShown) return;
        setTimeout(() => {
          this.$refs.searchInput.focus();
        }, 300);
        if (this.interfaceStore.searchQuery) {
          this.search();
        }
      },
    },
  },
  methods: {
    search: async function () {
      if (!this.interfaceStore.searchQuery) {
        this.searchResults = { results: [], type: "empty" };
        return;
      }
      this.isLoading = true;
      const publicationSearch = new PublicationSearch(
        this.interfaceStore.searchQuery
      );
      this.searchResults = await publicationSearch.execute();
      if (this.filteredSearchResults.length === 0) {
        this.interfaceStore.showErrorMessage("No matching publications found");
      }
      this.isLoading = false;
    },

    addPublication(doi) {
      this.addedPublications.push(doi);
    },

    addAllPublications() {
      this.filteredSearchResults.forEach((publication) => {
        this.addPublication(publication.doi);
      });
      this.searchResults = { results: [], type: "empty" };
      this.interfaceStore.searchQuery = "";
    },

    updateAndClose() {
      this.sessionStore.addPublicationsAndUpdate(this.addedPublications);
      this.close();
    },

    cancel() {
      if (this.addedPublications.length === 0) {
        this.close();
        return;
      }
      this.interfaceStore.showConfirmDialog(
        "Do you really want to discard the list of added publications?",
        () => {
          this.close();
        }
      );
    },

    close() {
      this.interfaceStore.isSearchModalDialogShown = false;
      this.reset();
    },

    reset() {
      this.searchResults = { results: [], type: "empty" };
      this.addedPublications = [];
      this.isLoading = false;
    },
  },
};
</script>

<style lang="scss">
.content {
  & .notification {
    min-height: 40px;
  }

  & .publication-list {
    padding: 0;
    margin: 0;
    list-style: none;
    height: calc(100vh - 370px);
    min-height: 100px;
    border: 1px solid $border;
    @include scrollable-list;

    & li {
      margin: 0 !important;
      padding: 0.5rem;
      min-height: 4.1rem;
    }
  }
}

@include touch {
  .card {
    & .card-content {
      padding: 0.5rem;

      & form .control {
        margin-bottom: 0;
      }

      & .publication-list {
        height: calc(100vh - 380px);
      }
    }

    & footer {
      padding: 0.5rem;

      & .level-left {
        font-size: 0.8rem;
        width: calc(80vw - 110px);
      }

      & .level-right {
        margin-top: 0;
      }
    }
  }
}
</style>