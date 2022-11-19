<template>
  <b-modal :active="interfaceStore.isSearchPanelShown" @close="cancel">
    <div class="card">
      <header class="card-header has-background-primary">
        <p class="card-header-title has-text-white">
          <b-icon icon="magnify"></b-icon>&ensp;Search Publications
        </p>
      </header>
      <div class="card-content">
        <div class="content">
          <section>
            <form v-on:submit.prevent="search" class="field has-addons">
              <p class="control is-expanded">
                <input
                  class="input search-publication"
                  placeholder="Search for keywords, names, etc. or provide DOI(s)"
                  type="text"
                  v-model="interfaceStore.searchQuery"
                  ref="searchInput"
                />
              </p>
              <p class="control">
                <b-button
                  class="button level-right has-background-primary-light"
                  type="submit"
                  icon-left="magnify"
                  @click.stop="search"
                >
                </b-button>
              </p>
            </form>
            <ul class="publication-list">
              <li
                v-for="publication in filteredSearchResults"
                class="publication-component media"
                :key="publication.doi"
              >
                <div class="media-content">
                  <b> {{ publication.title }} </b
                  ><span v-if="publication.author">
                    (<span>{{
                      publication.authorShort ? publication.authorShort + ", " : ""
                    }}</span
                    ><span :class="publication.year ? '' : 'unknown'">{{
                      publication.year ? publication.year : "[unknown year]"
                    }}</span
                    >)</span
                  >
                  <span>
                    DOI:
                    <a :href="`https://doi.org/${publication.doi}`">{{ publication.doi }}</a>
                  </span>
                  <span v-show="publication.title">
                    <a
                      :href="`https://scholar.google.de/scholar?hl=en&q=${
                        publication.title
                      } ${publication.author ? publication.author : ''}`"
                      class="ml-2"
                    >
                      <b-icon
                        icon="school"
                        size="is-small"
                        data-tippy-content="Google Scholar"
                        v-tippy
                      ></b-icon
                    ></a>
                  </span>
                </div>
                <div class="media-right">
                  <div>
                    <b-button
                      class="is-primary is-small"
                      icon-left="plus-thick"
                      data-tippy-content="Mark publication to be added to selected publications."
                      v-tippy
                      @click.stop="addPublication(publication.doi)"
                    >
                    </b-button>
                  </div>
                </div>
              </li>
              <b-loading v-model="isLoading"></b-loading>
            </ul>
          </section>
        </div>
      </div>
      <footer class="card-footer level">
        <div class="level-left">
          <div class="level-item">
            <p>
              <span v-show="addedPublications.length === 0">No</span
              ><span v-show="addedPublications.length > 0">{{
                addedPublications.length
              }}</span>
              publication<span v-show="addedPublications.length > 1">s</span>
              <span v-show="addedPublications.length === 0"
                >&nbsp;yet marked</span
              >
              to be added
            </p>
          </div>
        </div>
        <div class="level-right">
          <b-button class="level-item" @click="cancel()">Cancel</b-button>
          <b-button
            class="level-item is-primary"
            @click="addAndClose"
            :disabled="addedPublications.length === 0"
            icon-left="plus-thick"
            >Add</b-button
          >
        </div>
      </footer>
    </div>
  </b-modal>
</template>

<script>
import { storeToRefs } from "pinia";

import { useSessionStore } from "./../stores/session.js";
import { useInterfaceStore } from "./../stores/interface.js";

import PublicationSearch from "./../PublicationSearch.js";

export default {
  name: "SearchPanel",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    const { isSearchPanelShown } = storeToRefs(interfaceStore);
    return { sessionStore, interfaceStore, isSearchPanelShown };
  },
  data() {
    return {
      searchResults: [],
      addedPublications: [],
      isLoading: false,
    };
  },
  computed: {
    filteredSearchResults: function () {
      return this.searchResults.filter(
        (publication) =>
          !this.sessionStore.selectedPublicationsDois.includes(publication.doi) &&
          !this.sessionStore.selectedQueue.includes(publication.doi) &&
          !this.addedPublications.includes(publication.doi)
      );
    },
  },
  watch: {
    isSearchPanelShown: {
      handler: function () {
        if (!this.isSearchPanelShown) return;
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
        this.searchResults = [];
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

    addAndClose() {
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
      this.interfaceStore.isSearchPanelShown = false;
      this.reset();
    },

    reset() {
      this.interfaceStore.searchQuery = "";
      this.searchResults = [];
      this.addedPublications = [];
      this.isLoading = false;
    },
  },
};
</script>

<style lang="scss">
.card {
  & .publication-list {
    padding: 0;
    margin: 0;
    list-style: none;
    height: calc(100vh - 350px);
    border: 1px solid $border;
    @include scrollable-list;

    & li {
      margin: 0 !important;
      padding: 0.5rem;
      min-height: 4.1rem;
    }
  }

  & footer {
    padding: 1rem;
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
        height: calc(100vh - 320px);
      }
    }
    & footer {
      padding: 0.5rem;

      & .level-left {
        font-size: 0.8rem;
        width: calc(80vw - 50px);
      }

      & .level-right {
        margin-top: 0;
      }
    }
  }
}
</style>