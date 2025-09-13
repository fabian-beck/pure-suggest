<template>
  <div class="suggested-publications box has-background-info">
    <div class="level box-header">
      <div class="level-left has-text-white">
        <div class="level-item"
          v-tippy="`The <b>suggested publications</b> based on references to and from the selected publications, sorted by score.`">
          <v-icon class="has-text-white">mdi-water-plus-outline</v-icon>
          <h2 class="is-size-5 ml-2">Suggested</h2>
        </div>
      </div>
      <div class="level-right has-text-white" v-if="sessionStore.suggestion">
        <div class="level-item">
          <tippy>
            <div class="mr-2">
              <v-badge :content="sessionStore.unreadSuggestionsCount" color="black" class="mr-5" offset-y="-4"
                offset-x="-9" :value="sessionStore.unreadSuggestionsCount > 0" transition="scale-rotate-transition">
                <b>{{ sessionStore.suggestedPublicationsFiltered.length }}</b>
              </v-badge>
              <span> of
                <b>
                  {{
                    sessionStore.suggestion.totalSuggestions.toLocaleString("en")
                  }}
                </b></span>
            </div>
            <template #content>
              <b>{{ sessionStore.suggestedPublicationsFiltered.length }}</b>
              suggested publication{{
                sessionStore.suggestedPublicationsFiltered.length > 1 ? "s" : ""
              }}
              <span v-if="sessionStore.unreadSuggestionsCount > 0">
                <b>({{ sessionStore.unreadSuggestionsCount }}</b> of them
                unread)
              </span>
              of in total
              <b>
                {{
                  sessionStore.suggestion.totalSuggestions.toLocaleString("en")
                }}</b>
              cited/citing publication{{
                sessionStore.suggestion.totalSuggestions > 1 ? "s" : ""
              }}.
            </template>
          </tippy>
          <v-menu :close-on-content-click="false" v-model="isSettingsMenuOpen" @update:model-value="onMenuToggle">
            <template v-slot:activator="{ props }">
              <CompactButton icon="mdi-cog has-text-white" class="ml-2"
                v-tippy="'Suggestions settings - Set the number of publications to load.'" v-bind="props"></CompactButton>
            </template>
            <v-list>
              <v-list-item prepend-icon="mdi-water-plus-outline">
                <v-list-item-title>Number of <b>suggested</b> shown: <b>{{ localMaxSuggestions }}</b></v-list-item-title>
                <v-slider 
                  v-model="localMaxSuggestions" 
                  :min="20" 
                  :max="400" 
                  :step="10" />
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>
    </div>
    <PublicationListComponent ref="publicationList" :publications="sessionStore.suggestedPublicationsFiltered" :showSectionHeaders="true" publicationType="suggested" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSessionStore } from "@/stores/session.js"
import { useInterfaceStore } from "@/stores/interface.js"
import { useAppState } from "@/composables/useAppState.js"

defineProps({
  title: String,
})

const sessionStore = useSessionStore()
const interfaceStore = useInterfaceStore()
const { updateSuggestions } = useAppState()

const publicationList = ref(null)
const isSettingsMenuOpen = ref(false)

// Local variable to track slider value without immediately applying it
const localMaxSuggestions = ref(sessionStore.maxSuggestions)

// Update local value when store value changes (e.g., from other sources)
computed(() => {
  if (!isSettingsMenuOpen.value) {
    localMaxSuggestions.value = sessionStore.maxSuggestions
  }
})

// Handle menu open/close
const onMenuToggle = async (isOpen) => {
  if (!isOpen && localMaxSuggestions.value !== sessionStore.maxSuggestions) {
    // Menu is closing and value has changed - apply the change
    await updateMaxSuggestions(localMaxSuggestions.value)
  } else if (isOpen) {
    // Menu is opening - sync local value with current store value
    localMaxSuggestions.value = sessionStore.maxSuggestions
  }
}

// Update max suggestions when menu closes with new value
const updateMaxSuggestions = async (newValue) => {
  if (newValue !== sessionStore.maxSuggestions) {
    // Block interface while loading to prevent inconsistent states
    interfaceStore.startLoading()
    interfaceStore.loadingMessage = `Updating suggestions to show ${newValue} publications...`
    
    try {
      // Only update if we have selected publications to work with
      if (sessionStore.selectedPublicationsCount > 0) {
        await updateSuggestions(newValue)
      } else {
        // If no publications selected, just update the max value
        sessionStore.maxSuggestions = newValue
        interfaceStore.endLoading()
      }
    } catch (error) {
      console.error('Error updating suggestions:', error)
      interfaceStore.endLoading()
      interfaceStore.showErrorMessage('Failed to update suggestions. Please try again.')
    }
  }
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

// Fix for slider thumb being cut off when at minimum and maximum values
:deep(.v-list-item .v-slider) {
  padding-left: 16px;
  padding-right: 16px;
}
</style>