<template>
    <v-snackbar v-model="interfaceStore.loadingToast.isShown" :class="`type-${interfaceStore.loadingToast.type}`"
        timeout="-1" rounded="pill" location="top">{{ interfaceStore.loadingToast.message }}</v-snackbar>
</template>

<script>
import { useInterfaceStore } from "@/stores/interface.js";
export default {
    name: "LoadingToast",
    setup: () => {
        const interfaceStore = useInterfaceStore();
        return { interfaceStore };
    },
};
</script>

<style scoped lang="scss">
:deep(.v-snackbar__wrapper) {
    & .v-snackbar__content {
        text-align: center;
        font-size: 1rem;
    }
}

.type-primary :deep(.v-snackbar__wrapper) {
    background-color: $primary !important;
}

.type-info :deep(.v-snackbar__wrapper) {
    background-color: $info !important;
}
</style>