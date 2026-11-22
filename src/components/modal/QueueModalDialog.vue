<script>
import { watch, reactive } from 'vue'

import { useAppState } from '@/composables/useAppState.js'
import Publication from '@/core/Publication.js'
import { handlePublicationKey } from '@/lib/Keys.js'
import { useModalStore } from '@/stores/modal.js'
import { useQueueStore } from '@/stores/queue.js'


export default {
  setup() {
    const modalStore = useModalStore()
    const queueStore = useQueueStore()
    const { updateQueued } = useAppState()

    const selectedQueue = reactive([])
    const excludedQueue = reactive([])

    function updatePublications() {
      selectedQueue.splice(0, selectedQueue.length)
      excludedQueue.splice(0, excludedQueue.length)
      queueStore.selectedQueue.forEach((doi) => {
        selectedQueue.push(new Publication(doi))
      })
      queueStore.excludedQueue.forEach((doi) => {
        excludedQueue.push(new Publication(doi))
      })
      // async bulk fetch publication data; displays update reactively as chunks load
      Publication.fetchAll(selectedQueue)
      Publication.fetchAll(excludedQueue)
    }

    watch(
      () => modalStore.isQueueModalDialogShown,
      (newValue) => {
        if (newValue) {
          updatePublications()
        }
      }
    )

    return {
      modalStore,
      queueStore,
      selectedQueue,
      excludedQueue,
      updatePublications,
      updateQueued
    }
  },
  methods: {
    clearQueuesAndClose() {
      this.queueStore.clear()
      this.modalStore.isQueueModalDialogShown = false
    },
    updateQueuedAndClose() {
      this.updateQueued()
      this.modalStore.isQueueModalDialogShown = false
    },
    onDialogKey(event, index) {
      if (event.key === 'u' && this.queueStore.isUpdatable) {
        event.preventDefault()
        this.updateQueuedAndClose()
        return
      }
      const publication = [...this.selectedQueue, ...this.excludedQueue][index]
      if (!publication) return
      if (['Delete', 'Backspace'].includes(event.key)) {
        event.preventDefault()
        this.removeFromQueueAndUpdatePublications(publication)
      } else if (handlePublicationKey(event, publication) && ['+', '-'].includes(event.key)) {
        // The publication may have moved to the other queue; keep it focused there
        this.updatePublications()
        this.$nextTick(() =>
          document.querySelector(`.queue-item[data-doi="${CSS.escape(publication.doi)}"]`)?.focus()
        )
      }
    },
    removeFromQueueAndUpdatePublications(publication) {
      this.queueStore.removeFromQueues(publication.doi)
      this.updatePublications()
    }
  }
}
</script>

<template>
  <ModalDialog
    header-color="primary"
    title="Queue"
    icon="mdi-tray-full"
    v-model="modalStore.isQueueModalDialogShown"
    @dialog-key="onDialogKey"
  >
    <template #sticky>
      <v-sheet class="has-background-primary-95 pa-2">
        <p class="comment" v-if="queueStore.isUpdatable">
          These publications are marked to be selected or excluded with the next update.
        </p>
        <p class="comment" v-else>No publications currently in queue; you may close this dialog.</p>
      </v-sheet>
    </template>
    <template #footer>
      <v-card-actions class="has-background-primary-95 level-right">
        <v-btn
          class="has-background-primary-95 has-text-dark mr-2"
          @click="clearQueuesAndClose"
          v-show="queueStore.isUpdatable"
          prepend-icon="mdi-undo"
          >Clear all</v-btn
        >
        <v-btn
          class="has-background-primary has-text-white ml-2"
          @click="updateQueuedAndClose"
          v-show="queueStore.isUpdatable"
          prepend-icon="mdi-update"
          ><span class="key">U</span>pdate</v-btn
        >
      </v-card-actions>
    </template>
    <div class="content">
      <section>
        <div v-show="selectedQueue.length">
          <label
            >Queued for <b>selected</b> <InlineIcon icon="mdi-plus-thick" color="primary-dark"
          /></label>
          <ul class="publication-list">
            <li
              class="publication-component media dialog-item queue-item"
              tabindex="0"
              :data-doi="publication.doi"
              v-for="publication in selectedQueue"
              :key="publication.doi"
            >
              <div class="media-content">
                <PublicationDescription :publication="publication" always-show-details>
                </PublicationDescription>
              </div>
              <div class="media-right">
                <CompactButton
                  icon="mdi-undo"
                  v-tippy="'Remove publication from queue.'"
                  @click="removeFromQueueAndUpdatePublications(publication)"
                ></CompactButton>
              </div>
            </li>
          </ul>
        </div>
        <v-divider v-show="selectedQueue.length && excludedQueue.length"></v-divider>
        <div v-show="excludedQueue.length">
          <label>Queued for <b>excluded</b> <InlineIcon icon="mdi-minus-thick" /></label>
          <ul class="publication-list">
            <li
              class="publication-component media dialog-item queue-item"
              tabindex="0"
              :data-doi="publication.doi"
              v-for="publication in excludedQueue"
              :key="publication.doi"
            >
              <div class="media-content">
                <PublicationDescription :publication="publication" always-show-details>
                </PublicationDescription>
              </div>
              <div class="media-right">
                <CompactButton
                  icon="mdi-undo"
                  v-tippy="'Remove publication from queue.'"
                  @click="removeFromQueueAndUpdatePublications(publication)"
                ></CompactButton>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </ModalDialog>
</template>

<style scoped lang="scss">
@include comment;
</style>
