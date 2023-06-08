<template>
  <b-modal :active="interfaceStore.isAuthorPanelShown" @close="cancel">
    <div class="card">
      <header class="card-header has-background-primary">
        <p class="card-header-title has-text-white">
          <b-icon icon="account-group"></b-icon>&ensp;Most frequent authors
          among selected publications
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
                    <strong>{{ author.id }}</strong>
                    <br />
                    <small>{{ author.count }} publication{{ author.count > 1 ? "s" : "" }}</small>
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
}
</style>