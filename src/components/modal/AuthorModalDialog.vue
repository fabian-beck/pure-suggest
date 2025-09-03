<template>
  <ModalDialog headerColor="primary" :title="modalTitle" icon="mdi-account-group"
    v-model="interfaceStore.isAuthorModalDialogShown">
    <template v-slot:header-menu>
      <CompactButton v-if="authorStore.activeAuthorId" icon="mdi-arrow-left" 
        @click="authorStore.clearActiveAuthor()" class="back-button mr-2" 
        v-tippy="'Back to author list'" />
      <v-menu :close-on-content-click="false" v-if="!authorStore.activeAuthorId">
        <template v-slot:activator="{ props }">
          <CompactButton icon="mdi-cog" v-bind="props" />
        </template>
        <v-list>
          <v-list-item>
            <v-checkbox v-model="authorStore.isAuthorScoreEnabled" label="Consider publication score"
              @change="updateAuthorScores" density="compact" hint="Otherwise, each publication counts as one"
              persistent-hint />
          </v-list-item>
          <v-list-item>
            <v-checkbox v-model="authorStore.isFirstAuthorBoostEnabled" label="Boost first authors"
              @change="updateAuthorScores" density="compact" hint="Counting first author publications twice"
              persistent-hint />
          </v-list-item>
          <v-list-item>
            <v-checkbox v-model="authorStore.isAuthorNewBoostEnabled" label="Boost new publications"
              @change="updateAuthorScores" density="compact" :hint="`Counting publications tagged as 'new' twice`"
              persistent-hint />
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
    <div class="content">
      <section>
        <ul>
          <li v-for="author in displayedAuthors" :key="author.id"
            class="media pt-3 px-0 mt-0 mb-3 author-item" 
            :class="{ 'clickable-author-item': !authorStore.activeAuthorId }"
            @click="handleAuthorItemClick(author.id)"
            :id="toTagId(author.id)">
            <AuthorGlyph :author="author" class="media-left"></AuthorGlyph>
            <div class="media-content">
              <div class="content">
                <div class="mb-2">
                  <b class="author-name">{{ author.name }}</b>&nbsp;<span v-if="author.orcid">
                    <a :href="`https://orcid.org/${author.orcid}`" @click.stop><img alt="ORCID logo"
                        src="https://info.orcid.org/wp-content/uploads/2019/11/orcid_16x16.png" width="14"
                        height="14" /></a>
                  </span>
                  <small v-if="author.alternativeNames.length > 1">
                    &ensp;also listed as
                    <v-chip v-for="alternativeName in author.alternativeNames.filter(
                      (name) => name !== author.id
                    )" :key="alternativeName" class="tag alternative-name">
                      {{ alternativeName }}
                    </v-chip>
                  </small>
                </div>
                <div class="mb-2 is-size-7">
                  <b>{{ author.count }}</b> selected publication{{
                    author.count > 1 ? "s" : ""
                  }}<span v-if="author.yearMin != author.yearMax">, published between <b>{{ author.yearMin }}</b> and
                    <b>{{ author.yearMax }}</b>
                  </span><span v-else-if="author.yearMin">, published <b>{{ author.yearMin }}</b></span><span
                    v-if="author.newPublication">
                    (<InlineIcon icon="mdi-alarm"></InlineIcon> new)</span>.
                </div>
                <div v-if="authorStore.activeAuthorId && Object.keys(author.keywords).length > 0" class="is-size-7">
                  Related to
                  <v-chip label size="small" class="m-1" v-for="keyword in sessionStore.uniqueBoostKeywords.filter(
                    (keyword) => author.keywords[keyword]
                  )" :key="keyword" :style="keywordStyle(author.keywords[keyword])">{{ keyword }} ({{
                    author.keywords[keyword] }})</v-chip>
                </div>
                <div v-if="authorStore.activeAuthorId && Object.keys(author.coauthors).length > 0" class="is-size-7">
                  Co-author of
                  <v-chip label size="small" class="coauthor coauthor-chip m-1" v-for="coauthorId in Object.keys(author.coauthors).sort(
                    (a, b) => author.coauthors[b] - author.coauthors[a]
                  )" :key="coauthorId" :style="coauthorStyle(author.coauthors[coauthorId])"
                    @click.stop="activateAuthor(coauthorId)">
                    {{authorStore.selectedPublicationsAuthors.filter(author => author.id === coauthorId)[0].name}}
                    ({{
                      author.coauthors[coauthorId] }})
                  </v-chip>
                </div>
              </div>
            </div>
            <div class="media-right">
              <CompactButton icon="mdi-school" :href="`https://scholar.google.com/scholar?q=${author.id}`"
                @click.stop
                v-tippy="'Search author on Google Scholar'"></CompactButton>
            </div>
          </li>
        </ul>
        
        <!-- Show related publications when author is active -->
        <div v-if="authorStore.activeAuthorId" class="mt-4">
          <h4 class="mb-3">Publications co-authored by {{ authorStore.activeAuthor?.name }}:</h4>
          <div v-for="publication in authorStore.selectedPublicationsForAuthor" :key="publication.doi" 
            class="author-publication mb-3">
            <PublicationComponent :publication="publication" :is-active="false" publicationType="selected" />
          </div>
        </div>
      </section>
    </div>
  </ModalDialog>
