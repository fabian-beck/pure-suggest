<template>
  <ModalDialog v-model="interfaceStore.isShareSessionModalDialogShown" title="Share Session as Link"
    icon="mdi-share-variant" header-color="info">
    <div class="content">
      <p class="mb-4">
        <strong>Share your current session:</strong> This link contains your selected publications, excluded publications, boost keywords, and session name. 
        <em>Note: Any future changes to your session will require generating a new link.</em>
      </p>
      
      <div class="field">
        <label class="label">Shareable Link:</label>
        <div class="field has-addons">
          <div class="control is-expanded">
            <input 
              ref="linkInput"
              class="input" 
              type="text" 
              :value="shareableUrl" 
              readonly
              @focus="$refs.linkInput.select()"
            />
          </div>
          <div class="control">
            <button 
              class="button is-info" 
              @click="copyToClipboard"
              :class="{ 'is-success': copySuccess }"
            >
              <span class="icon">
                <i class="mdi" :class="copySuccess ? 'mdi-check' : 'mdi-content-copy'"></i>
              </span>
              <span>{{ copySuccess ? 'Copied!' : 'Copy' }}</span>
            </button>
          </div>
        </div>
      </div>
      
      <div class="notification is-info is-light">
        <p class="is-size-7">
          <strong>Tip:</strong> You can bookmark this link or share it with others to let them view your current publication selection and settings.
        </p>
      </div>
    </div>
  </ModalDialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useInterfaceStore } from "@/stores/interface.js"
import { useSessionStore } from "@/stores/session.js"
import ModalDialog from "./ModalDialog.vue"

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
watch(() => interfaceStore.isShareSessionModalDialogShown, (isShown) => {
  if (isShown) {
    copySuccess.value = false
  }
})
</script>

<style scoped>
.field .control.is-expanded .input {
  font-family: monospace;
  font-size: 0.85rem;
}

.button.is-success {
  transition: all 0.3s ease;
}
</style>