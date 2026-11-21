<script>
import { storeToRefs } from 'pinia'

import { useAppState } from '@/composables/useAppState.js'
import PublicationSearch from '@/core/PublicationSearch.js'
import { handlePublicationKey } from '@/lib/Keys.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useModalStore } from '@/stores/modal.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'

export default {
  name: 'SearchModalDialog',
  setup() {
    const sessionStore = useSessionStore()
    const interfaceStore = useInterfaceStore()
    const modalStore = useModalStore()
    const queueStore = useQueueStore()
    const { queueForSelected } = useAppState()
    const { isSearchModalDialogShown } = storeToRefs(modalStore)
    return {
      sessionStore,
      interfaceStore,
      modalStore,
      queueStore,
      isSearchModalDialogShown,
      queueForSelected
    }
  },
  data() {
    return {
      searchResults: { results: [], type: 'empty' },
      isLoading: false,
      loaded: 0,
      total: 0,
      cleanedSearchQuery: '',
      searchCancelled: false,
      lastSearchQuery: '',
      searchCount: 0
    }
  },
  computed: {
    filteredSearchResults() {
      // Don't show any results if search was cancelled
      if (this.searchCancelled) {
        return []
      }

      return this.searchResults.results.filter(
        (publication) =>
          !this.sessionStore.selectedPublicationsDoiSet.has(publication.doi) &&
          !this.queueStore.selectedQueue.includes(publication.doi)
      )
    }
  },
  watch: {
    isSearchModalDialogShown: {
      handler() {
        if (!this.isSearchModalDialogShown) return
        if (this.modalStore.searchQuery) {
          this.search()
        }
      }
    },
    'modalStore.searchQuery': {
      handler() {
        // Cancel ongoing search when user starts typing new query
        if (this.isLoading) {
          this.cancelSearch()
        }
      }
    }
  },
  mounted() {
    document.addEventListener('keydown', this.handleKeydown)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeydown)
  },
  methods: {
    handleKeydown(event) {
      if (event.key === 'Escape' && this.isLoading && this.isSearchModalDialogShown) {
        this.cancelSearch()
      }
    },

    cancelSearch() {
      this.searchCount++
      this.lastSearchQuery = ''
      this.searchCancelled = true
      this.isLoading = false
      this.loaded = 0
      this.total = 0
      this.searchResults = { results: [], type: 'empty' }
    },

    async search() {
      // Don't perform search if query is the same as last search
      if (this.modalStore.searchQuery === this.lastSearchQuery) {
        return
      }

      // Cancel any ongoing search before starting a new one
      if (this.isLoading) {
        this.cancelSearch()
      }

      this.loaded = 0
      this.total = 0
      this.searchCancelled = false
      if (!this.modalStore.searchQuery?.trim()) {
        this.searchResults = { results: [], type: 'empty' }
        this.lastSearchQuery = ''
        return
      }
      this.isLoading = true
      this.lastSearchQuery = this.modalStore.searchQuery
      this.cleanedSearchQuery = this.modalStore.searchQuery.replace(/[^a-zA-Z0-9 ]/g, ' ')
      const searchCount = ++this.searchCount
      const publicationSearch = new PublicationSearch(this.modalStore.searchQuery)
      const searchResults = await publicationSearch.execute((loaded, total) => {
        if (searchCount !== this.searchCount) return
        this.loaded = loaded
        this.total = total
      })

      // Drop the results if the search was cancelled or replaced during execution
      if (searchCount !== this.searchCount) {
        return
      }
      this.searchResults = searchResults

      if (this.filteredSearchResults.length === 0) {
        this.interfaceStore.showErrorMessage('No matching publications found')
      }
      this.isLoading = false
    },

    addPublication(doi) {
      this.queueForSelected(doi)
    },

    addAllPublications() {
      this.filteredSearchResults.forEach((publication) => {
        this.addPublication(publication.doi)
      })
      this.searchResults = { results: [], type: 'empty' }
      this.modalStore.searchQuery = ''
    },

    onDialogKey(event, index) {
      if (event.key === 's') {
        event.preventDefault()
        this.$refs.searchInput.focus()
        return
      }
      const publication = this.filteredSearchResults[index]
      if (!publication) return
      if (event.key === 'Enter' && event.target.classList.contains('dialog-item')) {
        event.preventDefault()
        this.addPublication(publication.doi)
        return
      }
      handlePublicationKey(event, publication)
    },

    close() {
      this.modalStore.isSearchModalDialogShown = false
      this.reset()
    },

    reset() {
      this.searchCount++
      this.searchResults = { results: [], type: 'empty' }
      this.isLoading = false
      this.searchCancelled = false
      this.loaded = 0
      this.total = 0
      this.lastSearchQuery = ''
    }
  }
}
</script>

