<template>
    <v-snackbar v-model="interfaceStore.errorToast.isShown" :timeout="5000" rounded="pill" location="top">{{
        interfaceStore.errorToast.message
    }}</v-snackbar>
</template>

<script>
import { useInterfaceStore } from "@/stores/interface.js";
export default {
    name: "ErrorToast",
    setup: () => {
        const interfaceStore = useInterfaceStore();
        return { interfaceStore };
    },
};
</script>

<style scoped lang="scss">
:deep(.v-snackbar__wrapper) {
    background-color: $danger !important;
    min-width: 300px;

    & .v-snackbar__content {
        text-align: center;
        font-size: 1rem;
    }
}
</style>