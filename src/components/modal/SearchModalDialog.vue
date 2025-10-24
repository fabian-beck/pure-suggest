<script>
import { storeToRefs } from 'pinia'

import { useAppState } from '@/composables/useAppState.js'
import PublicationSearch from '@/core/PublicationSearch.js'
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
      cleanedSearchQuery: '',
      searchCancelled: false,
      lastSearchQuery: ''
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
          !this.sessionStore.selectedPublicationsDois.includes(publication.doi) &&
          !this.queueStore.selectedQueue.includes(publication.doi)
      )
    }
  },
  watch: {
    isSearchModalDialogShown: {
      handler() {
        if (!this.isSearchModalDialogShown) return
        setTimeout(() => {
          if (this.$refs.searchInput && typeof this.$refs.searchInput.focus === 'function') {
            this.$refs.searchInput.focus()
          }
        }, 300)
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
      this.searchCancelled = true
      this.isLoading = false
      this.loaded = 0
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
      this.searchCancelled = false
      if (!this.modalStore.searchQuery) {
        this.searchResults = { results: [], type: 'empty' }
        this.lastSearchQuery = ''
        return
      }
      this.isLoading = true
      this.lastSearchQuery = this.modalStore.searchQuery
      this.cleanedSearchQuery = this.modalStore.searchQuery.replace(/[^a-zA-Z0-9 ]/g, ' ')
      const publicationSearch = new PublicationSearch(this.modalStore.searchQuery)
      this.searchResults = await publicationSearch.execute()

      // Check if search was cancelled during execution
      if (this.searchCancelled) {
        return
      }

      if (this.filteredSearchResults.length === 0) {
        this.interfaceStore.showErrorMessage('No matching publications found')
        this.isLoading = false
        return
      }
      // Poll for publication data loading completion
      const check = () => {
        // Check if search was cancelled
        if (this.searchCancelled) {
          return
        }

        let loaded = 0
        this.filteredSearchResults.forEach((publication) => {
          if (publication.wasFetched) {
            loaded++
          }
        })
        this.loaded = loaded
        if (loaded === this.filteredSearchResults.length) {
          // Re-rank results now that all data is loaded
          this.searchResults.results = this.rankResults(this.searchResults.results)
          this.isLoading = false
          return
        }
        setTimeout(check.bind(this), 200)
      }
      check.bind(this)()
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

    close() {
      this.modalStore.isSearchModalDialogShown = false
      this.reset()
    },

    reset() {
      this.searchResults = { results: [], type: 'empty' }
      this.isLoading = false
      this.searchCancelled = false
      this.loaded = 0
      this.lastSearchQuery = ''
    },

    rankResults(results) {
      const queryWords = this.extractWords(this.cleanedSearchQuery)
      
      // Calculate match scores for each publication
      const scoredResults = results.map((publication) => {
        const score = this.calculateMatchScore(publication, queryWords)
        return { publication, score }
      })
      
      // Sort by score descending
      scoredResults.sort((a, b) => b.score - a.score)
      
      return scoredResults.map((item) => item.publication)
    },

    extractWords(text) {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 3)
    },

    calculateMatchScore(publication, queryWords) {
      let score = 0
      
      const TITLE_WEIGHT = 3
      const AUTHOR_WEIGHT = 2
      const VENUE_WEIGHT = 1
      
      const titleWords = this.extractWords(publication.title || '')
      const authorWords = this.extractWords((publication.authors || []).join(' '))
      const venueWords = this.extractWords(publication.venue || '')
      
      queryWords.forEach((queryWord) => {
        const titleMatches = titleWords.filter((word) => word.includes(queryWord) || queryWord.includes(word)).length
        score += titleMatches * TITLE_WEIGHT
        
        const authorMatches = authorWords.filter((word) => word.includes(queryWord) || queryWord.includes(word)).length
        score += authorMatches * AUTHOR_WEIGHT
        
        const venueMatches = venueWords.filter((word) => word.includes(queryWord) || queryWord.includes(word)).length
        score += venueMatches * VENUE_WEIGHT
      })
      
      return score
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
  >
    <template #sticky>
      <form @submit.prevent="search" class="has-background-primary-95">
        <div class="search-controls">
          <v-text-field
            clearable
            v-model="modalStore.searchQuery"
            type="input"
            ref="searchInput"
            variant="solo"
            append-icon="mdi-magnify"
            @click:append="search"
            @keydown.enter="search"
            density="compact"
            hint="Search for keywords or by providing DOI(s) in any format. Results are merged from both OpenAlex and CrossRef and ranked by relevance."
            class="search-field"
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
              <div>
                <v-progress-circular indeterminate size="64"></v-progress-circular>
              </div>
              <div class="comment" v-if="this.searchResults.type === 'empty'">Searching</div>
              <div class="comment" v-else>
                Loading {{ loaded }}/{{ filteredSearchResults.length }}
              </div>
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

@include comment;
</style>
