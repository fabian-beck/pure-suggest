<template>
    <ModalDialog headerColor="primary" title="Queue" icon="mdi-tray-full"
        v-model="interfaceStore.isQueueModalDialogShown">
    </ModalDialog>
</template>

<script>
import { useInterfaceStore } from "@/stores/interface.js";
import { useSessionStore } from "@/stores/session.js";

export default {
    setup() {
        const interfaceStore = useInterfaceStore();
        const sessionStore = useSessionStore();

        return {
            interfaceStore,
            sessionStore,
        };
    },
};


</script>