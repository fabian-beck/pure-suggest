<script>
import CompactButton from '@/components/basic/CompactButton.vue'
import { useInterfaceStore } from '@/stores/interface.js'

export default {
  name: 'ModalDialog',
  components: { CompactButton },
  props: {
    modelValue: Boolean,
    headerColor: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      isDialogShown: this.value
    }
  },
  setup: () => {
    const interfaceStore = useInterfaceStore()
    return { interfaceStore }
  },
  watch: {
    modelValue() {
      this.isDialogShown = this.modelValue
    },
    isDialogShown() {
      this.$emit('update:modelValue', this.isDialogShown)
    }
  },
  methods: {
    hideDialog() {
      this.isDialogShown = false
    }
  }
}
</script>

<template>
  <v-dialog
    v-model="isDialogShown"
    scrollable
    :fullscreen="interfaceStore.isMobile"
    :z-index="9000"
    class="modal-dialog-overlay"
  >
    <v-card>
      <v-card-title
        :class="`has-background-${headerColor} ${headerColor.startsWith('light') ? 'has-text-dark' : 'has-text-light'}`"
      >
        <div class="modal-title-bar">
          <v-icon size="24">{{ icon }}</v-icon>
          <span class="modal-title-text">{{ title }}</span>
          <div class="modal-title-actions">
            <slot name="header-menu"></slot>
            <CompactButton icon="mdi-close" @click="hideDialog" />
          </div>
        </div>
      </v-card-title>
      <div class="sticky">
        <slot name="sticky"></slot>
      </div>
      <v-card-text>
        <slot></slot>
      </v-card-text>
      <slot name="footer"></slot>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
:deep(.v-overlay__content:has(.v-card)) {
  margin-top: 48px !important;
  height: calc(100vh - 48px) !important;

  & .v-card-title {
    margin-bottom: 0;
    padding: 0.5rem;

    & .modal-title-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0 0.25rem;
      font-size: 1rem;

      & .modal-title-text {
        font-size: 1.2rem;
        font-weight: 600;
        flex-grow: 1;
      }

      & .modal-title-actions {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
    }
  }

  & .sticky {
    position: sticky;
    top: 0;
    z-index: 3000;
    background-color: white;
  }

  & .v-card-text {
    padding: calc(0.5rem + 1%) !important;

    & h2 {
      font-size: 1.25rem !important;

      & .v-icon {
        position: relative;
        top: -0.15rem;
      }
    }
  }
}

@media screen and (max-width: 1023px) {
    :deep(.v-overlay__content:has(.v-card)) {
        margin-top: 0 !important;
        height: 100vh !important;
    }
}

@media screen and (min-width: 1024px) {
  :deep(.v-overlay__content) {
    max-width: 1024px !important;
    margin-top: 60px !important;
    margin-bottom: 20px !important;
    max-height: calc(100vh - 80px) !important;
  }
}
</style>
