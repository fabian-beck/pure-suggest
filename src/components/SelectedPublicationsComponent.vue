<template>
  <div class="selected-publications box has-background-primary">
    <div class="level">
      <div class="level-left has-text-white">
        <div class="level-item" v-tippy="`The <b>publications selected as seeds</b> for computing the suggestions, sorted by score.`
          ">
          <v-icon class="has-text-white">mdi-water-outline</v-icon>
          <h2 class="is-size-5 ml-2">Selected</h2>
        </div>
      </div>
      <div class="level-right" v-show="!isEmpty">
        <div class="level-item">
          <CompactButton icon="mdi-account-group has-text-white" v-tippy="`List <span class='key'>a</span>uthors of selected publications.`
            " v-on:click="interfaceStore.openAuthorModalDialog()"></CompactButton>
          <CompactButton icon="mdi-magnify" class="ml-2 has-text-white" v-tippy="`<span class='key'>S</span>earch/add specific publications to be added to selected.`
            " v-on:click="interfaceStore.openSearchModalDialog()"></CompactButton>
        </div>
      </div>
    </div>
    <div class="header">
      <div>
        <div class="notification queue-panel p-2" v-show="queueStore.isUpdatable">
          <div class="level">
            <div class="has-text-centered level-item queue-description">
              <p>
                <InlineIcon icon="mdi-tray-full" class="mr-2"></InlineIcon>
                <b>Queue:&nbsp;</b>
                <span v-show="queueStore.selectedQueue.length">
                  {{
                    queueStore.selectedQueue.length > 1
                      ? `${queueStore.selectedQueue.length} publications`
                      : "1 publication"
                  }}
                  to be selected</span><span v-show="queueStore.selectedQueue.length &&
                    queueStore.excludedQueue.length
                    ">
                  and </span><span v-show="queueStore.excludedQueue.length">
                  {{
                    queueStore.excludedQueue.length > 1
                      ? `${queueStore.excludedQueue.length} publications`
                      : "1 publication"
                  }}
                  to be excluded</span>.
              </p>
            </div>
            <div class="media-right"
              :class="{ 'level-item': interfaceStore.isMobile, 'level-right': !interfaceStore.isMobile }">
              <CompactButton icon="mdi-pencil" class="ml-2" v-tippy="'Edit publications in queue.'"
                v-on:click="interfaceStore.isQueueModalDialogShown = true"></CompactButton>
              <CompactButton icon="mdi-undo" class="ml-1" v-tippy="'Remove all publications from queue again.'"
                v-on:click="queueStore.clear()"></CompactButton>
              <v-btn class="has-background-primary has-text-white ml-2"
                v-tippy="'Update suggested and excluded publications with queue and compute new suggestions.'"
                @click="updateQueued" prepend-icon="mdi-update">
                <span class="key">U</span>pdate
              </v-btn>
            </div>
          </div>
        </div>
        <div class="notification has-text-centered has-background-primary-95 p-2" v-show="isEmpty">
          <p>
            <i>To start, <b>add publications</b> to selected:</i>
          </p>
          <div class="columns is-multiline is-centered mt-4 mb-2">
            <div class="column is-narrow py-1">
              <v-btn class="has-background-primary-95" @click.stop="interfaceStore.openSearchModalDialog()">
                <v-icon left class="mr-2">mdi-magnify</v-icon>
                Search/add</v-btn>
            </div>
            <div class="column is-narrow py-1">
              <v-btn class="has-background-primary-95" @click.stop="importSession"> <v-icon left
                  class="mr-2">mdi-import</v-icon>
                Import session
              </v-btn>
            </div>
            <div class="column is-narrow py-1">
              <v-btn class="has-background-primary-95" @click.stop="importBibtex">
                <v-icon left class="mr-2">mdi-import</v-icon>
                Import BibTeX
              </v-btn>
            </div>
            <div class="column is-narrow py-1">
              <v-btn class="has-background-primary-95" @click.stop="loadExample()">
                <v-icon left class="mr-2">mdi-file-document</v-icon>
                Load example
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </div>
    <PublicationListComponent ref="publicationList" :publications="sessionStore.selectedPublicationsFiltered"
      :showSectionHeaders="true" publicationType="selected" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSessionStore } from "@/stores/session.js"
import { useInterfaceStore } from "@/stores/interface.js"
import { useQueueStore } from "@/stores/queue.js"
import { useAppState } from "@/composables/useAppState.js"
import { bibtexParser } from "@/lib/Util.js"

const sessionStore = useSessionStore()
const interfaceStore = useInterfaceStore()
const queueStore = useQueueStore()
const { isEmpty, importSession: importSessionFromState, loadExample, updateQueued, loadSession } = useAppState()

const publicationList = ref(null)

function importSession() {
  interfaceStore.showConfirmDialog(`<label>Choose an exported session JSON file:&nbsp;</label>
    <input type="file" id="import-json-input" accept="application/JSON"/>`,
    () =>
      importSessionFromState(
        document.getElementById("import-json-input").files[0]
      ),
    "Import session",
  )
}

function importBibtex() {
  interfaceStore.showConfirmDialog(
    `<label>Choose a BibTeX file:&nbsp;</label>
    <input type="file" id="import-bibtex-input" accept=".bib"/>`,
    async () => {
      const fileInput = document.getElementById("import-bibtex-input");
      const file = fileInput.files[0];

      if (!file) {
        console.error("No file selected");
        return;
      }

      try {
        const parsedData = await bibtexParser(file);
        loadSession(parsedData);
      } catch (error) {
        console.error("Error parsing BibTeX file:", error);
        interfaceStore.showErrorMessage("Error parsing BibTeX file. Please check the file format.");
      }
    },
    "Import BibTeX"
  );
}

onMounted(() => {
  sessionStore.$onAction(({ name, after }) => {
    after(() => {
      if (name === "updateQueued") {
        publicationList.value.$el.scrollTop = 0
      }
    })
  })
})
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

  & .queue-description {
    max-width: calc(46vw - 200px);
  }

  & .publication-list {
    @include scrollable-list;
  }
}

@media screen and (max-width: 1023px) {
  .box {
    & .queue-description {
      max-width: 100vw;
    }
  }
}

.queue-panel {
  background: linear-gradient(135deg, var(--bulma-primary-95) 0%, var(--bulma-primary-90) 100%) !important;
  border-left: 3px solid var(--bulma-primary) !important;
  border-bottom: 2px solid var(--bulma-primary) !important;
}
</style>
