<script setup>
import { computed, ref, watch } from 'vue'

import { useAppState } from '@/composables/useAppState.js'
import { bibtexParser } from '@/lib/Util.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'

const sessionStore = useSessionStore()
const interfaceStore = useInterfaceStore()
const modalStore = useModalStore()
const { clearSession, importSessionWithConfirmation, loadSession } = useAppState()

const sessionName = ref(sessionStore.sessionName)

const publicationCountString = computed(() => {
  return `${sessionStore.selectedPublicationsCount} selected${
    sessionStore.excludedPublicationsCount
      ? `; ${sessionStore.excludedPublicationsCount} excluded`
      : ''
  }`
})

const isDefaultSessionName = computed(() => {
  return !sessionStore.sessionName || sessionStore.sessionName.trim() === ''
})

const updateSessionName = () => {
  sessionStore.setSessionName(sessionName.value)
}

const clearSessionName = () => {
  sessionName.value = ''
  sessionStore.setSessionName('')
}

const importBibtex = () => {
  const warningMessage = '<p style="color: #d32f2f; margin-bottom: 16px;"><strong>This will clear and replace the current session.</strong></p>'

  modalStore.showConfirmDialog(
    `${warningMessage}<label>Choose a BibTeX file:&nbsp;</label>
    <input type="file" id="import-bibtex-input" accept=".bib"/>`,
    async () => {
      const fileInput = document.getElementById('import-bibtex-input')
      const file = fileInput.files[0]

      if (!file) {
        console.error('No file selected')
        return
      }

      try {
        const parsedData = await bibtexParser(file)
        loadSession(parsedData)
      } catch (error) {
        console.error('Error parsing BibTeX file:', error)
        interfaceStore.showErrorMessage('Error parsing BibTeX file. Please check the file format.')
      }
    },
    'Import BibTeX'
  )
}

// Watch for changes in the store to keep the local ref in sync
watch(
  () => sessionStore.sessionName,
  (newName) => {
    sessionName.value = newName
  }
)
</script>

<template>
  <v-menu location="bottom" transition="slide-y-transition">
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        :icon="interfaceStore.isMobile"
        :density="interfaceStore.isMobile ? 'compact' : 'default'"
        class="session-state-button"
      >
        <v-icon size="18">mdi-text-box-multiple-outline</v-icon>
        <span class="is-hidden-touch ml-2">
          <template v-if="isDefaultSessionName">
            {{ publicationCountString }}
          </template>
          <template v-else>
            <b>{{ sessionStore.sessionName }}</b> ({{ publicationCountString }})
          </template>
          <v-icon class="ml-2"> mdi-menu-down </v-icon>
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
      <v-list-item
        prepend-icon="mdi-minus-thick"
        @click="interfaceStore.isExcludedModalDialogShown = true"
        title="Excluded publications"
        v-if="sessionStore.excludedPublicationsCount > 0"
      >
      </v-list-item>
      <v-list-item
        prepend-icon="mdi-export"
        @click="sessionStore.exportSession"
        title="Export session"
      />
      <v-list-item
        prepend-icon="mdi-export"
        @click="sessionStore.exportAllBibtex"
        title="Export BibTeX"
      />
      <v-list-item
        prepend-icon="mdi-share-variant"
        @click="interfaceStore.isShareSessionModalDialogShown = true"
        title="Share session as link"
      />
      <v-list-item
        prepend-icon="mdi-delete"
        @click="clearSession"
        class="has-text-danger"
        title="Clear session"
      />
      <v-list-item
        prepend-icon="mdi-import"
        @click="importSessionWithConfirmation"
        title="Import session"
      />
      <v-list-item prepend-icon="mdi-import" @click="importBibtex" title="Import BibTeX " />
    </v-list>
  </v-menu>
</template>

<style scoped>
.session-state-button :deep(.v-btn__content) {
  text-transform: none;
}
</style>
