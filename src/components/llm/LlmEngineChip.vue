<script setup>
import { computed } from 'vue'

import { useLlmStore } from '@/stores/llm.js'

const llmStore = useLlmStore()

const isRemote = computed(() => llmStore.location === 'remote')
const speed = computed(() => llmStore.measuredSpeed(llmStore.modelId))
const tooltip = computed(() =>
  isRemote.value
    ? `Session data is sent to ${llmStore.backendName} for processing.`
    : 'The model runs on this device; session data does not leave it.'
)
</script>

<template>
  <v-chip label v-tippy="tooltip">
    <v-icon start :color="isRemote ? 'warning' : 'success'">
      {{ isRemote ? 'mdi-cloud-upload-outline' : 'mdi-laptop' }}
    </v-icon>
    <b class="mr-1">{{ isRemote ? 'Cloud' : 'On this device' }}</b>
    · {{ llmStore.backendName }}
    <template v-if="llmStore.modelId"> · {{ llmStore.activeModel.name }}</template>
    <template v-if="speed"> · {{ speed }} tokens/s</template>
  </v-chip>
</template>
