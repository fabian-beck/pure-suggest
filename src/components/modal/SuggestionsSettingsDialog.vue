<template>
  <ModalDialog v-model="interfaceStore.isSuggestionsSettingsDialogShown" title="Suggestions Settings" 
    icon="mdi-cog" headerColor="primary">
    <div class="suggestions-settings-content">
      <h3 class="mb-4">
        <v-icon class="mr-2">mdi-format-list-numbered</v-icon>
        Number of Suggested Publications
      </h3>
      
      <div class="slider-container">
        <div class="slider-info mb-3">
          <div class="d-flex justify-space-between align-center">
            <span class="text-body-2">Currently showing: <strong>{{ sessionStore.maxSuggestions }}</strong> publications</span>
            <span class="text-body-2 text-medium-emphasis">Range: 20 - 400</span>
          </div>
        </div>
        
        <v-slider
          v-model="sliderValue"
          :min="20"
          :max="400"
          :step="10"
          :ticks="tickLabels"
          show-ticks="always"
          tick-size="4"
          thumb-label="always"
          color="primary"
          track-color="grey-lighten-1"
          class="suggestions-slider"
          @update:model-value="updateMaxSuggestions"
        >
          <template v-slot:thumb-label="{ modelValue }">
            {{ modelValue }}
          </template>
        </v-slider>
        
        <div class="slider-labels d-flex justify-space-between text-caption text-medium-emphasis mt-2">
          <span>20</span>
          <span>100</span>
          <span>200</span>
          <span>300</span>
          <span>400</span>
        </div>
      </div>
      
      <div class="settings-info mt-4">
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="text-body-2"
        >
          <template #prepend>
            <v-icon>mdi-information</v-icon>
          </template>
          The system will automatically load additional publications in the background 
          as needed. Higher values may take longer to process initially.
        </v-alert>
      </div>
    </div>
    
    <template #footer>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          text
          @click="interfaceStore.isSuggestionsSettingsDialogShown = false"
        >
          Close
        </v-btn>
      </v-card-actions>
    </template>
  </ModalDialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useAppState } from '@/composables/useAppState.js'
import ModalDialog from './ModalDialog.vue'

const sessionStore = useSessionStore()
const interfaceStore = useInterfaceStore()
const { updateSuggestions } = useAppState()

// Create reactive slider value
const sliderValue = ref(sessionStore.maxSuggestions)

// Watch for changes in sessionStore.maxSuggestions to keep slider in sync
watch(() => sessionStore.maxSuggestions, (newValue) => {
  sliderValue.value = newValue
})

// Create tick labels for the slider
const tickLabels = computed(() => ({
  20: '20',
  100: '100',
  200: '200',
  300: '300',
  400: '400'
}))

// Update max suggestions when slider changes
const updateMaxSuggestions = async (newValue) => {
  if (newValue !== sessionStore.maxSuggestions) {
    // Only update if we have selected publications to work with
    if (sessionStore.selectedPublicationsCount > 0) {
      await updateSuggestions(newValue)
    } else {
      // If no publications selected, just update the max value
      sessionStore.maxSuggestions = newValue
    }
  }
}
</script>

<style scoped lang="scss">
.suggestions-settings-content {
  min-height: 250px;
  
  h3 {
    color: rgb(var(--v-theme-primary));
    font-weight: 600;
  }
}

.slider-container {
  padding: 0 8px;
  
  .suggestions-slider {
    margin: 16px 0;
    
    :deep(.v-slider-thumb__label) {
      background-color: rgb(var(--v-theme-primary));
    }
  }
}

.slider-info {
  background-color: rgb(var(--v-theme-surface-variant));
  padding: 12px;
  border-radius: 4px;
  border-left: 4px solid rgb(var(--v-theme-primary));
}

.settings-info {
  :deep(.v-alert) {
    .v-alert__prepend {
      margin-inline-end: 8px;
    }
  }
}
</style>