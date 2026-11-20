<script>
import { useDialogFocusReturn } from '@/composables/useDialogFocusReturn.js'
import { useModalStore } from '@/stores/modal.js'

export default {
  name: 'ConfirmDialog',
  setup: () => {
    const modalStore = useModalStore()
    useDialogFocusReturn(() => modalStore.confirmDialog.isShown)
    return { modalStore }
  },
  watch: {
    // Focus right away (and again after the opening transition, in case it was not rendered
    // yet), so that Enter directly after opening already confirms
    'modalStore.confirmDialog.isShown'(isShown) {
      if (isShown) this.$nextTick(() => this.focusDefault())
    }
  },
  methods: {
    hideDialog() {
      this.modalStore.confirmDialog.isShown = false
    },
    confirm() {
      this.hideDialog()
      this.modalStore.confirmDialog.action()
    },
    // OK is preselected, except for dialogs asking for input such as a file to import
    focusDefault() {
      const defaultElement = this.$refs.message?.querySelector('input') ?? this.$refs.okButton?.$el
      defaultElement?.focus()
    },
    onEnter(event) {
      const { target } = event
      // Buttons handle Enter themselves; a file input without file opens the file chooser
      if (target.closest('button') || (target.type === 'file' && !target.files.length)) return
      event.preventDefault()
      this.confirm()
    }
  }
}
</script>

<template>
  <v-dialog
    width="500"
    persistent
    v-model="modalStore.confirmDialog.isShown"
    :z-index="9000"
    class="confirm-dialog-overlay"
    role="alertdialog"
    :aria-label="modalStore.confirmDialog.title"
    @after-enter="focusDefault"
    @keydown.esc.prevent="hideDialog"
    @keydown.enter="onEnter"
  >
    <v-card>
      <v-card-title v-if="modalStore.confirmDialog.title">
        {{ modalStore.confirmDialog.title }}
      </v-card-title>
      <v-card-text>
        <span ref="message" v-html="modalStore.confirmDialog.message"></span>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="hideDialog">Cancel</v-btn>
        <v-btn ref="okButton" variant="tonal" @click="confirm">Ok</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
:deep(.v-overlay__content) {
  margin-top: 60px !important;
  margin-bottom: 20px !important;
  max-height: calc(100vh - 80px) !important;
}
</style>
