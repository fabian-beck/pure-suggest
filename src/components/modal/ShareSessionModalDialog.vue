<template>
  <ModalDialog
    v-model="interfaceStore.isShareSessionModalDialogShown"
    title="Share Session as Link"
    icon="mdi-share-variant"
    header-color="primary"
  >
    <div class="content">
      <p class="mb-4">
        <strong>Share your current session:</strong> This link contains your selections and keyword
        settings.
        <em>Note: Changes require generating a new link.</em>
      </p>

      <v-text-field
        ref="linkInput"
        label="Shareable Link"
        :model-value="shareableUrl"
        readonly
        variant="outlined"
        density="compact"
        style="font-family: monospace; font-size: 0.85rem"
        @focus="$refs.linkInput.select()"
      >
        <template #append-inner>
          <v-btn
            @click="copyToClipboard"
            :color="copySuccess ? 'success' : 'default'"
            variant="text"
            density="compact"
            size="small"
          >
            <v-icon size="small">{{ copySuccess ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
            {{ copySuccess ? 'Copied!' : 'Copy' }}
          </v-btn>
        </template>
      </v-text-field>

      <div class="notification is-light">
        <p class="is-size-6">
          <strong>Tip:</strong> You can bookmark this link or share it with others to let them view
          your current publication selection and settings.
        </p>
      </div>
    </div>
  </ModalDialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useInterfaceStore } from '@/stores/interface.js'
import { useSessionStore } from '@/stores/session.js'
import ModalDialog from './ModalDialog.vue'

const interfaceStore = useInterfaceStore()
const sessionStore = useSessionStore()

const linkInput = ref(null)
const copySuccess = ref(false)

const shareableUrl = computed(() => {
  return sessionStore.generateSessionUrl()
})

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(shareableUrl.value)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    // Fallback: select the text for manual copy
    if (linkInput.value) {
      linkInput.value.select()
      linkInput.value.setSelectionRange(0, 99999) // For mobile devices
    }
  }
}

// Reset copy status when modal is opened
watch(
  () => interfaceStore.isShareSessionModalDialogShown,
  (isShown) => {
    if (isShown) {
      copySuccess.value = false
    }
  }
)
</script>

<style scoped>
/* No custom styles needed - Vuetify handles alignment automatically */
</style>
