<template>
  <ModalDialog v-model="isSearchModalDialogShown" title="Search/add publications" icon="mdi-magnify" headerColor="primary">
    <template v-slot:sticky>
      <form v-on:submit.prevent="search" class="has-background-primary-95">
        <v-text-field clearable v-model="interfaceStore.searchQuery" type="input" ref="searchInput" variant="solo"
          append-icon="mdi-magnify" @click:append="search" density="compact"
          hint="Search for keywords, names, etc. or add by providing DOI(s) in any format">
        </v-text-field>
      </form>
    </template>
    <template v-slot:footer>
      <v-card-actions :class="`has-background-primary-95`">
        <p class="comment is-hidden-mobile">
          <span v-show="['doi', 'search'].includes(searchResults.type)">Showing
            <b>{{ filteredSearchResults.length }} publication{{
              filteredSearchResults.length != 1 ? "s" : ""
            }}</b>
            based on
            <span v-show="searchResults.type === 'doi'">detected <b>DOIs</b></span><span
              v-show="searchResults.type === 'search'"><b>search</b></span>.</span>
        </p>
        <v-btn class="has-background-primary has-text-white mr-2 is-hidden-mobile" v-on:click="addAllPublications"
          v-show="searchResults.type === 'doi' && filteredSearchResults.length > 0" small>
          <v-icon left>mdi-plus-thick</v-icon> Add all
        </v-btn>
      </v-card-actions>
    </template>
    <div class="content">
      <section>
        <ul class="publication-list">
          <PublicationComponentSearch v-for="publication in filteredSearchResults" :key="publication.doi"
            :publication="publication" :searchQuery="searchResults.type === 'search' ? cleanedSearchQuery : ''"
            v-on:activate="addPublication(publication.doi)" class="pb-4 pt-4" v-show="!this.isLoading">
          </PublicationComponentSearch>
          <v-overlay :model-value="isLoading" contained class="align-center justify-center" persistent theme="dark">
            <div class="d-flex flex-column align-center justify-center">
              <div>
                <v-progress-circular indeterminate size="64"></v-progress-circular>
              </div>
              <div class="comment" v-if="this.searchResults.type === 'empty'">Searching</div>
              <div class="comment" v-else>Loading {{ loaded }}/{{
                filteredSearchResults.length }}</div>
            </div>
          </v-overlay>
        </ul>
      </section>
    </div>
  </ModalDialog>
</template>

<script>
import { storeToRefs } from "pinia";

import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";
import { useQueueStore } from "@/stores/queue.js";
import { useAppState } from "@/composables/useAppState.js";

import PublicationSearch from "@/PublicationSearch.js";

export default {
  name: "SearchModalDialog",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    const queueStore = useQueueStore();
    const { queueForSelected } = useAppState();
    const { isSearchModalDialogShown } = storeToRefs(interfaceStore);
    return { sessionStore, interfaceStore, queueStore, isSearchModalDialogShown, queueForSelected };
  },
  data() {
    return {
      searchResults: { results: [], type: "empty" },
      isLoading: false,
      loaded: 0,
      cleanedSearchQuery: "",
    };
  },
  computed: {
    filteredSearchResults: function () {
      return this.searchResults.results.filter(
        (publication) =>
          !this.sessionStore.selectedPublicationsDois.includes(
            publication.doi
          ) &&
          !this.queueStore.selectedQueue.includes(publication.doi) 
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
      this.loaded = 0;
      if (!this.interfaceStore.searchQuery) {
        this.searchResults = { results: [], type: "empty" };
        return;
      }
      this.isLoading = true;
      this.cleanedSearchQuery = this.interfaceStore.searchQuery.replace(/[^a-zA-Z0-9 ]/g, ' ');
      const publicationSearch = new PublicationSearch(
        this.interfaceStore.searchQuery
      );
      this.searchResults = await publicationSearch.execute();
      if (this.filteredSearchResults.length === 0) {
        this.interfaceStore.showErrorMessage("No matching publications found");
        this.isLoading = false;
        return;
      }
      // set a timer to check if all publications were fetched already (ugly hack - somehow it doesn't work automatically)
      const check = () => {
        let loaded = 0;
        this.filteredSearchResults.forEach((publication) => {
          if (publication.wasFetched) {
            loaded++;
          }
        });
        this.loaded = loaded;
        if (loaded === this.filteredSearchResults.length) {
          this.isLoading = false;
          return;
        }
        setTimeout(check.bind(this), 200);
      };
      check.bind(this)();
    },

    addPublication(doi) {
      this.queueForSelected(doi);
    },

    addAllPublications() {
      this.filteredSearchResults.forEach((publication) => {
        this.addPublication(publication.doi);
      });
      this.searchResults = { results: [], type: "empty" };
      this.interfaceStore.searchQuery = "";
    },

    close() {
      this.interfaceStore.isSearchModalDialogShown = false;
      this.reset();
    },

    reset() {
      this.searchResults = { results: [], type: "empty" };
      this.isLoading = false;
    },
  },
};
</script>

<style lang="scss" scoped>
form {
  height: 5.5rem;
  padding: 0.5rem;
}

.content {

  & .publication-list {
    padding: 0;
    margin: 0;
    list-style: none;
    min-height: 100vh;

    & li {
      margin: 0 !important;
      padding: 0.5rem;
      min-height: 4.1rem;
    }
  }
}

.v-card-actions {
  & button {
    margin-bottom: 0 !important;
  }
}

@include comment;
</style>