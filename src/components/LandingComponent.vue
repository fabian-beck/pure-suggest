<script setup>
import { inject, ref } from 'vue'

import { useAppState } from '@/composables/useAppState.js'
import { useModalManager } from '@/composables/useModalManager.js'
import { loadRecentSessions, removeRecentSession } from '@/lib/RecentSessions.js'

const appMeta = inject('appMeta')
const { openSearchModal } = useModalManager()
const { importSessionWithConfirmation, importBibtexWithConfirmation, loadExample, loadSession } =
  useAppState()

const searchQuery = ref('')
const recentSessions = ref(loadRecentSessions())

function submitSearch() {
  openSearchModal(searchQuery.value.trim())
}
</script>

<template>
  <div class="landing">
    <h1 class="landing-title"><AppLogo /></h1>
    <p class="landing-subtitle">{{ appMeta.subtitle }}</p>
    <p class="landing-lead">
      Based on a set of selected publications,
      <b class="has-text-info">suggest</b>ing related <b class="has-text-primary">pu</b>blications
      connected by <b class="has-text-primary">re</b>ferences.
    </p>
    <p class="landing-cta"><i>To start, add publications as seeds:</i></p>
    <form class="landing-search" @submit.prevent="submitSearch">
      <v-text-field
        v-model="searchQuery"
        placeholder="Search for keywords, titles, or DOIs"
        prepend-inner-icon="mdi-magnify"
        variant="solo"
        rounded="pill"
        hide-details
        @click:prepend-inner="submitSearch"
      />
    </form>
    <div class="landing-actions">
      <v-btn variant="tonal" prepend-icon="mdi-import" @click="importSessionWithConfirmation">
        Import session
      </v-btn>
      <v-btn variant="tonal" prepend-icon="mdi-import" @click="importBibtexWithConfirmation()">
        Import BibTeX
      </v-btn>
      <v-btn variant="tonal" prepend-icon="mdi-file-document" @click="loadExample()">
        Load example
      </v-btn>
    </div>
    <div v-if="recentSessions.length" class="landing-recent">
      <p class="landing-recent-label">Or continue a recent session:</p>
      <v-list density="compact" bg-color="transparent">
        <v-list-item
          v-for="session in recentSessions"
          :key="session.id"
          prepend-icon="mdi-history"
          :title="session.name || session.boost || session.title || session.selected[0]"
          :subtitle="`${session.selected.length} selected · ${new Date(session.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`"
          @click="loadSession(session)"
        >
          <template #append>
            <v-btn
              icon="mdi-close"
              color="grey"
              variant="text"
              size="small"
              v-tippy="'Remove from list'"
              @click.stop="recentSessions = removeRecentSession(session.id)"
            />
          </template>
        </v-list-item>
      </v-list>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.landing {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  justify-content: safe center; /* keep top reachable when content overflows */
  text-align: center;
  padding: 2rem;
  padding-bottom: 6rem; /* bias centered content upward, away from viewport's vertical middle */
  gap: 0.5rem;
  background: white;
  overflow-y: auto;
}

.landing-title {
  font-size: 2.5rem;
}

.landing-subtitle {
  color: var(--bulma-grey);
  font-size: 1.1rem;
}

.landing-lead {
  max-width: 32rem;
  margin-top: 0.75rem;
}

.landing-cta {
  margin-top: 1rem;
}

.landing-search {
  width: min(100%, 34rem);
  margin-top: 0.5rem;
}

.landing-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.landing-recent {
  width: min(100%, 34rem);
  margin-top: 1.5rem;
  text-align: left;
}

.landing-recent-label {
  color: var(--bulma-grey);
  text-align: center;
}

@media screen and (max-width: 1023px) {
  .landing {
    justify-content: flex-start;
    padding-top: 4rem;
    padding-bottom: 2rem;
  }
}
</style>
