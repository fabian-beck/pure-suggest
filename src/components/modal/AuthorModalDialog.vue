<template>
  <ModalDialog headerColor="primary" title="Authors of selected" icon="mdi-account-group"
    v-model="interfaceStore.isAuthorModalDialogShown">
    <div class="content">
      <section>
        <h2 class="mb-2">
          <v-icon icon="mdi-counter" class="mr-2" />
          Author score settings
        </h2>
        <v-form class="mb-4">
          <v-container>
            <v-row>
              <v-col cols="12" md="4">
                <v-checkbox v-model="sessionStore.isAuthorScoreEnabled" label="Consider publication score"
                  @change="sessionStore.computeSelectedPublicationsAuthors" density="compact"
                  hint="Otherwise, each publication counts as one" />
              </v-col>
              <v-col cols="12" md="4">
                <v-checkbox v-model="sessionStore.isFirstAuthorBoostEnabled" label="Boost first authors"
                  @change="sessionStore.computeSelectedPublicationsAuthors" density="compact"
                  hint="Counting first author publications twice" />
              </v-col>
              <v-col cols="12" md="4">
                <v-checkbox v-model="sessionStore.isAuthorNewBoostEnabled" label="Boost new publications"
                  @change="sessionStore.computeSelectedPublicationsAuthors" density="compact"
                  :hint="`Counting publications tagged as 'new' twice`" />
              </v-col>
            </v-row>
          </v-container>
        </v-form>
        <h2 class="mb-6">
          <v-icon icon="mdi-view-list" class="mr-2"></v-icon>
          Ranked author list
        </h2>
        <ul>
          <li v-for="author in sessionStore.selectedPublicationsAuthors" :key="author.id" class="media">
            <AuthorGlyph :author="author" class="media-left"></AuthorGlyph>
            <div class="media-content">
              <div class="content">
                <div class="mb-3">
                  <b>{{ author.id }}</b>&nbsp;<span v-if="author.orcid">
                    <a :href="`https://orcid.org/${author.orcid}`"><img alt="ORCID logo"
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
                <div v-if="Object.keys(author.keywords).length > 0" class="is-size-7">
                  Related to
                  <v-chip class="tag" v-for="keyword in sessionStore.boostKeywords.filter(
                    (keyword) => author.keywords[keyword]
                  )" :key="keyword" :style="keywordStyle(author.keywords[keyword])">{{ keyword }} ({{
  author.keywords[keyword] }})</v-chip>
                </div>
                <div class="is-size-7">
                  Co-author of
                  <v-chip class="tag coauthor" v-for="coauthor in Object.keys(author.coauthors).sort(
                    (a, b) => author.coauthors[b] - author.coauthors[a]
                  )" :key="coauthor" :style="coauthorStyle(author.coauthors[coauthor])">
                    {{ coauthor }} ({{ author.coauthors[coauthor] }})
                  </v-chip>
                </div>
                <div>
                  <CompactButton icon="mdi-school" :href="`https://scholar.google.com/scholar?q=${author.id}`"
                    v-tippy="'Search author on Google Scholar'"></CompactButton>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </ModalDialog>
</template>

<script>
import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";
import AuthorGlyph from "../AuthorGlyph.vue";

export default {
    name: "AuthorModalDialog",
    setup() {
        const sessionStore = useSessionStore();
        const interfaceStore = useInterfaceStore();
        return { sessionStore, interfaceStore };
    },
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
    },
    components: { AuthorGlyph }
};
</script>

<style scoped lang="scss">
.content ul {
  list-style-type: none;
  padding: 0;
  margin: 0;

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
}
</style>