<template>
    <ModalDialog headerColor="primary" title="Queue" icon="mdi-tray-full" v-model="interfaceStore.isQueueModalDialogShown">
        <template v-slot:sticky>
            <v-sheet class="has-background-primary-light pa-2">
                <p class="comment" v-if="sessionStore.isUpdatable">
                    These publications are maked to be selected or excluded with the next update.</p>
                <p class="comment" v-else>
                    No publications currently in queue; you may close this dialog.
                </p>
            </v-sheet>
        </template>
        <template v-slot:footer>
            <v-card-actions class="has-background-primary-light">
                <v-btn class="has-background-primary-light has-text-dark mr-2" v-on:click="clearQueuesAndClose"
                    v-show="sessionStore.isUpdatable" small prependIcon="mdi-undo">Clear all</v-btn>
                <v-btn class="has-background-primary has-text-white ml-2" v-on:click="updateQueuedAndClose"
                    v-show="sessionStore.isUpdatable" small prependIcon="mdi-update">Update</v-btn>
            </v-card-actions>
        </template>
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
    methods: {
        clearQueuesAndClose() {
            this.sessionStore.clearQueues();
            this.interfaceStore.isQueueModalDialogShown = false;
        },
        updateQueuedAndClose() {
            this.sessionStore.updateQueued();
            this.interfaceStore.isQueueModalDialogShown = false;
        },
    },
};


</script>

<style scoped lang="scss">
@include comment;
</style>