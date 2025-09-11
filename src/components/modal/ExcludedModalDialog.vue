<script>
import { useInterfaceStore } from '@/stores/interface.js'
import { useSessionStore } from '@/stores/session.js'
import { useAppState } from '@/composables/useAppState.js'
import { watch, reactive } from 'vue'
import Publication from '@/core/Publication.js'

export default {
  setup() {
    const interfaceStore = useInterfaceStore()
    const sessionStore = useSessionStore()
    const { updateSuggestions, queueForSelected } = useAppState()

    const excludedPublications = reactive([])

    const updateExcludedPublications = () => {
      excludedPublications.splice(0, excludedPublications.length)
      sessionStore.excludedPublicationsDois.forEach((doi) => {
        excludedPublications.push(new Publication(doi))
      })
      // fetch publication data (Important note: as this is async, it needs to work on the publications after pushing them to the array; otherwise, the updates will not be noted)
      excludedPublications.forEach((publication) => {
        publication.fetchData()
      })
    }

    watch(
      () => interfaceStore.isExcludedModalDialogShown,
      (newValue) => {
        if (newValue) {
          updateExcludedPublications()
        }
      }
    )

    return {
      interfaceStore,
      sessionStore,
      excludedPublications,
      updateExcludedPublications,
      updateSuggestions,
      queueForSelected
    }
  },
  methods: {
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
    v-model="interfaceStore.isExcludedModalDialogShown"
  >
    <template #sticky>
      <v-sheet class="has-background-primary-95 pa-2">
        <p class="comment" v-if="excludedPublications.length > 0">
          These publications will not be suggested again unlike you remove them from this list.
          Alternatively, you can direclty mark them to be selected.
        </p>
        <p class="comment" v-else>No publications currently excluded; you may close this dialog.</p>
      </v-sheet>
    </template>
    <div class="content">
      <section>
        <ul class="publication-list">
          <li
            class="publication-component media"
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
                v-tippy="'Remove proublication from list of excluded publications again.'"
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
