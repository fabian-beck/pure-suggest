<script>
import { watch, reactive } from 'vue'

import { useAppState } from '@/composables/useAppState.js'
import Publication from '@/core/Publication.js'
import { handlePublicationKey } from '@/lib/Keys.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'


export default {
  setup() {
    const modalStore = useModalStore()
    const sessionStore = useSessionStore()
    const { updateSuggestions, queueForSelected } = useAppState()

    const excludedPublications = reactive([])

    const updateExcludedPublications = () => {
      excludedPublications.splice(0, excludedPublications.length)
      sessionStore.excludedPublicationsDois.forEach((doi) => {
        excludedPublications.push(new Publication(doi))
      })
      // async bulk fetch publication data (Important note: as this is async, it needs to work on the publications after pushing them to the array; otherwise, the updates will not be noted)
      Publication.fetchAll(excludedPublications)
    }

    watch(
      () => modalStore.isExcludedModalDialogShown,
      (newValue) => {
        if (newValue) {
          updateExcludedPublications()
        }
      }
    )

    return {
      modalStore,
      sessionStore,
      excludedPublications,
      updateExcludedPublications,
      updateSuggestions,
      queueForSelected
    }
  },
  methods: {
    onDialogKey(event, index) {
      const publication = this.excludedPublications[index]
      if (!publication) return
      if (event.key === '+') {
        event.preventDefault()
        this.removeFromExcludedAndAddToSelected(publication)
      } else if (['Delete', 'Backspace'].includes(event.key)) {
        event.preventDefault()
        this.removeFromExcluded(publication)
      } else {
        handlePublicationKey(event, publication)
      }
    },
    removeFromExcluded(publication) {
      this.sessionStore.removeFromExcludedPublication(publication.doi)
      this.updateSuggestions()
      this.updateExcludedPublications()
    },
    removeFromExcludedAndAddToSelected(publication) {
      this.queueForSelected(publication.doi)
      this.removeFromExcluded(publication)
    }
  }
}
</script>

<template>
  <ModalDialog
    header-color="primary"
    title="Excluded publications"
    icon="mdi-minus-thick"
    v-model="modalStore.isExcludedModalDialogShown"
    @dialog-key="onDialogKey"
  >
    <template #sticky>
      <v-sheet class="has-background-primary-95 pa-2">
        <p class="comment" v-if="excludedPublications.length > 0">
          These publications will not be suggested again unless you remove them from this list.
          Alternatively, you can directly mark them to be selected.
        </p>
        <p class="comment" v-else>No publications currently excluded; you may close this dialog.</p>
      </v-sheet>
    </template>
    <div class="content">
      <section>
        <ul class="publication-list">
          <li
            class="publication-component media dialog-item"
            tabindex="0"
            v-for="publication in excludedPublications"
            :key="publication.doi"
          >
            <div class="media-content">
              <PublicationDescription :publication="publication" always-show-details>
              </PublicationDescription>
            </div>
            <div class="media-right">
              <CompactButton
                icon="mdi-undo"
                v-tippy="'Remove publication from list of excluded publications again.'"
                @click="removeFromExcluded(publication)"
              ></CompactButton>
              <CompactButton
                icon="mdi-plus-thick"
                v-tippy="'Mark publication to be added to selected publications.'"
                @click="removeFromExcludedAndAddToSelected(publication)"
                class="has-text-primary"
              >
              </CompactButton>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </ModalDialog>
</template>

<style scoped lang="scss">
@include comment;
</style>
