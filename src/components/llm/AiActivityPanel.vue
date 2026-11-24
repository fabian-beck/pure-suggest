<script setup>
import { computed, nextTick, ref, watch } from 'vue'

import { useInterfaceStore } from '@/stores/interface.js'

const interfaceStore = useInterfaceStore()

const logContainer = ref(null)
const run = computed(() => interfaceStore.aiRun)

const control = computed(() =>
  run.value.isAutoSelect
    ? `The AI model is in control: it adds publications to your selection (${run.value.range.join('–')} expected, ${run.value.publications.length} so far) and may load more suggestions.`
    : 'The AI model is reading your session and tags suggestions; your selection stays as it is.'
)

// Keep the newest entries in view while the log grows
watch(
  run,
  async () => {
    await nextTick()
    logContainer.value?.scrollTo({ top: logContainer.value.scrollHeight })
  },
  { deep: true }
)
</script>

<template>
  <section class="ai-activity" aria-label="AI activity">
    <header class="has-background-ai has-text-white">
      <v-icon class="pulse">mdi-robot-outline</v-icon>
      <h2>AI at work</h2>
      <LlmEngineChip class="ml-auto" />
    </header>
    <p class="control has-background-ai-95">{{ control }}</p>
    <div ref="logContainer" class="log" aria-live="polite">
      <AiRunLog :log="run.log" is-running />
    </div>
    <footer class="has-background-ai-95">
      <v-progress-linear indeterminate color="var(--ai-color)" />
      <div class="d-flex align-center ga-2 pa-2">
        <span class="status is-size-7" role="status">{{ interfaceStore.loadingMessage }}</span>
        <v-btn
          class="ml-auto"
          prepend-icon="mdi-stop"
          :disabled="!interfaceStore.isLoadingCancelable"
          v-tippy="'Stops the AI model (Esc); what it did so far is kept.'"
          @click="interfaceStore.cancelLoading()"
        >
          Stop
        </v-btn>
      </div>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.ai-activity {
  display: grid;
  grid-template-rows: max-content max-content 1fr max-content;
  grid-template-columns: minmax(0, 1fr);
  width: min(92vw, 44rem);
  height: min(80vh, 34rem);
  overflow: hidden;
  background: white;
  border-radius: 6px;
  box-shadow: 0 0.5rem 2rem rgb(0 0 0 / 35%);
}

header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;

  & h2 {
    font-size: 1.2rem;
    font-weight: 600;
  }
}

.control {
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
}

.log {
  padding: 0.25rem 0.75rem;
  overflow-y: auto;
}

.status {
  min-width: 0;
  overflow-wrap: anywhere;
}

.pulse {
  animation: pulse 1.6s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pulse {
    animation: none;
  }
}
</style>
