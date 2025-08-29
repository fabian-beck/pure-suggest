<template>
  <v-menu v-if="!isEmpty" location="bottom" transition="slide-y-transition">
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" :icon="interfaceStore.isMobile"
        :density="interfaceStore.isMobile ? 'compact' : 'default'"
        class="session-state-button">
        <v-icon size="18">mdi-text-box-multiple-outline</v-icon>
        <span class="is-hidden-touch ml-2">
          {{ sessionStateString }}
          <v-icon class="ml-2">
            mdi-menu-down
          </v-icon>
        </span>
      </v-btn>
    </template>
    <v-list>
      <v-list-item class="is-hidden-desktop">
        {{ sessionStateString }}
      </v-list-item>
      <v-list-item prepend-icon="mdi-minus-thick" @click="interfaceStore.isExcludedModalDialogShown = true"
        title="Excluded publications" v-if="sessionStore.excludedPublicationsCount > 0">
      </v-list-item>
      <v-list-item prepend-icon="mdi-export" @click="sessionStore.exportSession"
        title="Export selected as JSON" />
      <v-list-item prepend-icon="mdi-export" @click="sessionStore.exportAllBibtex"
        title="Export selected as BibTeX" />
      <v-list-item prepend-icon="mdi-delete" @click="clearSession" class="has-text-danger"
        title="Clear session" />
    </v-list>
  </v-menu>
</template>

<script setup>
import { computed } from 'vue'
import { useSessionStore } from "@/stores/session.js"
import { useInterfaceStore } from "@/stores/interface.js"
import { useAppState } from "@/composables/useAppState.js"

const sessionStore = useSessionStore()
const interfaceStore = useInterfaceStore()
const { isEmpty, clearSession } = useAppState()

const sessionStateString = computed(() => {
  return `${sessionStore.selectedPublicationsCount} selected${sessionStore.excludedPublicationsCount
    ? `; ${sessionStore.excludedPublicationsCount} excluded`
    : ""}`
})
</script>