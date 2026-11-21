<script setup>
import { computed, ref, watch } from 'vue'

import { BROWSER_MODELS } from '@/llm/catalog.ts'
import { NATIVE_SERVER_NAMES } from '@/llm/native.ts'
import { useLlmStore } from '@/stores/llm.js'
import { useModalStore } from '@/stores/modal.js'

const MODES = [
  {
    value: 'browser',
    title: 'Local — Browser',
    icon: 'mdi-web',
    description: 'No installation; models are downloaded once and kept in this browser.'
  },
  {
    value: 'native',
    title: 'Local — Native',
    icon: 'mdi-desktop-tower',
    description: 'Connect to Ollama or LM Studio for better performance on desktop computers.'
  },
  {
    value: 'cloud',
    title: 'Cloud',
    icon: 'mdi-cloud-outline',
    description: 'Use more capable models with your own API key; data leaves this device.'
  }
]

const llmStore = useLlmStore()
const modalStore = useModalStore()

const test = ref(null)
let testController = null

const recommendationText = computed(() => {
  const recommendation = llmStore.recommendation
  if (!recommendation) return ''
  if (recommendation.mode === 'native') {
    const server = llmStore.servers.find((server) => server.baseUrl === recommendation.baseUrl)
    return `Local — Native · ${NATIVE_SERVER_NAMES[server.kind]} · ${recommendation.modelId}`
  }
  const model = BROWSER_MODELS.find((model) => model.id === recommendation.modelId)
  return `Local — Browser · ${model.name}`
})

const isRecommendationApplied = computed(() => {
  const recommendation = llmStore.recommendation
  return (
    recommendation?.mode === llmStore.settings.mode &&
    recommendation.modelId === llmStore.modelId &&
    (recommendation.mode !== 'native' || recommendation.baseUrl === llmStore.settings.nativeBaseUrl)
  )
})

const limitations = computed(() => {
  const { structuredOutput, toolCalling } = llmStore.activeModel.capabilities
  const notes = []
  if (structuredOutput === 'none') {
    notes.push('answers are not guaranteed to follow the requested format, so a request can fail')
  }
  if (toolCalling === false) notes.push('no tool use')
  return notes.join('; ')
})

function setMode(mode) {
  llmStore.settings.mode = mode
  test.value = null
  if (mode === 'native' && !llmStore.servers.length) llmStore.detectServers()
  else llmStore.refreshModels()
}

function applyRecommendation() {
  llmStore.applyRecommendation()
  llmStore.refreshModels()
}

async function runTest() {
  testController = new AbortController()
  test.value = { isRunning: true, status: 'Starting…', answer: '' }
  try {
    const result = await llmStore.generate(
      {
        messages: [
          { role: 'user', content: 'Explain in two sentences what a literature survey is.' }
        ],
        maxOutputTokens: 200,
        signal: testController.signal
      },
      (status) => {
        if (status.phase === 'generate') test.value.status = 'Answering…'
        else test.value.status = status.phase === 'download' ? 'Downloading model…' : 'Loading model…'
      }
    )
    test.value = { answer: result.text.trim(), tokensPerSecond: result.tokensPerSecond }
  } catch (error) {
    test.value = error.code === 'aborted' ? null : { error: error.message }
  }
}

watch(
  () => modalStore.isLlmSettingsModalDialogShown,
  (isShown) => {
    if (isShown) {
      test.value = null
      llmStore.refreshModels()
    } else testController?.abort()
  }
)
</script>

