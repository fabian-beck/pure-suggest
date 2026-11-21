<script setup>
import { computed, ref } from 'vue'

import { formatBytes } from '@/lib/Util.js'
import { BROWSER_MODELS } from '@/llm/catalog.ts'
import { useInterfaceStore } from '@/stores/interface.js'
import { useLlmStore } from '@/stores/llm.js'

const llmStore = useLlmStore()
const interfaceStore = useInterfaceStore()

const BACKEND_OPTIONS = [
  { title: 'Automatic', value: 'auto' },
  { title: 'Graphics card (WebGPU)', value: 'webgpu' },
  { title: 'Processor (WebAssembly)', value: 'wasm' }
]

const customModelId = ref('')
const loadProgress = ref(null)
let loadController = null

const catalogEntry = computed(() =>
  BROWSER_MODELS.find((model) => model.id === llmStore.modelId)
)

const loadProgressText = computed(() => {
  const { phase, loadedBytes, totalBytes } = loadProgress.value
  if (phase === 'download' && totalBytes) {
    return `Downloading ${formatBytes(loadedBytes)} of ${formatBytes(totalBytes)}`
  }
  return 'Loading model into memory'
})

function setBackend(backend) {
  llmStore.settings.browserBackend = backend
  llmStore.refreshModels()
}

function addCustomModel() {
  const id = customModelId.value.trim()
  if (!id) return
  if (!llmStore.settings.customBrowserModelIds.includes(id)) {
    llmStore.settings.customBrowserModelIds.push(id)
  }
  llmStore.settings.browserModelId = id
  customModelId.value = ''
  llmStore.refreshModels()
}

async function loadModel() {
  loadController = new AbortController()
  loadProgress.value = { phase: 'load' }
  try {
    await llmStore.prepareModel((progress) => (loadProgress.value = progress), loadController.signal)
    await llmStore.refreshModels()
  } catch (error) {
    if (error.code !== 'aborted') interfaceStore.showErrorMessage(error.message)
  } finally {
    loadProgress.value = null
  }
}
</script>

<template>
  <div>
    <p v-if="llmStore.device" class="mb-3">
      <template v-if="llmStore.device.hasWebGpu">
        <v-icon size="small" color="success">mdi-check-circle-outline</v-icon>
        Graphics acceleration (WebGPU) is available<span v-if="llmStore.device.gpuDescription">
          ({{ llmStore.device.gpuDescription }})</span
        >.
      </template>
      <template v-else>
        <v-icon size="small" color="warning">mdi-alert-outline</v-icon>
        This browser offers no graphics acceleration (WebGPU). Models run on the processor, which
        is slow; a local server or a current version of Chrome, Edge, or Firefox works better.
      </template>
    </p>

    <LlmModelList is-downloadable />

    <div v-if="llmStore.modelId" class="mt-3">
      <p v-if="catalogEntry?.note" class="is-size-7 mb-2">{{ catalogEntry.note }}</p>
      <p v-if="catalogEntry && !catalogEntry.isVerified" class="is-size-7 mb-2">
        <v-icon size="small" color="warning">mdi-alert-outline</v-icon>
        This model has not been tested with PUREsuggest yet and might fail to load.
      </p>
      <div v-if="loadProgress" role="status">
        <div class="d-flex align-center ga-2">
          <span class="is-size-7">{{ loadProgressText }}</span>
          <v-btn size="small" variant="text" @click="loadController.abort()">Cancel</v-btn>
        </div>
        <v-progress-linear
          :model-value="(100 * loadProgress.loadedBytes) / loadProgress.totalBytes"
          :indeterminate="loadProgress.phase === 'load' || !loadProgress.totalBytes"
        />
      </div>
      <div v-else class="d-flex flex-wrap ga-2">
        <v-btn size="small" prepend-icon="mdi-download" @click="loadModel">
          {{ llmStore.activeModel.isAvailable ? 'Load model' : 'Download and load model' }}
        </v-btn>
        <v-btn
          v-if="llmStore.activeModel.isAvailable"
          size="small"
          variant="text"
          prepend-icon="mdi-delete-outline"
          @click="llmStore.removeModel(llmStore.modelId)"
        >
          Delete download
        </v-btn>
      </div>
      <p class="is-size-7 mt-2">
        Models are downloaded from Hugging Face once and then kept in this browser, also for
        offline use. Your session data is processed on this device only.
      </p>
    </div>

    <v-expansion-panels class="mt-3" variant="accordion">
      <v-expansion-panel title="Other model or processing unit">
        <v-expansion-panel-text>
          <v-text-field
            v-model="customModelId"
            label="Hugging Face model with ONNX weights"
            placeholder="onnx-community/…"
            density="compact"
            hide-details
            class="mb-3"
            @keydown.enter="addCustomModel"
          >
            <template #append-inner>
              <v-btn size="small" variant="text" @click="addCustomModel">Add</v-btn>
            </template>
          </v-text-field>
          <v-select
            :model-value="llmStore.settings.browserBackend"
            :items="BACKEND_OPTIONS"
            label="Run models on"
            density="compact"
            hide-details
            @update:model-value="setBackend"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>
