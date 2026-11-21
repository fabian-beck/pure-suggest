<script setup>
import { computed, ref } from 'vue'

import { formatBytes } from '@/lib/Util.js'
import { MIN_USABLE_SPEED } from '@/llm/selection.ts'
import { useLlmStore } from '@/stores/llm.js'

const props = defineProps({
  // Whether models need to be downloaded before use (shows the download state)
  isDownloadable: Boolean
})

const llmStore = useLlmStore()
const isShowingOthers = ref(false)

const preferredModels = computed(() => llmStore.models.filter((model) => model.isPreferred))
const otherModels = computed(() => llmStore.models.filter((model) => !model.isPreferred))
const visibleModels = computed(() => {
  // A manually chosen other model stays visible
  const isOtherChosen = otherModels.value.some((model) => model.id === llmStore.modelId)
  return isShowingOthers.value || isOtherChosen || !preferredModels.value.length
    ? llmStore.models
    : preferredModels.value
})

function describe(model) {
  const details = [model.developer, model.parameterSize, model.quantization]
  if (model.sizeBytes) {
    details.push(
      props.isDownloadable && !model.isAvailable
        ? `${formatBytes(model.sizeBytes)} download`
        : formatBytes(model.sizeBytes)
    )
  }
  if (model.memoryBytes) details.push(`needs about ${formatBytes(model.memoryBytes)} of memory`)
  if (model.contextWindow) {
    details.push(`${Math.round(model.contextWindow / 1000)}k tokens context`)
  }
  details.push(model.license)
  return details.filter(Boolean).join(' · ')
}

function select(model) {
  if (!model.unavailableReason) llmStore.modelId = model.id
}
</script>

<template>
  <div>
    <v-progress-linear v-if="llmStore.isLoadingModels" indeterminate class="mb-2" />
    <ul class="model-list" role="radiogroup" aria-label="Models">
      <li
        v-for="model in visibleModels"
        :key="model.id"
        class="model dialog-item px-3 py-2"
        :class="{
          'is-chosen': model.id === llmStore.modelId,
          'is-unavailable': model.unavailableReason
        }"
        role="radio"
        tabindex="0"
        :aria-checked="model.id === llmStore.modelId"
        :aria-disabled="Boolean(model.unavailableReason)"
        @click="select(model)"
        @keydown.enter.prevent="select(model)"
        @keydown.space.prevent="select(model)"
      >
        <v-icon class="mr-3">
          {{ model.id === llmStore.modelId ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
        </v-icon>
        <div class="model-text">
          <div>
            <b>{{ model.name }}</b>
            <v-chip v-if="isDownloadable && model.isAvailable" size="x-small" class="ml-2" label>
              Downloaded
            </v-chip>
            <v-chip
              v-if="llmStore.measuredSpeed(model.id)"
              size="x-small"
              class="ml-2"
              label
              :color="llmStore.measuredSpeed(model.id) < MIN_USABLE_SPEED ? 'warning' : undefined"
              v-tippy="'Generation speed measured on this device.'"
            >
              {{ llmStore.measuredSpeed(model.id) }} tokens/s
            </v-chip>
          </div>
          <div class="is-size-7">{{ model.unavailableReason || describe(model) }}</div>
        </div>
      </li>
    </ul>
    <v-btn
      v-if="otherModels.length && preferredModels.length && !isShowingOthers"
      variant="text"
      class="mt-2"
      @click="isShowingOthers = true"
    >
      Show {{ otherModels.length }} other model{{ otherModels.length > 1 ? 's' : '' }}
    </v-btn>
  </div>
</template>

<style scoped lang="scss">
.model-list {
  list-style-type: none;
  margin: 0;
  padding: 0;
  max-height: 21rem;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;

  &:empty {
    display: none;
  }
}

.model {
  display: flex;
  align-items: center;
  cursor: pointer;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }

  &.is-chosen {
    background-color: rgba(0, 0, 0, 0.06);
  }

  &.is-unavailable {
    cursor: default;
    opacity: 0.6;
  }

  & .model-text {
    min-width: 0;
  }
}
</style>
