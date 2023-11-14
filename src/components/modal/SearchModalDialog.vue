<template>
  <ModalDialog v-model="isSearchModalDialogShown" title="Search/add publications" icon="mdi-magnify" headerColor="primary"
    noCloseButton>
    <template v-slot:sticky>
      <form v-on:submit.prevent="search" class="has-background-primary-light">
        <v-text-field clearable v-model="interfaceStore.searchQuery" type="input" ref="searchInput" variant="solo"
          append-icon="mdi-magnify" @click:append="search" density="compact"
          hint="Search for keywords, names, etc. or add by providing DOI(s) in any format">
        </v-text-field>
      </form>
    </template>
    <template v-slot:footer>
      <v-card-actions :class="`has-background-primary-light`">
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
        <p class="comment">
          <b><span v-show="addedPublications.length === 0">No</span><span v-show="addedPublications.length > 0">{{
            addedPublications.length
          }}</span>
            publication<span v-show="addedPublications.length > 1">s</span></b>
          <span v-show="addedPublications.length === 0">&nbsp;yet marked</span>
          to be added to selected.
        </p>
        <v-spacer></v-spacer>
        <v-btn class="level-item has-background-primary has-text-white" @click="updateAndClose" @click.stop="logAdd()"
          :disabled="addedPublications.length === 0">
          <v-icon left>mdi-update</v-icon>Update</v-btn>
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
      if (this.addedPublications.includes(doi)) return;
      this.sessionStore.logQd(doi,"import")
      this.addedPublications.push(doi);
    },

    addAllPublications() {
      this.filteredSearchResults.forEach((publication) => {
        this.addPublication(publication.doi);
        this.sessionStore.logQd(publication.doi,"import")
      });
      this.searchResults = { results: [], type: "empty" };
      this.interfaceStore.searchQuery = "";
    },

    updateAndClose() {
      this.sessionStore.addPublicationsAndUpdate(this.addedPublications);
      this.close();
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
    logAdd(){
      this.sessionStore.logAdd()
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

.comment {
  margin: 0;
  padding: 0.5rem;
  font-size: 0.8rem;
  color: #888;
}
</style>