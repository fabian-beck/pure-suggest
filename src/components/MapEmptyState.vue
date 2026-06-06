<script setup>
import { inject } from 'vue'

import { useAppState } from '@/composables/useAppState.js'
import { useModalManager } from '@/composables/useModalManager.js'

const appMeta = inject('appMeta')
const { openSearchModal } = useModalManager()
const { importSessionWithConfirmation, importBibtexWithConfirmation, loadExample } = useAppState()
</script>

<template>
  <div class="map-empty-state">
    <v-icon size="64" class="map-empty-state__logo">mdi-water-plus-outline</v-icon>
    <h1 class="map-empty-state__title" v-html="appMeta.nameHtml"></h1>
    <p class="map-empty-state__subtitle">{{ appMeta.subtitle }}</p>
    <p class="map-empty-state__lead">
      Based on a set of selected publications,
      <b class="has-text-info">suggest</b>ing related
      <b class="has-text-primary">pu</b>blications connected by
      <b class="has-text-primary">re</b>ferences.
    </p>
    <p class="map-empty-state__cta"><i>To start, add publications as seeds:</i></p>
    <div class="map-empty-state__actions">
      <v-btn class="has-background-primary has-text-white" prepend-icon="mdi-magnify" @click="openSearchModal()">
        Search / add
      </v-btn>
      <v-btn variant="tonal" prepend-icon="mdi-import" @click="importSessionWithConfirmation">
        Import session
      </v-btn>
      <v-btn variant="tonal" prepend-icon="mdi-import" @click="importBibtexWithConfirmation">
        Import BibTeX
      </v-btn>
      <v-btn variant="tonal" prepend-icon="mdi-file-document" @click="loadExample()">
        Load example
      </v-btn>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.map-empty-state {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  gap: 0.5rem;
  background: white;
  border-radius: 6px;
  overflow-y: auto;
}

.map-empty-state__logo {
  color: var(--bulma-primary);
}

.map-empty-state__title {
  font-size: 2rem;
  font-weight: 700;
}

.map-empty-state__subtitle {
  color: var(--bulma-grey);
  font-size: 1.1rem;
}

.map-empty-state__lead {
  max-width: 32rem;
  margin-top: 0.75rem;
}

.map-empty-state__cta {
  margin-top: 1rem;
}

.map-empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
