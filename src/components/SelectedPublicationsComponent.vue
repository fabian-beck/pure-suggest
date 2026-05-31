<script setup>
import { ref, onMounted } from 'vue'

import { useAppState } from '@/composables/useAppState.js'
import { useModalManager } from '@/composables/useModalManager.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'

const sessionStore = useSessionStore()
const { openSearchModal, openAuthorModal, openQueueModal, openConceptConfigModal } = useModalManager()
const queueStore = useQueueStore()
const {
  isEmpty,
  importSessionWithConfirmation,
  importBibtexWithConfirmation,
  loadExample,
  updateQueued
} = useAppState()

const publicationList = ref(null)

onMounted(() => {
  sessionStore.$onAction(({ name, after }) => {
    after(() => {
      if (name === 'updateQueued') {
        publicationList.value.$el.scrollTop = 0
      }
    })
  })
})
</script>

<template>
  <div class="selected-publications box has-background-primary">
    <div class="level is-mobile">
      <div class="level-left has-text-white">
        <div
          class="level-item"
          v-tippy="
            `The <b>publications selected as seeds</b> for computing the suggestions, sorted by score.`
          "
        >
          <v-icon class="has-text-white">mdi-water-outline</v-icon>
          <h2 class="is-size-5 ml-2">Selected</h2>
        </div>
      </div>
      <div class="level-right" v-show="!isEmpty">
        <div class="level-item">
          <CompactButton
            icon="mdi-group has-text-white"
            class="has-text-white"
            v-tippy="`Cluster selected publications using c<span class='key'>o</span>ncept analysis.`"
            @click="openConceptConfigModal()"
          >
            <template #default>C<span class="key">o</span>ncepts</template>
          </CompactButton>
          <CompactButton
            icon="mdi-account-group has-text-white"
            class="ml-2 has-text-white"
            v-tippy="`List <span class='key'>a</span>uthors of selected publications.`"
            @click="openAuthorModal()"
          >
            <template #default><span class="key">A</span>uthors</template>
          </CompactButton>
          <CompactButton
            icon="mdi-magnify"
            class="ml-2 has-text-white"
            v-tippy="
              `<span class='key'>S</span>earch/add specific publications to be added to selected.`
            "
            @click="openSearchModal()"
          >
            <template #default><span class="key">S</span>earch/add</template>
          </CompactButton>
        </div>
      </div>
    </div>
    <div class="header">
      <div>
        <div class="notification queue-panel" v-show="queueStore.isUpdatable">
          <div class="d-flex align-center ga-2">
            <div class="flex-grow-1 has-text-centered queue-description">
              <p>
                <InlineIcon icon="mdi-tray-full" class="mr-2"></InlineIcon>
                <b>Queue:&nbsp;</b>
                <span v-show="queueStore.selectedQueue.length">
                  {{
                    queueStore.selectedQueue.length > 1
                      ? `${queueStore.selectedQueue.length} publications`
                      : '1 publication'
                  }}
                  to be selected</span
                ><span v-show="queueStore.selectedQueue.length && queueStore.excludedQueue.length">
                  and </span
                ><span v-show="queueStore.excludedQueue.length">
                  {{
                    queueStore.excludedQueue.length > 1
                      ? `${queueStore.excludedQueue.length} publications`
                      : '1 publication'
                  }}
                  to be excluded</span
                >.
              </p>
            </div>
            <div class="d-flex align-center ga-1 flex-shrink-0">
              <CompactButton
                icon="mdi-pencil"
                v-tippy="'Edit publications in queue.'"
                @click="openQueueModal"
              ></CompactButton>
              <CompactButton
                icon="mdi-undo"
                v-tippy="'Remove all publications from queue again.'"
                @click="queueStore.clear()"
              ></CompactButton>
              <v-btn
                class="has-background-primary has-text-white"
                v-tippy="
                  'Update suggested and excluded publications with queue and compute new suggestions.'
                "
                @click="updateQueued"
                prepend-icon="mdi-update"
                size="small"
              >
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
              <v-btn
                class="has-background-primary-95"
                @click.stop="openSearchModal()"
              >
                <v-icon left class="mr-2">mdi-magnify</v-icon>
                Search/add</v-btn
              >
            </div>
            <div class="column is-narrow py-1">
              <v-btn class="has-background-primary-95" @click.stop="importSessionWithConfirmation">
                <v-icon left class="mr-2">mdi-import</v-icon>
                Import session
              </v-btn>
            </div>
            <div class="column is-narrow py-1">
              <v-btn class="has-background-primary-95" @click.stop="importBibtexWithConfirmation">
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
    <PublicationListComponent
      ref="publicationList"
      :publications="sessionStore.selectedPublicationsFiltered"
      show-section-headers
      publication-type="selected"
    />
  </div>
</template>

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

.header > div {
  padding: 0;
}

.queue-panel {
  background: linear-gradient(
    135deg,
    var(--bulma-primary-95) 0%,
    var(--bulma-primary-90) 100%
  ) !important;
  border-left: 3px solid var(--bulma-primary) !important;
  border-bottom: 2px solid var(--bulma-primary) !important;
  margin: 0 !important;
  padding: 0.375rem 0.75rem !important;

  & p {
    margin: 0;
  }
}
</style>
