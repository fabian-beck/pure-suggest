<template>
  <ModalDialog headerColor="primary" title="Authors of selected" icon="mdi-account-group" v-model="interfaceStore.isAuthorModalDialogShown">
    <div class="content">
      <section>
        <ul>
          <li v-for="author in sessionStore.selectedPublicationsAuthors" :key="author.id" class="media">
            <div class="media-left">
              <v-icon :size="authorIconSize(author.count)">mdi-account</v-icon>
            </div>
            <div class="media-content">
              <div class="content">
                <div>
                  <strong>{{ author.id }}</strong>&nbsp;<span v-if="author.orcid">
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
                <div>
                  <strong>{{ author.count }}</strong> selected publication{{
                    author.count > 1 ? "s" : ""
                  }}<span v-if="author.yearMin != author.yearMax">, {{ author.yearMin }} to {{ author.yearMax }}
                  </span><span v-else-if="author.yearMin">, {{ author.yearMin }}</span>
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

export default {
  name: "AuthorModalDialog",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
  },
  methods: {
    authorIconSize(count) {
      if (count > 5) {
        return "48";
      }
      if (count > 2) {
        return "32";
      }
      if (count > 1) {
        return "24";
      }
      return "18";
    },
    keywordStyle(count) {
      return {
        backgroundColor: `hsla(48, 100%, 67%, ${0.05 + Math.min(count / 20, 0.95)
          })`,
      };
    },
    coauthorStyle(count) {
      return {
        backgroundColor: `hsla(0, 0%, 70%, ${0.05 + Math.min(count / 20, 0.95)
          })`,
      };
    },
    cancel() {
      this.interfaceStore.isAuthorModalDialogShown = false;
    },
  },
};
</script>

<style scoped lang="scss">
.content ul {
  list-style-type: none;
  padding: 0;
  margin: 0;

  & .media-left {
    min-width: 3rem;
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