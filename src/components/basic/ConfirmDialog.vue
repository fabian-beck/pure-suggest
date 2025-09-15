<script>
import { useModalStore } from '@/stores/modal.js'

export default {
  name: 'ConfirmDialog',
  setup: () => {
    const modalStore = useModalStore()
    return { modalStore }
  },
  methods: {
    hideDialog() {
      this.modalStore.confirmDialog.isShown = false
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
  >
    <v-card>
      <v-card-title v-if="modalStore.confirmDialog.title">
        {{ modalStore.confirmDialog.title }}
      </v-card-title>
      <v-card-text><span v-html="modalStore.confirmDialog.message"></span> </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="hideDialog">Cancel</v-btn>
        <v-btn text @click="hideDialog(), modalStore.confirmDialog.action()">Ok</v-btn>
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
