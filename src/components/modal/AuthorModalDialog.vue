<script>
import PublicationComponent from '@/components/PublicationComponent.vue'
import { useAuthorStore } from '@/stores/author.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useSessionStore } from '@/stores/session.js'
import { calculateAuthorColor } from '@/utils/authorColor.js'

export default {
  name: 'AuthorModalDialog',
  components: {
    PublicationComponent
  },
  setup() {
    const sessionStore = useSessionStore()
    const authorStore = useAuthorStore()
    const interfaceStore = useInterfaceStore()
    return { sessionStore, authorStore, interfaceStore }
  },
  data() {
    return {
      authorSettingsChanged: false,
      displayedAuthorCount: 20, // Initial number of authors to display
      authorBatchSize: 20, // Number of authors to load per batch
      isLoadingMoreAuthors: false
    }
  },
  computed: {
    displayedAuthors() {
      if (this.authorStore.activeAuthorId) {
        // Show only the active author
        return this.authorStore.selectedPublicationsAuthors.filter(
          (author) => author.id === this.authorStore.activeAuthorId
        )
      }
      // Show authors progressively (lazy loading)
      const allAuthors = this.authorStore.selectedPublicationsAuthors
      return allAuthors.slice(0, this.displayedAuthorCount)
    },
    hasMoreAuthorsToShow() {
      if (this.authorStore.activeAuthorId) {
        return false // No pagination needed in single author view
      }
      return this.displayedAuthorCount < this.authorStore.selectedPublicationsAuthors.length
    },
    modalTitle() {
      if (this.authorStore.activeAuthorId && this.authorStore.activeAuthor) {
        return this.authorStore.activeAuthor.name
      }
      return 'Authors of selected'
    }
  },
  expose: ['scrollToAuthor', 'loadMoreAuthors', 'resetPagination', 'handleScroll'],
  methods: {
    getFilteredAlternativeNames(author) {
      return author.alternativeNames.filter((name) => name !== author.id && name !== author.name)
    },
    getCoauthorName(coauthorId) {
      const coauthor = this.authorStore.selectedPublicationsAuthors.find(
        (author) => author.id === coauthorId
      )
      return coauthor ? coauthor.name : coauthorId // Fallback to ID if coauthor not found
    },
    keywordStyle(count) {
      return {
        backgroundColor: `hsla(48, 100%, 67%, ${0.05 + Math.min(count / 20, 0.95)})`
      }
    },
    coauthorStyle(coauthorId) {
      // Find the co-author in the selectedPublicationsAuthors array
      const coauthor = this.authorStore.selectedPublicationsAuthors.find(
        (author) => author.id === coauthorId
      )
      if (!coauthor) {
        // Fallback to original gray style if co-author not found
        return {
          backgroundColor: `hsla(0, 0%, 70%, 0.3)`,
          color: '#000000'
        }
      }

      // Use the same color calculation as AuthorGlyph but with some transparency
      const authorColor = calculateAuthorColor(coauthor.score, this.authorStore)
      // Extract the lightness value from the HSL color and apply it with transparency
      const lightnessMatch = authorColor.match(/hsl\(0, 0%, (\d+)%\)/)
      const lightness = lightnessMatch ? parseInt(lightnessMatch[1], 10) : 70

      return {
        backgroundColor: `hsla(0, 0%, ${lightness}%, 0.8)`,
        color: '#ffffff'
      }
    },
    cancel() {
      this.interfaceStore.isAuthorModalDialogShown = false
    },
    handleAuthorItemClick(authorId) {
      // Only activate if not already in single-author view
      if (!this.authorStore.activeAuthorId) {
        this.authorStore.setActiveAuthor(authorId)
      }
    },

    activateAuthor(authorId) {
      // Used for coauthor chip clicks - always switch to that author
      this.authorStore.setActiveAuthor(authorId)
    },

    updateAuthorScores() {
      this.authorStore.computeSelectedPublicationsAuthors(this.sessionStore.selectedPublications)

      // Mark that settings have changed during this modal session
      this.authorSettingsChanged = true
    },

    toTagId(id) {
      return `author-${id.replace(/[^a-zA-Z0-9]/g, '-')}`
    },

    handleModalClose() {
      // Clear active author when modal is closed
      this.authorStore.clearActiveAuthor()

      // Only trigger network replot if settings were changed during this modal session
      if (this.authorSettingsChanged) {
        // Small delay to ensure modal is fully closed before network operations
        this.$nextTick(() => {
          // Use the clean interface store method to trigger network replot
          this.interfaceStore.triggerNetworkReplot()
          // Reset the change tracking
          this.authorSettingsChanged = false
        })
      }
    },

    handleScroll(event) {
      if (
        this.authorStore.activeAuthorId ||
        this.isLoadingMoreAuthors ||
        !this.hasMoreAuthorsToShow
      ) {
        return // No pagination needed in single author view or when loading/no more authors
      }

      const container = event.target
      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight
      const clientHeight = container.clientHeight

      // Load more when scrolled to 80% of the content
      const scrollThreshold = 0.8
      if (scrollTop / (scrollHeight - clientHeight) >= scrollThreshold) {
        this.loadMoreAuthors()
      }
    },

    loadMoreAuthors() {
      if (this.isLoadingMoreAuthors || !this.hasMoreAuthorsToShow) {
        return
      }

      this.isLoadingMoreAuthors = true

      // Simulate a small delay to show the loading indicator
      // In a real implementation with server-side pagination, this would be an API call
      setTimeout(() => {
        this.displayedAuthorCount = Math.min(
          this.displayedAuthorCount + this.authorBatchSize,
          this.authorStore.selectedPublicationsAuthors.length
        )
        this.isLoadingMoreAuthors = false
      }, 100)
    },

    resetPagination() {
      this.displayedAuthorCount = this.authorBatchSize
      this.isLoadingMoreAuthors = false
    }
  },
  watch: {
    'interfaceStore.isAuthorModalDialogShown': {
      handler (newValue, oldValue) {
        // Detect when modal is closed (was true, now false)
        if (oldValue === true && newValue === false) {
          this.handleModalClose()
        }
        // Reset change tracking and pagination when modal opens
        else if (oldValue === false && newValue === true) {
          this.authorSettingsChanged = false
          this.resetPagination()
        }
      }
    },
    // Reset pagination when switching between author list and single author view
    'authorStore.activeAuthorId': {
      handler (newValue, oldValue) {
        // Reset pagination when returning to the full author list
        if (oldValue && !newValue) {
          this.resetPagination()
        }
      }
    },
    // Reset pagination when author data changes
    'authorStore.selectedPublicationsAuthors': {
      handler () {
        this.resetPagination()
      }
    }
  }
}
</script>

