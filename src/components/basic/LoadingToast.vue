<template>
    <v-snackbar v-model="interfaceStore.loadingToast.isShown" :class="`type-${interfaceStore.loadingToast.type}`"
        timeout="-1">{{ interfaceStore.loadingToast.message }}</v-snackbar>
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
::v-deep .v-snack__wrapper {
    border-radius: 1.5rem;

    & .v-snack__content {
        text-align: center;
        font-size: 1rem;
    }
}

.type-primary ::v-deep .v-snack__wrapper {
    background-color: $primary !important;
}

.type-info ::v-deep .v-snack__wrapper {
    background-color: $info !important;
}
</style>