<template>
  <ModalDialog
    v-model="modalStore.isLlmSettingsModalDialogShown"
    title="AI model"
    icon="mdi-robot-outline"
    header-color="info"
  >
    <div class="content">
      <p>
        AI features run on a language model of your choice. Models running on this device keep
        your data private; cloud models are only used if you choose them.
      </p>

      <v-alert
        v-if="llmStore.recommendation && !isRecommendationApplied"
        density="compact"
        class="mb-3"
        icon="mdi-lightbulb-outline"
      >
        <div class="d-flex flex-wrap align-center ga-2">
          <span>
            Suggested for this device: <b>{{ recommendationText }}</b
            >. {{ llmStore.recommendation.reason }}
          </span>
          <v-btn size="small" class="ml-auto" @click="applyRecommendation">Use</v-btn>
        </div>
      </v-alert>

      <div class="modes mb-4" role="radiogroup" aria-label="Where the model runs">
        <button
          v-for="mode in MODES"
          :key="mode.value"
          type="button"
          class="mode"
          :class="{
            'is-chosen': mode.value === llmStore.settings.mode,
            'dialog-initial-focus': mode.value === (llmStore.settings.mode ?? 'browser')
          }"
          role="radio"
          :aria-checked="mode.value === llmStore.settings.mode"
          @click="setMode(mode.value)"
        >
          <span class="mode-title"><v-icon size="small">{{ mode.icon }}</v-icon> {{ mode.title }}</span>
          <span class="is-size-7">{{ mode.description }}</span>
        </button>
      </div>

      <LlmBrowserSettings v-if="llmStore.settings.mode === 'browser'" />
      <LlmNativeSettings v-else-if="llmStore.settings.mode === 'native'" />
      <LlmCloudSettings v-else-if="llmStore.settings.mode === 'cloud'" />

      <template v-if="llmStore.settings.mode">
        <v-expansion-panels class="mt-3" variant="accordion">
          <v-expansion-panel title="Generation settings">
            <v-expansion-panel-text>
              <v-text-field
                :model-value="llmStore.settings.temperature"
                label="Temperature (empty: default of the model)"
                type="number"
                min="0"
                max="2"
                step="0.1"
                density="compact"
                hide-details
                class="mb-3"
                @update:model-value="
                  (value) => (llmStore.settings.temperature = value === '' ? null : Number(value))
                "
              />
              <v-text-field
                :model-value="llmStore.settings.contextWindow"
                label="Context window in tokens (empty: automatic)"
                type="number"
                min="1024"
                step="1024"
                density="compact"
                hide-details
                @update:model-value="
                  (value) => (llmStore.settings.contextWindow = Number(value) || null)
                "
              />
              <p class="is-size-7 mt-1">
                Currently {{ llmStore.contextWindow.toLocaleString('en') }} tokens. A larger
                window lets the model consider more publications but needs more memory and time.
              </p>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <div class="summary mt-4">
          <div class="d-flex flex-wrap align-center ga-2">
            <LlmEngineChip />
            <v-btn
              v-if="!test?.isRunning"
              size="small"
              prepend-icon="mdi-play"
              :disabled="Boolean(llmStore.setupIssue)"
              v-tippy="'Sends a short question to the model and measures its speed on this device.'"
              @click="runTest"
            >
              Test
            </v-btn>
            <v-btn v-else size="small" @click="testController.abort()">Cancel test</v-btn>
            <v-btn
              class="ml-auto"
              size="small"
              @click="modalStore.isLlmSettingsModalDialogShown = false"
            >
              Done
            </v-btn>
          </div>
          <p v-if="llmStore.setupIssue" class="is-size-7 mt-2">
            <v-icon size="small" color="warning">mdi-alert-outline</v-icon>
            {{ llmStore.setupIssue }}
          </p>
          <p v-else-if="limitations" class="is-size-7 mt-2">
            Limitations of this model: {{ limitations }}.
          </p>
          <div v-if="test" class="is-size-7 mt-2" role="status">
            <span v-if="test.isRunning">{{ test.status }}</span>
            <span v-else-if="test.error" class="has-text-danger">{{ test.error }}</span>
            <template v-else>
              <i>{{ test.answer }}</i>
              <span v-if="test.tokensPerSecond">
                ({{ test.tokensPerSecond.toFixed(1) }} tokens per second)
              </span>
            </template>
          </div>
        </div>
      </template>
    </div>
  </ModalDialog>
</template>

<style scoped lang="scss">
.modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;

  @media screen and (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.mode {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  background-color: white;
  border: 2px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;

  &:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }

  &.is-chosen {
    border-color: var(--bulma-info);
    background-color: var(--bulma-info-95);
  }

  & .mode-title {
    font-weight: 600;
  }
}

.summary {
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