</template>

<script>
import { useSessionStore } from "@/stores/session.js";
import { useAuthorStore } from "@/stores/author.js";
import { useInterfaceStore } from "@/stores/interface.js";
import PublicationComponent from "@/components/PublicationComponent.vue";

export default {
  name: "AuthorModalDialog",
  components: {
    PublicationComponent
  },
  setup() {
    const sessionStore = useSessionStore();
    const authorStore = useAuthorStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, authorStore, interfaceStore };
  },
  data() {
    return {
      authorSettingsChanged: false
    };
  },
  computed: {
    displayedAuthors() {
      if (this.authorStore.activeAuthorId) {
        // Show only the active author
        return this.authorStore.selectedPublicationsAuthors.filter(
          author => author.id === this.authorStore.activeAuthorId
        );
      }
      // Show all authors
      return this.authorStore.selectedPublicationsAuthors;
    },
    modalTitle() {
      if (this.authorStore.activeAuthorId && this.authorStore.activeAuthor) {
        return this.authorStore.activeAuthor.name;
      }
      return "Authors of selected";
    }
  },
  expose: ["scrollToAuthor"],
  methods: {
    keywordStyle(count) {
      return {
        backgroundColor: `hsla(48, 100%, 67%, ${0.05 + Math.min(count / 20, 0.95)})`,
      };
    },
    coauthorStyle(count) {
      return {
        backgroundColor: `hsla(0, 0%, 70%, ${0.05 + Math.min(count / 20, 0.95)})`,
      };
    },
    cancel() {
      this.interfaceStore.isAuthorModalDialogShown = false;
    },
    handleAuthorItemClick(authorId) {
      // Only activate if not already in single-author view
      if (!this.authorStore.activeAuthorId) {
        this.authorStore.setActiveAuthor(authorId);
      }
    },

    activateAuthor(authorId) {
      // Used for coauthor chip clicks - always switch to that author
      this.authorStore.setActiveAuthor(authorId);
    },

    updateAuthorScores() {
      this.authorStore.computeSelectedPublicationsAuthors(this.sessionStore.selectedPublications);
      
      // Mark that settings have changed during this modal session
      this.authorSettingsChanged = true;
    },

    scrollToAuthor(id) {
      const tagId = this.toTagId(id);
      const authorElement = document.getElementById(tagId);
      authorElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
      const authorElementClasses = authorElement.classList;
      authorElementClasses.add("highlight");
      setTimeout(() => {
        authorElementClasses.remove("highlight");
      }, 3000);
    },
    toTagId(id) {
      return `author-${id.replace(/[^a-zA-Z0-9]/g, "-")}`;
    },

    handleModalClose() {
      // Clear active author when modal is closed
      this.authorStore.clearActiveAuthor();
      
      // Only trigger network replot if settings were changed during this modal session
      if (this.authorSettingsChanged) {
        // Small delay to ensure modal is fully closed before network operations
        this.$nextTick(() => {
          // Use the clean interface store method to trigger network replot
          this.interfaceStore.triggerNetworkReplot();
          // Reset the change tracking
          this.authorSettingsChanged = false;
        });
      }
    },
  },
  watch: {
    'interfaceStore.scrollAuthorId': {
      handler: function (newValue) {
        if (newValue) {
          // wait for 1 second to ensure that the author list is rendered
          setTimeout(() => {
            this.scrollToAuthor(newValue);
            this.interfaceStore.scrollAuthorId = null;
          }, 1000);
        }
      },
    },
    'interfaceStore.isAuthorModalDialogShown': {
      handler: function (newValue, oldValue) {
        // Detect when modal is closed (was true, now false)
        if (oldValue === true && newValue === false) {
          this.handleModalClose();
        }
        // Reset change tracking when modal opens
        else if (oldValue === false && newValue === true) {
          this.authorSettingsChanged = false;
        }
      },
    },
  }
};
</script>

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

    & .clickable-author-item {
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
</style>