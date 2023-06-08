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
              <li v-for="author in sessionStore.selectedPublicationsAuthors" :key="author.id">
                {{ author }}
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
    cancel() {
      this.interfaceStore.isAuthorPanelShown = false;
    },
  },
};
</script>