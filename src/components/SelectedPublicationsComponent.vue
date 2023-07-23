<template>
  <div class="selected-publications box has-background-primary">
    <div class="level">
      <div class="level-left has-text-white">
        <div class="level-item"
          data-tippy-content="The <b>publications selected as seeds</b> for computing the suggestions, sorted by score."
          v-tippy>
          <b-icon icon="water-outline"></b-icon>
          <h2 class="is-size-5 ml-2">Selected</h2>
        </div>
      </div>
      <div class="level-right" v-show="!sessionStore.isEmpty">
        <div class="level-item">
          <b-button class="compact-button" icon-left="account-group"
            data-tippy-content="List <span class='key'>a</span>uthors of selected publications." v-tippy
            @click.stop="interfaceStore.openAuthorPanel()"></b-button>
          <b-button class="compact-button" icon-left="magnify"
            data-tippy-content="<span class='key'>S</span>earch/add specific publications to be added to selected."
            v-tippy @click.stop="interfaceStore.openSearchPanel()"></b-button>
        </div>
      </div>
    </div>
    <div class="header">
      <div class="notification has-background-warning-light p-2 pt-3 is-gapless" v-show="!sessionStore.isEmpty">
        <BoostKeywordsComponent />
      </div>
      <div>
        <div class="notification has-background-primary-light media p-2" v-show="sessionStore.isUpdatable">
          <b-icon icon="tray-full" class="media-left ml-2 mt-2 is-hidden-mobile"></b-icon>
          <div class="media-content has-text-centered mt-2">
            <b>Queue:</b>
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
            <b-button class="button ml-2 level-item" icon-left="undo" data-tippy-content="Clear queue and discard update."
              v-tippy @click.stop="sessionStore.clearQueues()"></b-button>
            <b-button class="button has-background-primary has-text-white ml-2 level-item" icon-left="update"
              data-tippy-content="Update suggested and excluded publications with queue and compute new suggestions."
              v-tippy @click="sessionStore.updateQueued"><span class="key">U</span>pdate</b-button>
          </div>
        </div>
        <div class="notification has-text-centered has-background-primary-light p-2" v-show="sessionStore.isEmpty">
          <p>
            <i>To start, <b>add publications</b> to selected:</i>
          </p>
          <div class="level mt-4 mb-2">
            <div class="level-item"></div>
            <div class="level-item">
              <v-btn class="has-background-primary-light" @click.stop="interfaceStore.openSearchPanel()">
                <v-icon left>mdi-magnify</v-icon>
                Search/add</v-btn>
            </div>
            <div class="level-item">
              <v-btn class="has-background-primary-light" @click.stop="importSession"> <v-icon left>mdi-import</v-icon>
                Import session
              </v-btn>
            </div>
            <div class="level-item">
              <v-btn class="has-background-primary-light" @click.stop="sessionStore.loadExample()">
                <v-icon left>mdi-file-document</v-icon>
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
import { useSessionStore } from "./../stores/session.js";
import { useInterfaceStore } from "./../stores/interface.js";

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
      this.$buefy.dialog.confirm({
        title: "Import session",
        message: `<label>Choose an exported session JSON file:&nbsp;</label>
            <input type="file" id="import-json-input" accept="application/JSON"/>`,
        onConfirm: () =>
          this.sessionStore.importSession(
            document.getElementById("import-json-input").files[0]
          ),
      });
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