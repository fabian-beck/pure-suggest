<template>
      <ModalDialog headerColor="primary" title="Edit excluded publications" icon="mdi-minus"
    v-model="interfaceStore.isExcludedModalDialogShown">
      </ModalDialog>
</template>

<script>
import { useInterfaceStore } from "@/stores/interface.js";
export default {
  setup() {
    const interfaceStore = useInterfaceStore();
    return { interfaceStore };
  },
};
</script>