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
                      <strong>{{ author.id }}</strong>
                    </div>
                    <small
                      ><div class="level">
                        <div class="level-left">
                          <div class="level-item">
                            <label>Selected publications:</label
                            >&nbsp;<strong>{{ author.count }}</strong>
                          </div>
                          <div class="level-item ml-6">
                            <label>Boost keywords:</label>
                            <b-tag
                              v-for="keyword in author.keywords"
                              :key="keyword"
                              >{{ keyword }}</b-tag
                            >
                          </div>
                        </div>
                      </div>
                    </small>
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

  & .tag {
    margin-left: 0.25rem;
    text-decoration: underline;
    text-decoration-color: hsl(48, 100%, 67%);
    text-decoration-thickness: 0.2rem;
  }
}
</style>