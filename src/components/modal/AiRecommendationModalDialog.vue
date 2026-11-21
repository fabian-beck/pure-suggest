<script setup>
import { computed, ref, watch } from 'vue'

import { useAiRecommendations } from '@/composables/useAiRecommendations.js'
import { useModalManager } from '@/composables/useModalManager.js'
import { useLlmStore } from '@/stores/llm.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'

const MAX_EXPECTED_PAPERS = 50

const sessionStore = useSessionStore()
const modalStore = useModalStore()
const llmStore = useLlmStore()
const { openLlmSettingsModal } = useModalManager()
const { requestAiRecommendations } = useAiRecommendations()

const steeringComment = ref('')

const expectedPapers = computed(() => {
  const [minCount, maxCount] = sessionStore.aiRecommendationRange
  return minCount === maxCount ? `${maxCount}` : `${minCount}–${maxCount}`
})

watch(
  () => modalStore.isAiRecommendationModalDialogShown,
  (isShown) => {
    if (isShown) steeringComment.value = sessionStore.aiRecommendationComment
  }
)

function start() {
  if (llmStore.setupIssue) return
  sessionStore.aiRecommendationComment = steeringComment.value.trim()
  modalStore.isAiRecommendationModalDialogShown = false
  requestAiRecommendations()
}
</script>

<template>
  <ModalDialog
    v-model="modalStore.isAiRecommendationModalDialogShown"
    title="AI recommendations"
    icon="mdi-robot-outline"
    header-color="info"
  >
    <div class="content">
      <p v-if="sessionStore.isAiAutoSelect">
        An AI model reads the currently suggested publications together with your selected
        publications and keywords, and adds the most useful ones to your selection. It proceeds
        in steps: after each step, the suggestions are recomputed from the extended selection,
        so that later picks build on earlier ones.
      </p>
      <p v-else>
        An AI model reads the
        <b>{{ sessionStore.suggestedPublicationsFiltered.length }}</b> currently suggested
        publications together with your selected publications and keywords, and tags the most
        useful suggestions.
      </p>

      <div class="d-flex flex-wrap align-center ga-2 mb-2">
        <LlmEngineChip v-if="llmStore.settings.mode" />
        <v-btn
          size="small"
          prepend-icon="mdi-cog"
          :class="{ 'dialog-initial-focus': llmStore.setupIssue }"
          @click="openLlmSettingsModal()"
        >
          {{ llmStore.settings.mode ? 'Change model' : 'Choose model' }}
        </v-btn>
      </div>
      <p v-if="llmStore.setupIssue" class="is-size-7">
        <v-icon size="small" color="warning">mdi-alert-outline</v-icon>
        {{ llmStore.setupIssue }}
      </p>

      <div class="mt-4" id="ai-expected-papers">
        Expected number of papers to {{ sessionStore.isAiAutoSelect ? 'select' : 'recommend' }}:
        <b>{{ expectedPapers }}</b>
      </div>
      <v-range-slider
        v-model="sessionStore.aiRecommendationRange"
        :min="1"
        :max="MAX_EXPECTED_PAPERS"
        :step="1"
        density="compact"
        hide-details
        aria-labelledby="ai-expected-papers"
      />
      <p class="is-size-7">
        The model may return fewer papers if few suggestions fit, but never more.
      </p>

      <v-checkbox
        v-model="sessionStore.isAiAutoSelect"
        density="compact"
        hide-details
        class="mt-2"
        label="Auto-select: add the recommended papers to the selection"
      />

      <v-text-field
        v-model="steeringComment"
        label="Optional: what the recommendations should focus on"
        placeholder="e.g., prefer recent survey papers"
        density="compact"
        hide-details
        class="mt-4 mb-4"
        @keydown.enter="start"
      />

      <div class="d-flex justify-end">
        <v-btn
          class="has-background-info has-text-white"
          :class="{ 'dialog-initial-focus': !llmStore.setupIssue }"
          prepend-icon="mdi-robot-outline"
          :disabled="Boolean(llmStore.setupIssue)"
          @click="start"
        >
          {{ sessionStore.isAiAutoSelect ? 'Auto-select' : 'Recommend' }}
        </v-btn>
      </div>
    </div>
  </ModalDialog>
</template>
