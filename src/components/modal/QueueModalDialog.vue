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
        <div class="content">
            <section>
                <div v-show="sessionStore.selectedQueue.length">
                    <label>Queueing for <b>selected</b>:</label>
                    <ul class="publication-list">
                        <li class="publication-component media" v-for="doi in sessionStore.selectedQueue" :key="doi">
                            <div class="media-content">
                                {{ doi }}
                            </div>
                            <div class="media-right">
                                <CompactButton icon="mdi-undo" v-tippy="'Remove publication from queue.'"
                                    v-on:click="sessionStore.removeFromQueues(doi)"></CompactButton>
                            </div>
                        </li>
                    </ul>
                </div>
                <div v-show="sessionStore.excludedQueue.length">
                    <label>Queueing for <b>excluded</b>:</label>
                    <ul class="publication-list">
                        <li class="publication-component media" v-for="doi in sessionStore.excludedQueue" :key="doi">
                            <div class="media-content">
                                {{ doi }}
                            </div>
                            <div class="media-right">
                                <CompactButton icon="mdi-undo" v-tippy="'Remove publication from queue.'"
                                    v-on:click="sessionStore.removeFromQueues(doi)"></CompactButton>
                            </div>
                        </li>
                    </ul>
                </div>
            </section>
        </div>
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