<template>
  <ModalDialog
    header-color="primary"
    :title="modalTitle"
    icon="mdi-account-group"
    v-model="interfaceStore.isAuthorModalDialogShown"
  >
    <template #header-menu>
      <CompactButton
        v-if="authorStore.activeAuthorId"
        icon="mdi-arrow-left"
        @click="authorStore.clearActiveAuthor()"
        class="back-button mr-2"
        v-tippy="'Back to author list'"
      />
      <v-menu :close-on-content-click="false" v-if="!authorStore.activeAuthorId">
        <template #activator="{ props }">
          <CompactButton icon="mdi-cog" v-bind="props" />
        </template>
        <v-list>
          <v-list-item>
            <v-checkbox
              v-model="authorStore.isAuthorScoreEnabled"
              label="Consider publication score"
              @change="updateAuthorScores"
              density="compact"
              hint="Otherwise, each publication counts as one"
              persistent-hint
            />
          </v-list-item>
          <v-list-item>
            <v-checkbox
              v-model="authorStore.isFirstAuthorBoostEnabled"
              label="Boost first authors"
              @change="updateAuthorScores"
              density="compact"
              hint="Counting first author publications twice"
              persistent-hint
            />
          </v-list-item>
          <v-list-item>
            <v-checkbox
              v-model="authorStore.isAuthorNewBoostEnabled"
              label="Boost new publications"
              @change="updateAuthorScores"
              density="compact"
              hint="Counting publications tagged as 'new' twice"
              persistent-hint
            />
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
    <div class="content" @scroll="handleScroll">
      <section>
        <ul>
          <li
            v-for="author in displayedAuthors"
            :key="author.id"
            class="media p-3 m-0 author-item"
            :class="{ 'clickable-author-item': !authorStore.activeAuthorId }"
            @click="handleAuthorItemClick(author.id)"
            :id="toTagId(author.id)"
          >
            <AuthorGlyph :author="author" class="media-left"></AuthorGlyph>
            <div class="media-content">
              <div class="content">
                <div class="mb-2">
                  <b class="author-name">{{ author.name }}</b
                  >&nbsp;<span v-if="author.orcid">
                    <a :href="`https://orcid.org/${author.orcid}`" @click.stop
                      ><img
                        alt="ORCID logo"
                        src="https://info.orcid.org/wp-content/uploads/2019/11/orcid_16x16.png"
                        width="14"
                        height="14"
                    /></a>
                  </span>
                  <small v-if="getFilteredAlternativeNames(author).length > 0">
                    &ensp;also listed as
                    <v-chip
                      v-for="alternativeName in getFilteredAlternativeNames(author)"
                      :key="alternativeName"
                      class="tag alternative-name"
                    >
                      {{ alternativeName }}
                    </v-chip>
                  </small>
                </div>
                <div class="mb-2 is-size-7">
                  <b>{{ author.count }}</b> selected publication{{ author.count > 1 ? 's' : ''
                  }}<span v-if="author.yearMin != author.yearMax"
                    >, published between <b>{{ author.yearMin }}</b> and
                    <b>{{ author.yearMax }}</b> </span
                  ><span v-else-if="author.yearMin"
                    >, published <b>{{ author.yearMin }}</b></span
                  ><span v-if="author.newPublication">
                    (<InlineIcon icon="mdi-alarm"></InlineIcon> new)</span
                  >.
                </div>
                <div
                  v-if="authorStore.activeAuthorId && Object.keys(author.keywords).length > 0"
                  class="is-size-7"
                >
                  Related to
                  <v-chip
                    label
                    size="small"
                    class="m-1"
                    v-for="keyword in sessionStore.uniqueBoostKeywords.filter(
                      (keyword) => author.keywords[keyword]
                    )"
                    :key="keyword"
                    :style="keywordStyle(author.keywords[keyword])"
                    >{{ keyword }} ({{ author.keywords[keyword] }})</v-chip
                  >
                </div>
                <div
                  v-if="authorStore.activeAuthorId && Object.keys(author.coauthors).length > 0"
                  class="is-size-7"
                >
                  Co-author of
                  <v-chip
                    label
                    size="small"
                    class="coauthor coauthor-chip m-1"
                    v-for="coauthorId in Object.keys(author.coauthors).sort(
                      (a, b) => author.coauthors[b] - author.coauthors[a]
                    )"
                    :key="coauthorId"
                    :style="coauthorStyle(coauthorId)"
                    @click.stop="activateAuthor(coauthorId)"
                  >
                    {{ getCoauthorName(coauthorId) }}
                    ({{ author.coauthors[coauthorId] }})
                  </v-chip>
                </div>
              </div>
            </div>
            <div class="media-right">
              <CompactButton
                icon="mdi-school"
                :href="`https://scholar.google.com/scholar?q=${author.id}`"
                @click.stop
                v-tippy="'Search author on Google Scholar'"
              ></CompactButton>
            </div>
          </li>
        </ul>

        <!-- Loading indicator for more authors -->
        <div v-if="isLoadingMoreAuthors" class="loading-more-authors p-3 text-center">
          <v-progress-circular indeterminate size="24" class="mr-2"></v-progress-circular>
          <span>Loading more authors...</span>
        </div>

        <!-- Load more button (fallback if scroll detection doesn't work) -->
        <div
          v-else-if="hasMoreAuthorsToShow && !authorStore.activeAuthorId"
          class="load-more-authors p-3 text-center"
        >
          <v-btn variant="outlined" @click="loadMoreAuthors" size="small">
            <v-icon left>mdi-arrow-down</v-icon>
            Load more authors ({{
              authorStore.selectedPublicationsAuthors.length - displayedAuthorCount
            }}
            remaining)
          </v-btn>
        </div>

        <!-- Show related publications when author is active -->
        <div v-if="authorStore.activeAuthorId" class="mt-4">
          <div class="mb-3">Publications co-authored by {{ authorStore.activeAuthor?.name }}:</div>
          <div
            v-for="publication in authorStore.selectedPublicationsForAuthor"
            :key="publication.doi"
            class="author-publication mb-3"
          >
            <PublicationComponent
              :publication="publication"
              :is-active="false"
              publication-type="selected"
            />
          </div>
        </div>
      </section>
    </div>
  </ModalDialog>
</template>

<style scoped lang="scss">
.content ul {
  list-style-type: none;
  padding: 0;
  margin: 0;

  & li {
    padding: 0 0.5rem;

    &.highlight {
      background-color: hsla(0, 0%, 70%, 0.5);
      animation: fadeOut 2s forwards;
    }

    @keyframes fadeOut {
      to {
        background-color: transparent;
      }
    }

    & .media-left {
      min-width: 4.5rem;
      min-height: 3rem;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    & .tag {
      margin: 0.25rem;
      position: relative;
      top: -0.1rem;

      &.keyword {
        text-decoration: underline;
        text-decoration-color: hsl(48, 100%, 67%);
        text-decoration-thickness: 0.2rem;
      }
    }

    &.clickable-author-item {
      cursor: pointer;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }
    }

    & .coauthor-chip {
      cursor: pointer;

      &:hover {
        opacity: 0.8;
      }
    }
  }

  .back-button {
    background-color: rgba(0, 0, 0, 0.1);

    &:hover {
      background-color: rgba(0, 0, 0, 0.2);
    }
  }
}

.loading-more-authors {
  color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.load-more-authors {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
