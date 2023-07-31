<template>
    <v-snackbar v-model="interfaceStore.errorToast.isShown" :timeout="5000">{{ interfaceStore.errorToast.message
    }}</v-snackbar>
</template>

<script>
import { useInterfaceStore } from "../stores/interface.js";
export default {
    name: "ErrorToast",
    setup: () => {
        const interfaceStore = useInterfaceStore();
        return { interfaceStore };
    },
};
</script>

<style scoped lang="scss">
::v-deep .v-snack__wrapper {
    border-radius: 1.5rem;
    background-color: $danger !important;

    & .v-snack__content {
        text-align: center;
        font-size: 1rem;
    }
}
</style>