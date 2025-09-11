<template>
  <div class="suggested-publications box has-background-info">
    <div class="level box-header">
      <div class="level-left has-text-white">
        <div
          class="level-item"
          v-tippy="
            `The <b>suggested publications</b> based on references to and from the selected publications, sorted by score.`
          "
        >
          <v-icon class="has-text-white">mdi-water-plus-outline</v-icon>
          <h2 class="is-size-5 ml-2">Suggested</h2>
        </div>
      </div>
      <div class="level-right has-text-white" v-if="sessionStore.suggestion">
        <div class="level-item">
          <tippy>
            <div class="mr-2">
              <v-badge
                :content="sessionStore.unreadSuggestionsCount"
                color="black"
                class="mr-5"
                offset-y="-4"
                offset-x="-9"
                :value="sessionStore.unreadSuggestionsCount > 0"
                transition="scale-rotate-transition"
              >
                <b>{{ sessionStore.suggestedPublicationsFiltered.length }}</b>
              </v-badge>
              <span>
                of
                <b>
                  {{ sessionStore.suggestion.totalSuggestions.toLocaleString('en') }}
                </b></span
              >
            </div>
            <template #content>
              <b>{{ sessionStore.suggestedPublicationsFiltered.length }}</b>
              suggested publication{{
                sessionStore.suggestedPublicationsFiltered.length > 1 ? 's' : ''
              }}
              <span v-if="sessionStore.unreadSuggestionsCount > 0">
                <b>({{ sessionStore.unreadSuggestionsCount }}</b> of them unread)
              </span>
              of in total
              <b> {{ sessionStore.suggestion.totalSuggestions.toLocaleString('en') }}</b>
              cited/citing publication{{ sessionStore.suggestion.totalSuggestions > 1 ? 's' : '' }}.
            </template>
          </tippy>
          <CompactButton
            icon="mdi-playlist-plus has-text-white"
            class="ml-2"
            v-tippy="'Load more suggested publications.'"
            @click="loadMoreSuggestions()"
            :disabled="
              sessionStore.suggestedPublications.length === sessionStore.suggestion.totalSuggestions
            "
          ></CompactButton>
        </div>
      </div>
    </div>
    <PublicationListComponent
      ref="publicationList"
      :publications="sessionStore.suggestedPublicationsFiltered"
      :show-section-headers="true"
      publication-type="suggested"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session.js'
import { useAppState } from '@/composables/useAppState.js'

defineProps({
  title: String
})

const sessionStore = useSessionStore()
const { loadMoreSuggestions } = useAppState()

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

<style lang="scss" scoped>
.box {
  display: grid;
  grid-template-rows: max-content auto;
  position: relative;

  & .notification {
    margin-bottom: 0;
    border-radius: 0;
  }

  & .publication-list {
    @include scrollable-list;
  }
}
</style>
