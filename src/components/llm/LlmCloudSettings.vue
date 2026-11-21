<script setup>
import { computed } from 'vue'

import { CLOUD_SERVICES } from '@/llm/catalog.ts'
import { useLlmStore } from '@/stores/llm.js'

const llmStore = useLlmStore()

const service = computed(() => llmStore.cloudService)
const modelItems = computed(() =>
  llmStore.models.map((model) => ({ title: model.name, value: model.id }))
)

const apiKey = computed({
  get: () => llmStore.apiKeys[service.value.id] ?? '',
  set: (key) => (llmStore.apiKeys[service.value.id] = key.trim())
})

function setService(serviceId) {
  llmStore.settings.cloudServiceId = serviceId
  llmStore.refreshModels()
}
</script>

<template>
  <div>
    <v-alert type="warning" density="compact" class="mb-3" icon="mdi-cloud-upload-outline">
      Cloud models run on the provider’s servers: titles, abstracts, and keywords of your session
      are sent to {{ service.name }} and billed to your API key. Nothing is sent before you ask
      for an AI feature.
    </v-alert>

    <v-select
      :model-value="service.id"
      :items="CLOUD_SERVICES"
      item-title="name"
      item-value="id"
      label="Service"
      density="compact"
      hide-details
      class="mb-3"
      @update:model-value="setService"
    />

    <v-text-field
      v-if="!service.baseUrl"
      v-model="llmStore.settings.cloudCustomBaseUrl"
      label="Address of the OpenAI-compatible API"
      placeholder="https://…/v1"
      density="compact"
      hide-details
      class="mb-3"
      @change="llmStore.refreshModels()"
    />

    <v-text-field
      v-model="apiKey"
      :label="`${service.name} API key`"
      type="password"
      autocomplete="off"
      density="compact"
      hide-details
      @change="llmStore.refreshModels()"
    />
    <p class="is-size-7 mt-1 mb-2">
      <a v-if="service.keyUrl" :href="service.keyUrl" target="_blank" rel="noopener"
        >Create a key</a
      >
      The key is only sent to {{ service.name }}.
    </p>
    <v-checkbox
      v-model="llmStore.settings.rememberApiKeys"
      density="compact"
      hide-details
      label="Remember keys in this browser"
    />
    <p class="is-size-7 mb-3">
      Otherwise, keys are forgotten when you close the page. Remembered keys are stored
      unencrypted in this browser and are readable for anyone using it; prefer a key with a
      spending limit.
    </p>

    <v-combobox
      v-model="llmStore.modelId"
      :items="modelItems"
      :return-object="false"
      :loading="llmStore.isLoadingModels"
      label="Model"
      density="compact"
      hide-details
      class="mb-1"
    />
    <p v-if="llmStore.modelsError" class="is-size-7 has-text-danger" role="alert">
      {{ llmStore.modelsError }}
    </p>

    <v-checkbox
      v-model="llmStore.hasRemoteConsent"
      density="compact"
      hide-details
      class="mt-2"
      :label="`Allow sending session data to ${service.name} when I use AI features.`"
    />
  </div>
</template>
