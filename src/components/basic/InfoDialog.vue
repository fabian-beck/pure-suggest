<script>
import { useModalStore } from '@/stores/modal.js'

export default {
  name: 'InfoDialog',
  setup: () => {
    const modalStore = useModalStore()
    return { modalStore }
  },
  methods: {
    hideDialog() {
      this.modalStore.infoDialog.isShown = false
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
  >
    <v-card>
      <v-card-title v-if="modalStore.infoDialog.title">
        {{ modalStore.infoDialog.title }}
      </v-card-title>
      <v-card-text><span v-html="modalStore.infoDialog.message"></span> </v-card-text>
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
