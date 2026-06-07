<script setup>
import { computed, ref, watch } from 'vue'

import { useAppState } from '@/composables/useAppState.js'
import { useModalManager } from '@/composables/useModalManager.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'

const ABSTRACT_CLAMP_THRESHOLD = 280

const sessionStore = useSessionStore()
const queueStore = useQueueStore()
const { queueForSelected, queueForExcluded } = useAppState()
const { openAuthorModal } = useModalManager()

const publication = computed(() => sessionStore.activePublication || null)
const publicationType = computed(() => (publication.value?.isSelected ? 'selected' : 'suggested'))

const abstractExpanded = ref(false)
const isAbstractLong = computed(
  () => (publication.value?.abstract?.length || 0) > ABSTRACT_CLAMP_THRESHOLD
)
// Collapse the abstract again whenever the active publication changes
watch(
  () => publication.value?.doi,
  () => {
    abstractExpanded.value = false
  }
)

const isQueued = computed(
  () =>
    publication.value &&
    (queueStore.isQueuingForSelected(publication.value.doi) ||
      queueStore.isQueuingForExcluded(publication.value.doi))
)

function close() {
  sessionStore.clearActivePublication('detail panel close')
}
</script>

<template>
  <div v-if="publication" class="detail-panel" :class="`detail-panel--${publicationType}`" @click.stop>
    <div class="detail-panel__bar">
      <span class="detail-panel__kind">
        <v-icon size="16" class="mr-1">
          {{ publicationType === 'selected' ? 'mdi-water-outline' : 'mdi-water-plus-outline' }}
        </v-icon>
        {{ publicationType === 'selected' ? 'Seed' : 'Suggestion' }}
      </span>
      <span
        class="detail-panel__score"
        :style="{ backgroundColor: publication.scoreColor }"
        v-tippy="'Suggestion score'"
        >{{ publication.score }}</span
      >
      <v-spacer />
      <CompactButton icon="mdi-close" v-tippy="'Close details'" @click="close" />
    </div>

    <div class="detail-panel__body">
      <PublicationDescription
        :publication="publication"
        always-show-details
        :publication-type="publicationType"
      />

      <div v-if="publication.abstract" class="detail-panel__abstract">
        <h3>Abstract</h3>
        <p :class="{ 'is-clamped': isAbstractLong && !abstractExpanded }">
          {{ publication.abstract }}
        </p>
        <button
          v-if="isAbstractLong"
          class="abstract-toggle"
          @click.stop="abstractExpanded = !abstractExpanded"
        >
          {{ abstractExpanded ? 'Show less' : 'Show more' }}
        </button>
      </div>
    </div>

    <div class="detail-panel__actions">
      <v-btn
        v-if="!publication.isSelected"
        size="small"
        class="has-background-primary has-text-white"
        prepend-icon="mdi-plus-thick"
        v-tippy="'Add this publication to the seeds.'"
        @click="queueForSelected(publication.doi)"
      >
        Add to seeds
      </v-btn>
      <v-btn
        size="small"
        variant="tonal"
        prepend-icon="mdi-minus-thick"
        v-tippy="'Mark this publication to be excluded.'"
        @click="queueForExcluded(publication.doi)"
      >
        Exclude
      </v-btn>
      <v-btn
        size="small"
        variant="tonal"
        prepend-icon="mdi-account-group"
        v-tippy="'List authors of selected publications.'"
        @click="openAuthorModal()"
      >
        Authors
      </v-btn>
      <v-btn
        size="small"
        variant="tonal"
        prepend-icon="mdi-open-in-new"
        :href="publication.doiUrl"
        target="_blank"
        rel="noopener"
        v-tippy="'Open the publication page (DOI).'"
      >
        Open
      </v-btn>
      <span v-if="isQueued" class="detail-panel__queued">
        <InlineIcon icon="mdi-tray-full" class="mr-1" />queued
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.detail-panel {
  background: var(--surface-bg);
  border-radius: 6px;
  border-top: 3px solid var(--bulma-info);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  &.detail-panel--selected {
    border-top-color: var(--bulma-primary);
  }
}

.detail-panel__bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid #eee;
}

.detail-panel__kind {
  display: inline-flex;
  align-items: center;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--bulma-grey-dark);
}

.detail-panel__score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6rem;
  height: 1.6rem;
  padding: 0 0.4rem;
  border-radius: 4px;
  font-weight: 700;
  color: var(--bulma-dark);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}

.detail-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0.6rem 0.75rem;
  overflow-y: auto;
  @include thin-scrollbar;
}

.detail-panel__abstract {
  margin-top: 0.5rem;

  & h3 {
    font-weight: 700;
    font-size: 0.85rem;
    margin-bottom: 0.15rem;
  }

  & p {
    font-size: 0.9rem;
    line-height: 1.4;
    color: var(--bulma-grey-dark);

    &.is-clamped {
      display: -webkit-box;
      -webkit-line-clamp: 5;
      line-clamp: 5;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }

  & .abstract-toggle {
    margin-top: 0.2rem;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--bulma-info);

    &:hover {
      text-decoration: underline;
    }
  }
}

.detail-panel__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid #eee;
}

.detail-panel__queued {
  font-size: 0.8rem;
  color: var(--bulma-grey);
  font-style: italic;
}
</style>
