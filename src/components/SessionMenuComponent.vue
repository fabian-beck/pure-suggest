<template>
  <v-menu v-if="!isEmpty" location="bottom" transition="slide-y-transition">
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" :icon="interfaceStore.isMobile"
        :density="interfaceStore.isMobile ? 'compact' : 'default'"
        class="session-state-button">
        <v-icon size="18">mdi-text-box-multiple-outline</v-icon>
        <span class="is-hidden-touch ml-2">
          <template v-if="isDefaultSessionName">
            {{ publicationCountString }}
          </template>
          <template v-else>
            <b>{{ sessionStore.sessionName }}</b> ({{ publicationCountString }})
          </template>
          <v-icon class="ml-2">
            mdi-menu-down
          </v-icon>
        </span>
      </v-btn>
    </template>
    <v-list>
      <v-list-item class="is-hidden-desktop">
        <template v-if="isDefaultSessionName">
          {{ publicationCountString }}
        </template>
        <template v-else>
          <b>{{ sessionStore.sessionName }}</b> ({{ publicationCountString }})
        </template>
      </v-list-item>
      <div class="px-4 py-4" @click.stop>
        <v-text-field
          v-model="sessionName"
          label="Session Name"
          variant="underlined"
          density="compact"
          hide-details
          clearable
          @blur="updateSessionName"
          @keyup.enter="updateSessionName"
          @click:clear="clearSessionName"
          prepend-inner-icon="mdi-pencil"
        />
      </div>
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
import { computed, ref, watch } from 'vue'
import { useSessionStore } from "@/stores/session.js"
import { useInterfaceStore } from "@/stores/interface.js"
import { useAppState } from "@/composables/useAppState.js"

const sessionStore = useSessionStore()
const interfaceStore = useInterfaceStore()
const { isEmpty, clearSession } = useAppState()

const sessionName = ref(sessionStore.sessionName)

const publicationCountString = computed(() => {
  return `${sessionStore.selectedPublicationsCount} selected${sessionStore.excludedPublicationsCount
    ? `; ${sessionStore.excludedPublicationsCount} excluded`
    : ""}`
})

const isDefaultSessionName = computed(() => {
  return !sessionStore.sessionName || 
         sessionStore.sessionName.trim() === ''
})

const updateSessionName = () => {
  sessionStore.setSessionName(sessionName.value)
}

const clearSessionName = () => {
  sessionName.value = ''
  sessionStore.setSessionName('')
}

// Watch for changes in the store to keep the local ref in sync
watch(() => sessionStore.sessionName, (newName) => {
  sessionName.value = newName
})
</script>

<style scoped>
.session-state-button :deep(.v-btn__content) {
  text-transform: none;
}
</style>