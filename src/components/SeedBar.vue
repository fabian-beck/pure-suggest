<script setup>
import { useAppState } from '@/composables/useAppState.js'
import { useModalManager } from '@/composables/useModalManager.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'

const sessionStore = useSessionStore()
const interfaceStore = useInterfaceStore()
const queueStore = useQueueStore()
const { openSearchModal, openAuthorModal, openQueueModal } = useModalManager()
const { activatePublicationComponentByDoi, queueForExcluded, updateQueued } = useAppState()

function activate(publication) {
  activatePublicationComponentByDoi(publication.doi)
}

function hover(publication) {
  interfaceStore.setHoveredPublication(publication)
}

function clearHover() {
  interfaceStore.setHoveredPublication(null)
}

function exclude(publication) {
  queueForExcluded(publication.doi)
}
</script>

<template>
  <div class="seed-bar">
    <div class="seed-bar__label" v-tippy="'The publications selected as seeds for computing suggestions.'">
      <v-icon size="20" class="mr-1">mdi-water-outline</v-icon>
      <span class="seed-bar__title">Seeds</span>
      <span class="seed-bar__count">{{ sessionStore.selectedPublicationsCount }}</span>
    </div>

    <div class="seed-bar__chips">
      <v-chip
        v-for="publication in sessionStore.selectedPublicationsFiltered"
        :key="publication.doi"
        class="seed-chip"
        :class="{
          'seed-chip--active': publication.isActive,
          'seed-chip--excluding': queueStore.isQueuingForExcluded(publication.doi)
        }"
        size="small"
        label
        closable
        close-icon="mdi-close"
        @click.stop="activate(publication)"
        @click:close="exclude(publication)"
        @mouseenter="hover(publication)"
        @mouseleave="clearHover()"
      >
        <span class="seed-chip__year">{{ publication.year || '????' }}</span>
        <span class="seed-chip__text">{{ publication.authorShort || publication.title }}</span>
      </v-chip>

      <span v-if="!sessionStore.selectedPublicationsCount" class="seed-bar__empty">
        No seed publications yet — add some to start exploring.
      </span>
    </div>

    <div class="seed-bar__actions">
      <div v-if="queueStore.isUpdatable" class="seed-bar__queue">
        <span class="seed-bar__queue-text">
          <InlineIcon icon="mdi-tray-full" class="mr-1" />
          <b v-if="queueStore.selectedQueue.length">+{{ queueStore.selectedQueue.length }}</b>
          <b v-if="queueStore.excludedQueue.length" class="ml-1 has-text-danger"
            >−{{ queueStore.excludedQueue.length }}</b
          >
        </span>
        <CompactButton icon="mdi-pencil" v-tippy="'Edit queued publications.'" @click="openQueueModal" />
        <CompactButton icon="mdi-undo" v-tippy="'Clear the queue.'" @click="queueStore.clear()" />
        <v-btn
          class="has-background-primary has-text-white"
          size="small"
          prepend-icon="mdi-update"
          v-tippy="'Apply queued changes and recompute suggestions.'"
          @click="updateQueued"
        >
          <span class="key">U</span>pdate
        </v-btn>
      </div>

      <CompactButton
        icon="mdi-account-group"
        v-tippy="`List <span class='key'>a</span>uthors of selected publications.`"
        @click="openAuthorModal()"
      />
      <v-btn
        class="has-background-primary has-text-white"
        size="small"
        prepend-icon="mdi-magnify"
        v-tippy="`<span class='key'>S</span>earch and add publications to seeds.`"
        @click="openSearchModal()"
      >
        Add
      </v-btn>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.seed-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0.6rem;
  background: var(--bulma-primary-95);
  border-bottom: 2px solid var(--bulma-primary);
  border-radius: 6px;
  min-height: 2.75rem;
}

.seed-bar__label {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  color: var(--bulma-primary);
  font-weight: 600;

  & .seed-bar__title {
    font-size: 0.95rem;
  }

  & .seed-bar__count {
    margin-left: 0.4rem;
    background: var(--bulma-primary);
    color: white;
    border-radius: 999px;
    padding: 0 0.45rem;
    font-size: 0.75rem;
    line-height: 1.4;
  }
}

.seed-bar__chips {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.35rem;
  flex: 1 1 auto;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.15rem 0.1rem;
  scrollbar-width: thin;
}

.seed-bar__empty {
  color: var(--bulma-grey);
  font-style: italic;
  font-size: 0.85rem;
}

.seed-chip {
  flex: 0 0 auto;
  max-width: 16rem;
  background: var(--surface-bg) !important;
  border: 1px solid var(--bulma-primary-light);
  cursor: pointer;

  &.seed-chip--active {
    border-color: var(--bulma-primary);
    box-shadow: 0 0 0 1px var(--bulma-primary);
  }

  &.seed-chip--excluding {
    text-decoration: line-through;
    opacity: 0.6;
    border-color: var(--bulma-danger);
  }

  & .seed-chip__year {
    color: var(--bulma-primary);
    font-weight: 700;
    margin-right: 0.35rem;
    font-size: 0.75rem;
  }

  & .seed-chip__text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.seed-bar__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
}

.seed-bar__queue {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding-right: 0.5rem;
  margin-right: 0.25rem;
  border-right: 1px solid var(--bulma-primary-light);
}

.seed-bar__queue-text {
  font-size: 0.8rem;
  white-space: nowrap;
}
</style>
