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
    <span class="engine">
      <b>{{ isRemote ? 'Cloud' : 'On this device' }}</b>
      · {{ llmStore.backendName }}
      <template v-if="llmStore.modelId"> · {{ llmStore.activeModel.name }}</template>
      <template v-if="speed"> · {{ speed }} tokens/s</template>
    </span>
  </v-chip>
</template>

<style scoped lang="scss">
.v-chip {
  max-width: 100%;

  & :deep(.v-chip__content) {
    min-width: 0;
  }

  & .engine {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
