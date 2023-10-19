<template>
  <div class="selected-publications box has-background-primary">
    <div class="level">
      <div class="level-left has-text-white">
        <div class="level-item"
          v-tippy="`The <b>publications selected as seeds</b> for computing the suggestions, sorted by score.`">
          <v-icon class="has-text-white">mdi-water-outline</v-icon>
          <h2 class="is-size-5 ml-2">Selected</h2>
        </div>
      </div>
      <div class="level-right" v-show="!sessionStore.isEmpty">
        <div class="level-item">
          <CompactButton icon="mdi-account-group has-text-white"
            v-tippy="`List <span class='key'>a</span>uthors of selected publications.`"
            v-on:click="interfaceStore.openAuthorModalDialog()"></CompactButton>
          <CompactButton icon="mdi-magnify" class="ml-2 has-text-white"
            v-tippy="`<span class='key'>S</span>earch/add specific publications to be added to selected.`"
            v-on:click="interfaceStore.openSearchModalDialog()"></CompactButton>
        </div>
      </div>
    </div>
    <div class="header">
      <div class="has-background-warning-light p-2 pt-3" v-show="!sessionStore.isEmpty">
        <BoostKeywordsComponent />
      </div>
      <div>
        <div class="notification has-background-primary-light media p-2" v-show="sessionStore.isUpdatable">
          <div class="media-content has-text-centered mt-2">
            <InlineIcon icon="mdi-tray-full" class="mr-1"></InlineIcon>
            <b>Queue:&nbsp;</b>
            <span v-show="sessionStore.selectedQueue.length">
              {{
                sessionStore.selectedQueue.length > 1
                ? `${sessionStore.selectedQueue.length} publications`
                : "1 publication"
              }}
              to be added</span><span v-show="sessionStore.selectedQueue.length &&
                  sessionStore.excludedQueue.length
                  ">
              and </span><span v-show="sessionStore.excludedQueue.length">
              {{
                sessionStore.excludedQueue.length > 1
                ? `${sessionStore.excludedQueue.length} publications`
                : "1 publication"
              }}
              to be excluded</span>.
          </div>
          <div class="media-right level">
            <CompactButton icon="mdi-undo" class="ml-2 level-item" v-tippy="'Remove all publications from queue again.'"
              v-on:click="sessionStore.clearQueues()"></CompactButton>
            <v-btn class="has-background-primary has-text-white ml-2 level-item"
              v-tippy="'Update suggested and excluded publications with queue and compute new suggestions.'"
              @click="sessionStore.updateQueued">
              <v-icon left>mdi-update</v-icon>
              <span class="key">U</span>pdate
            </v-btn>
          </div>
        </div>
        <div class="notification has-text-centered has-background-primary-light p-2" v-show="sessionStore.isEmpty">
          <p>
            <i>To start, <b>add publications</b> to selected:</i>
          </p>
          <div class="level mt-4 mb-2">
            <div class="level-item"></div>
            <div class="level-item">
              <v-btn class="has-background-primary-light" @click.stop="interfaceStore.openSearchModalDialog()">
                <v-icon left class="mr-2">mdi-magnify</v-icon>
                Search/add</v-btn>
            </div>
            <div class="level-item">
              <v-btn class="has-background-primary-light" @click.stop="importSession"> <v-icon left
                  class="mr-2">mdi-import</v-icon>
                Import session
              </v-btn>
            </div>
            <div class="level-item">
              <v-btn class="has-background-primary-light" @click.stop="sessionStore.loadExample()">
                <v-icon left class="mr-2">mdi-file-document</v-icon>
                Load example
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </div>
    <PublicationListComponent ref="publicationList" :publications="sessionStore.selectedPublications" />
  </div>
</template>

<script>
import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";

export default {
  name: "SelectedPublicationsComponent",

  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
  },

  mounted() {
    this.sessionStore.$onAction(({ name, after }) => {
      after(() => {
        if (name === "updateQueued") {
          this.$refs.publicationList.$el.scrollTop = 0;
        }
      });
    });
  },

  methods: {
    importSession: function () {
      this.interfaceStore.showConfirmDialog(`<label>Choose an exported session JSON file:&nbsp;</label>
        <input type="file" id="import-json-input" accept="application/JSON"/>`,
        () =>
          this.sessionStore.importSession(
            document.getElementById("import-json-input").files[0]
          ),
        "Import session",
      );
    },
  },
};
</script>

<style lang="scss" scoped>
.box {
  display: grid;
  grid-template-rows: max-content max-content auto;

  & .header {
    & .notification {
      margin-bottom: 0;
      border-radius: 0;
    }
  }

  & .publication-list {
    @include scrollable-list;
  }
}
</style>