<template>
  <ModalDialog
    v-model="isSearchModalDialogShown"
    title="Search/add publications"
    icon="mdi-magnify"
    header-color="primary"
    @dialog-key="onDialogKey"
  >
    <template #sticky>
      <form @submit.prevent="search" class="has-background-primary-95">
        <div class="search-controls">
          <v-text-field
            clearable
            v-model="modalStore.searchQuery"
            type="input"
            ref="searchInput"
            aria-label="Search publications"
            variant="solo"
            append-icon="mdi-magnify"
            @click:append="search"
            @keydown.enter.exact="search"
            @keydown.shift.enter.prevent="searchResults.type === 'doi' && addAllPublications()"
            density="compact"
            hint="Search for keywords or by providing DOI(s) in any format. Results are merged from both OpenAlex and CrossRef and ranked by relevance."
            class="search-field dialog-initial-focus"
          >
          </v-text-field>
        </div>
      </form>
    </template>
    <template #footer>
      <v-card-actions class="has-background-primary-95">
        <p class="comment is-hidden-mobile">
          <span v-show="['doi', 'search'].includes(searchResults.type)"
            >Showing
            <b
              >{{ filteredSearchResults.length }} publication{{
                filteredSearchResults.length != 1 ? 's' : ''
              }}</b
            >
            based on
            <span v-show="searchResults.type === 'doi'">detected <b>DOIs</b></span
            ><span v-show="searchResults.type === 'search'"><b>search</b></span
            >.</span
          >
        </p>
        <v-btn
          class="has-background-primary has-text-white mr-2 is-hidden-mobile"
          @click="addAllPublications"
          v-show="searchResults.type === 'doi' && filteredSearchResults.length > 0"
          v-tippy="'Mark all publications to be added to selected (Shift+Enter in the search field).'"
          small
        >
          <v-icon left>mdi-plus-thick</v-icon> Add all
        </v-btn>
      </v-card-actions>
    </template>
    <div class="content">
      <section>
        <ul class="publication-list">
          <PublicationComponentSearch
            v-for="publication in filteredSearchResults"
            :key="publication.doi"
            :publication="publication"
            :search-query="searchResults.type === 'search' ? cleanedSearchQuery : ''"
            @activate="addPublication(publication.doi)"
            class="pb-4 pt-4"
            v-show="!this.isLoading"
          >
          </PublicationComponentSearch>
          <v-overlay
            :model-value="isLoading"
            contained
            class="align-center justify-center"
            persistent
            theme="dark"
          >
            <div class="d-flex flex-column align-center justify-center">
              <v-progress-circular color="white" indeterminate size="64"></v-progress-circular>
              <div class="search-loading-message" v-if="total === 0">Searching</div>
              <div class="search-loading-message" v-else>Loading {{ loaded }}/{{ total }}</div>
            </div>
          </v-overlay>
        </ul>
      </section>
    </div>
  </ModalDialog>
</template>

<style lang="scss" scoped>
form {
  height: 5.5rem;
  padding: 0.5rem;
}

.search-controls {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.search-field {
  flex: 1;
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

.search-loading-message {
  max-width: min(80vw, 24rem);
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: rgb(0 0 0 / 52%);
  color: white;
  line-height: 1.35;
  text-align: center;
  overflow-wrap: anywhere;
  box-shadow: 0 0.25rem 1rem rgb(0 0 0 / 20%);
}

@include comment;
</style>
