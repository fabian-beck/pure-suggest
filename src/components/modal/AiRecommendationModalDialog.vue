<script setup>
import { ref, watch } from 'vue'

import { useModalManager } from '@/composables/useModalManager.js'
import { formatBytes } from '@/lib/Util.js'
import {
  buildRecommendationRequest,
  parseRecommendations
} from '@/services/AiRecommendationService.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useLlmStore } from '@/stores/llm.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'

const sessionStore = useSessionStore()
const interfaceStore = useInterfaceStore()
const modalStore = useModalStore()
const llmStore = useLlmStore()
const { openLlmSettingsModal } = useModalManager()

const steeringComment = ref('')

watch(
  () => modalStore.isAiRecommendationModalDialogShown,
  (isShown) => {
    if (isShown) steeringComment.value = sessionStore.aiRecommendationComment
  }
)

function describeStatus(status) {
  const engine = `${llmStore.activeModel.name} (${llmStore.location === 'remote' ? 'cloud' : 'on this device'})`
  if (status.phase === 'download' && status.totalBytes) {
    return `Downloading ${llmStore.activeModel.name}: ${formatBytes(status.loadedBytes)} of ${formatBytes(status.totalBytes)}...`
  }
  if (status.phase === 'generate') return `${engine} is writing recommendations...`
  return `Loading ${llmStore.activeModel.name}...`
}

async function requestRecommendations() {
  if (llmStore.setupIssue) return
  sessionStore.aiRecommendationComment = steeringComment.value.trim()
  modalStore.isAiRecommendationModalDialogShown = false

  interfaceStore.startLoading()
  interfaceStore.setLoadingCancelable(true)
  interfaceStore.loadingMessage = `Asking ${llmStore.activeModel.name} for recommendations...`
  const controller = new AbortController()
  interfaceStore.loadingCancelToken.promise.then(() => controller.abort())

  try {
    // The context window of the model determines how much of the session fits the request
    if (!llmStore.models.length) await llmStore.refreshModels()
    const suggestedPublications = sessionStore.suggestedPublicationsFiltered
    const { candidates, ...request } = buildRecommendationRequest(
      {
        selectedPublications: sessionStore.selectedPublications,
        suggestedPublications,
        boostKeywordString: sessionStore.boostKeywordString,
        keywords: sessionStore.uniqueBoostKeywords,
        steeringComment: sessionStore.aiRecommendationComment
      },
      llmStore.usableContextWindow
    )
    const result = await llmStore.generate({ ...request, signal: controller.signal }, (status) => {
      interfaceStore.loadingMessage = describeStatus(status)
    })
    sessionStore.applyAiRecommendations(parseRecommendations(result.text, candidates))
    if (candidates.length < suggestedPublications.length) {
      interfaceStore.showErrorMessage(
        `Only the top ${candidates.length} of ${suggestedPublications.length} suggestions fit the context window of the model and were considered.`
      )
    }
  } catch (error) {
    if (error.code !== 'aborted') {
      console.error('Error requesting AI recommendations:', error)
      interfaceStore.showErrorMessage(error.message || 'Failed to get AI recommendations.')
    }
  } finally {
    interfaceStore.endLoading()
  }
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
      <p>
        An AI model reads the
        <b>{{ sessionStore.suggestedPublicationsFiltered.length }}</b> currently suggested
        publications together with your selected publications and keywords, and tags about 10%
        of the suggestions as particularly useful.
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

      <v-text-field
        v-model="steeringComment"
        label="Optional: what the recommendations should focus on"
        placeholder="e.g., prefer recent survey papers"
        density="compact"
        hide-details
        class="mt-4 mb-4"
        @keydown.enter="requestRecommendations"
      />

      <div class="d-flex justify-end">
        <v-btn
          class="has-background-info has-text-white"
          :class="{ 'dialog-initial-focus': !llmStore.setupIssue }"
          prepend-icon="mdi-robot-outline"
          :disabled="Boolean(llmStore.setupIssue)"
          @click="requestRecommendations"
        >
          Recommend
        </v-btn>
      </div>
    </div>
  </ModalDialog>
</template>
