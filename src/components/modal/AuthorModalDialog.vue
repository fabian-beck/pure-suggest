<template>
  <ModalDialog headerColor="primary" title="Authors of selected" icon="mdi-account-group"
    v-model="interfaceStore.isAuthorModalDialogShown">
    <template v-slot:header-menu>
      <v-menu :close-on-content-click="false">
        <template v-slot:activator="{ props }">
          <CompactButton icon="mdi-cog" v-bind="props" />
        </template>
        <v-list>
          <v-list-item>
            <v-checkbox v-model="sessionStore.isAuthorScoreEnabled" label="Consider publication score"
              @change="sessionStore.updateScores(); sessionStore.logAuthorFilter('Consider pubscore'+(sessionStore.isAuthorScoreEnabled ? ' on' : ' off'))" density="compact"
              hint="Otherwise, each publication counts as one" persistent-hint />
          </v-list-item>
          <v-list-item>
            <v-checkbox v-model="sessionStore.isFirstAuthorBoostEnabled" label="Boost first authors"
              @change="sessionStore.updateScores(); sessionStore.logAuthorFilter('Boost 1st authors'+(sessionStore.isFirstAuthorBoostEnabled ? ' on' : ' off'))" density="compact"
              hint="Counting first author publications twice" persistent-hint />
          </v-list-item>
          <v-list-item>
            <v-checkbox v-model="sessionStore.isAuthorNewBoostEnabled" label="Boost new publications"
              @change="sessionStore.updateScores(), sessionStore.logAuthorFilter('Boost new pubs'+(sessionStore.isAuthorNewBoostEnabled ? ' on' : ' off'))" density="compact"
              :hint="`Counting publications tagged as 'new' twice`" persistent-hint />
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
    <div class="content">
      <section>
        <ul>
          <li v-for="author in sessionStore.selectedPublicationsAuthors" :key="author.id" class="media"
            :id="toTagId(author.id)">
            <AuthorGlyph :author="author" class="media-left"></AuthorGlyph>
            <div class="media-content">
              <div class="content">
                <div class="mb-3">
                  <b>{{ author.name }}</b>&nbsp;<span v-if="author.orcid">
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
                <div class="mb-2 is-size-7">
                  <b>{{ author.count }}</b> selected publication{{
                    author.count > 1 ? "s" : ""
                  }}<span v-if="author.yearMin != author.yearMax">, published between <b>{{ author.yearMin }}</b> and
                    <b>{{ author.yearMax }}</b>
                  </span><span v-else-if="author.yearMin">, published <b>{{ author.yearMin }}</b></span><span
                    v-if="author.newPublication">
                    (<InlineIcon icon="mdi-alarm"></InlineIcon> new)</span>.
                </div>
                <div v-if="Object.keys(author.keywords).length > 0" class="is-size-7">
                  Related to
                  <v-chip class="tag" v-for="keyword in sessionStore.uniqueBoostKeywords.filter(
                    (keyword) => author.keywords[keyword]
                  )" :key="keyword" :style="keywordStyle(author.keywords[keyword])">{{ keyword }} ({{
  author.keywords[keyword] }})</v-chip>
                </div>
                <div class="is-size-7">
                  Co-author of
                  <v-chip class="tag coauthor" v-for="coauthorId in Object.keys(author.coauthors).sort(
                    (a, b) => author.coauthors[b] - author.coauthors[a]
                  )" :key="coauthorId" :style="coauthorStyle(author.coauthors[coauthorId])"
                    @click="scrollToAuthor(coauthorId)">
                    {{ sessionStore.selectedPublicationsAuthors.filter(author => author.id === coauthorId)[0].name }} ({{
                      author.coauthors[coauthorId] }})
                  </v-chip>
                </div>
              </div>
            </div>
            <div class="media-right">
              <CompactButton icon="mdi-school" :href="`https://scholar.google.com/scholar?q=${author.id}`"
                v-tippy="'Search author on Google Scholar'" @click = "sessionStore.logAuthorScholarClick()"></CompactButton>
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

export default {
  name: "AuthorModalDialog",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
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
  }


}
</style>