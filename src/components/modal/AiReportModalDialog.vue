<script setup>
import { computed } from 'vue'

import { useModalStore } from '@/stores/modal.js'

const modalStore = useModalStore()

const report = computed(() => modalStore.aiReport)

const plural = (count) => (count === 1 ? '' : 's')

const summary = computed(() => {
  const { isAutoSelect, publications, steps, suggestionCount } = report.value
  const count = publications.length
  if (isAutoSelect) {
    return count
      ? `Added ${count} publication${plural(count)} to the selection in ${steps} step${plural(steps)}.`
      : 'No publication was added to the selection.'
  }
  return count
    ? `Tagged ${count} of ${suggestionCount} suggestions as recommended.`
    : `None of the ${suggestionCount} suggestions was recommended.`
})

const notes = computed(() => {
  const { loadCount, contextNote, isCancelled } = report.value
  const loads = loadCount === 1 ? 'once' : `${loadCount} times`
  return [
    loadCount ? `More suggestions were loaded ${loads}.` : '',
    contextNote,
    isCancelled ? 'The run was cancelled before it finished.' : ''
  ]
    .filter(Boolean)
    .join(' ')
})
</script>

<template>
  <ModalDialog
    v-model="modalStore.isAiReportModalDialogShown"
    title="AI report"
    icon="mdi-robot-outline"
    header-color="info"
  >
    <div v-if="report" class="content">
      <p v-if="report.text" class="report-text">
        <i>{{ report.text }}</i>
      </p>
      <p>
        <b>{{ summary }}</b> {{ notes }}
      </p>
      <p v-if="report.failure" class="has-text-danger" role="alert">
        The run ended early: {{ report.failure }}
      </p>

      <ul v-if="report.publications.length" class="publications">
        <li
          v-for="publication in report.publications"
          :key="publication.doi"
          class="dialog-item px-3 py-2"
          tabindex="0"
        >
          <div>
            <b>{{ publication.title || publication.doi }}</b>
            <span v-if="publication.authorShort">
              ({{ publication.authorShort }}<template v-if="publication.year"
                >, {{ publication.year }}</template
              >)
            </span>
          </div>
          <div class="is-size-7">
            <i>{{ publication.explanation }}</i>
          </div>
        </li>
      </ul>
    </div>
    <template #footer>
      <v-card-actions class="has-background-info-95 justify-end">
        <v-btn
          class="has-background-info has-text-white dialog-initial-focus"
          @click="modalStore.isAiReportModalDialogShown = false"
        >
          Close
        </v-btn>
      </v-card-actions>
    </template>
  </ModalDialog>
</template>

<style scoped lang="scss">
.report-text {
  font-size: 1.05rem;
}

.publications {
  list-style-type: none;
  margin: 0;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;

  & li:not(:last-child) {
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }
}
</style>
