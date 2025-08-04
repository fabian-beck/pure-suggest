<template>
    <ModalDialog headerColor="primary" title="Queue" icon="mdi-tray-full" v-model="interfaceStore.isQueueModalDialogShown">
        <template v-slot:sticky>
            <v-sheet class="has-background-primary-95 pa-2">
                <p class="comment" v-if="sessionStore.isUpdatable">
                    These publications are maked to be selected or excluded with the next update.</p>
                <p class="comment" v-else>
                    No publications currently in queue; you may close this dialog.
                </p>
            </v-sheet>
        </template>
        <template v-slot:footer>
            <v-card-actions class="has-background-primary-95 level-right">
                <v-btn class="has-background-primary-95 has-text-dark mr-2" v-on:click="clearQueuesAndClose"
                    v-show="sessionStore.isUpdatable" small prependIcon="mdi-undo">Clear all</v-btn>
                <v-btn class="has-background-primary has-text-white ml-2" v-on:click="updateQueuedAndClose"
                    v-show="sessionStore.isUpdatable" small prependIcon="mdi-update">Update</v-btn>
            </v-card-actions>
        </template>
        <div class="content">
            <section>
                <div v-show="selectedQueue.length">
                    <label>Queued for <b>selected</b> <InlineIcon icon="mdi-plus-thick" color="primary-dark" /></label>
                    <ul class="publication-list">
                        <li class="publication-component media" v-for="publication in selectedQueue" :key="publication.doi">
                            <div class="media-content">
                                <PublicationDescription :publication="publication" :alwaysShowDetails="true">
                                </PublicationDescription>
                            </div>
                            <div class="media-right">
                                <CompactButton icon="mdi-undo" v-tippy="'Remove publication from queue.'"
                                    v-on:click="removeFromQueueAndUpdatePublications(publication)"></CompactButton>
                            </div>
                        </li>
                    </ul>
                </div>
                <v-divider v-show="selectedQueue.length && excludedQueue.length"></v-divider>
                <div v-show="excludedQueue.length">
                    <label>Queued for <b>excluded</b> <InlineIcon icon="mdi-minus-thick" /></label>
                    <ul class="publication-list">
                        <li class="publication-component media" v-for="publication in excludedQueue" :key="publication.doi">
                            <div class="media-content">
                                <PublicationDescription :publication="publication" :alwaysShowDetails="true">
                                </PublicationDescription>
                            </div>
                            <div class="media-right">
                                <CompactButton icon="mdi-undo" v-tippy="'Remove publication from queue.'"
                                    v-on:click="removeFromQueueAndUpdatePublications(publication)"></CompactButton>
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
import { watch, reactive } from "vue";
import Publication from "../../Publication";

export default {
    setup() {
        const interfaceStore = useInterfaceStore();
        const sessionStore = useSessionStore();

        const selectedQueue = reactive([]);
        const excludedQueue = reactive([]);

        function updatePublications() {
            selectedQueue.splice(0, selectedQueue.length);
            excludedQueue.splice(0, excludedQueue.length);
            sessionStore.selectedQueue.forEach((doi) => {
                selectedQueue.push(new Publication(doi));
            });
            sessionStore.excludedQueue.forEach((doi) => {
                excludedQueue.push(new Publication(doi));
            });
            // async fetch publication data
            selectedQueue.forEach((publication) => {
                publication.fetchData();
            });
            excludedQueue.forEach((publication) => {
                publication.fetchData();
            });
        }

        watch(() => interfaceStore.isQueueModalDialogShown,
            (newValue) => {
                if (newValue) {
                    console.log("Queue dialog shown");
                    updatePublications();
                }
            });

        return {
            interfaceStore,
            sessionStore,
            selectedQueue,
            excludedQueue,
            updatePublications,
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
        removeFromQueueAndUpdatePublications(publication) {
            this.sessionStore.removeFromQueues(publication.doi);
            this.updatePublications();
        },
    },
};
</script>

<style scoped lang="scss">
@include comment;
</style>