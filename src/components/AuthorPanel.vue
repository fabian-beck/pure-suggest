<template>
  <b-modal :active="interfaceStore.isAuthorPanelShown" @close="cancel">
    <div class="card">
      <header class="card-header has-background-primary">
        <p class="card-header-title has-text-white">
          <b-icon icon="account-group"></b-icon>&ensp;Authors of selected
          publications
        </p>
      </header>
      <div class="card-content">
        <div class="content">
          <section>
            <ul>
              <li
                v-for="author in sessionStore.selectedPublicationsAuthors"
                :key="author.id"
                class="media"
              >
                <div class="media-left">
                  <b-icon
                    icon="account"
                    :size="authorIconSize(author.count)"
                  ></b-icon>
                </div>
                <div class="media-content">
                  <div class="content">
                    <div>
                      <strong>{{ author.id }}</strong
                      >&nbsp;<span v-if="author.orcid">
                        <a :href="`https://orcid.org/${author.orcid}`"
                          ><img
                            alt="ORCID logo"
                            src="https://info.orcid.org/wp-content/uploads/2019/11/orcid_16x16.png"
                            width="14"
                            height="14"
                        /></a>
                      </span>
                      <small v-if="author.alternativeNames.length > 1">
                        &ensp;also listed as
                        <b-tag
                          v-for="alternativeName in author.alternativeNames.filter(
                            (name) => name !== author.id
                          )"
                          :key="alternativeName"
                          class="tag alternative-name"
                        >
                          {{ alternativeName }}
                        </b-tag>
                      </small>
                    </div>

                    <div>
                        <strong>{{ author.count }}</strong> selected
                        publication{{ author.count > 1 ? "s" : ""
                        }}<span v-if="author.keywords.length > 0">
                          &ndash; related to<b-tag
                            v-for="keyword in author.keywords"
                            :key="keyword"
                            class="keyword"
                            >{{ keyword }}</b-tag
                          >
                        </span>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </b-modal>
</template>

<script>
import { useSessionStore } from "./../stores/session.js";
import { useInterfaceStore } from "./../stores/interface.js";

export default {
  name: "AuthorPanel",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
  },
  methods: {
    authorIconSize(count) {
      if (count > 5) {
        return "is-large";
      }
      if (count > 2) {
        return "is-medium";
      }
      if (count > 1) {
        return null;
      }
      return "is-small";
    },
    cancel() {
      this.interfaceStore.isAuthorPanelShown = false;
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
    margin-left: 0.25rem;
    margin-right: 0.25rem;
    &.keyword {
      text-decoration: underline;
      text-decoration-color: hsl(48, 100%, 67%);
      text-decoration-thickness: 0.2rem;
    }
  }
}
</style>