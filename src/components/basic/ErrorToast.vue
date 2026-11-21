<script>
import { useInterfaceStore } from '@/stores/interface.js'

export default {
  name: 'ErrorToast',
  setup: () => {
    const interfaceStore = useInterfaceStore()
    return { interfaceStore }
  }
}
</script>

<template>
  <v-snackbar
    v-model="interfaceStore.errorToast.isShown"
    :timeout="5000"
    rounded="pill"
    location="top"
    :class="{ 'is-info': interfaceStore.errorToast.type === 'info' }"
    >{{ interfaceStore.errorToast.message }}</v-snackbar
  >
</template>

<style scoped lang="scss">
.v-overlay {
  z-index: 6001 !important;

  & :deep(.v-snackbar__wrapper) {
    background-color: var(--bulma-danger) !important;
    min-width: 300px;

    & .v-snackbar__content {
      text-align: center;
      font-size: 1rem;
    }
  }

  &.is-info :deep(.v-snackbar__wrapper) {
    background-color: var(--bulma-dark) !important;
  }
}
</style>
