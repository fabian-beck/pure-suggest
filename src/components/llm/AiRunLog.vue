<script setup>
defineProps({
  // Steps of an AI recommendation run (see useAiRecommendations)
  log: {
    type: Array,
    required: true
  },
  // Whether the last step is still in progress
  isRunning: Boolean
})
</script>

<template>
  <!-- Not a list element: the dialogs' content styles would number and indent it -->
  <div class="run-log" role="list">
    <div v-for="(entry, index) in log" :key="index" class="step" role="listitem">
      <div class="step-title">
        <v-icon size="small">mdi-robot-outline</v-icon>
        <b>Step {{ index + 1 }}</b>
        <span class="is-size-7">{{ entry.considered }}</span>
      </div>
      <p v-if="entry.thinking" class="thinking is-size-7">{{ entry.thinking }}</p>
      <p v-if="entry.reasoning" class="reasoning">
        <v-icon size="small" class="mr-1">mdi-thought-bubble-outline</v-icon>
        <i>{{ entry.reasoning }}</i>
      </p>
      <div v-if="entry.picks.length" class="picks" role="list">
        <div v-for="pick in entry.picks" :key="pick.doi" role="listitem">
          <v-icon size="small" color="success" class="mr-1">mdi-check</v-icon>
          <b>{{ pick.title || pick.doi }}</b>
          <span v-if="pick.authorShort">
            ({{ pick.authorShort }}<template v-if="pick.year">, {{ pick.year }}</template
            >)</span
          >
          <span class="is-size-7">
            – <i>{{ pick.explanation }}</i></span
          >
        </div>
      </div>
      <p v-if="entry.action" class="action">
        <v-icon size="small" class="mr-1">mdi-arrow-right-bold</v-icon>
        {{ entry.action }}
      </p>
      <p v-else-if="isRunning && index === log.length - 1" class="action is-size-7">
        <v-progress-circular indeterminate size="14" width="2" class="mr-1" />
        Working on this step…
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.step {
  padding: 0.5rem 0;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  & p,
  & .picks {
    margin: 0.25rem 0 0 1.5rem;
  }
}

.step-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
}

// Raw thoughts of reasoning models: only their latest part is of interest while they stream
.thinking {
  display: -webkit-box;
  max-height: 4.2em;
  overflow: hidden;
  color: rgba(0, 0, 0, 0.55);
  white-space: pre-wrap;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.action {
  font-weight: 600;
}
</style>
