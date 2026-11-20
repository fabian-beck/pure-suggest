<script>
import { useDialogFocusReturn } from '@/composables/useDialogFocusReturn.js'
import { useModalStore } from '@/stores/modal.js'

export default {
  name: 'InfoDialog',
  setup: () => {
    const modalStore = useModalStore()
    useDialogFocusReturn(() => modalStore.infoDialog.isShown)
    return { modalStore }
  },
  watch: {
    // Focus right away (and again after the opening transition, in case it was not rendered
    // yet), so that arrow keys scroll long texts
    'modalStore.infoDialog.isShown'(isShown) {
      if (isShown) this.$nextTick(() => this.focusText())
    }
  },
  methods: {
    focusText() {
      this.$refs.text?.$el.focus({ preventScroll: true })
    },
    hideDialog() {
      this.modalStore.infoDialog.isShown = false
    },
    // Enter and the opening key 't' (abstract) close the dialog; the Close button handles Enter itself
    onKeydown(event) {
      if (event.target.closest('button') || !['Enter', 't'].includes(event.key)) return
      event.preventDefault()
      this.hideDialog()
    }
  }
}
</script>

<template>
  <v-dialog
    width="700"
    v-model="modalStore.infoDialog.isShown"
    :z-index="9000"
    class="info-dialog-overlay"
    :aria-label="modalStore.infoDialog.title"
    @after-enter="focusText"
    @keydown="onKeydown"
  >
    <v-card>
      <v-card-title v-if="modalStore.infoDialog.title">
        {{ modalStore.infoDialog.title }}
      </v-card-title>
      <v-card-text ref="text" tabindex="0">
        <span v-html="modalStore.infoDialog.message"></span>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="hideDialog">Close</v-btn>
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
