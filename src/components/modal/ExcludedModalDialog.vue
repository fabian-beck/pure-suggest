<template>
    <ModalDialog headerColor="primary" title="Edit excluded publications" icon="mdi-minus-thick"
        v-model="interfaceStore.isExcludedModalDialogShown">
        <div class="content">
            <section>
                <ul class="publication-list">
                    <li class="publication-component media" v-for="publication in excludedPublications"
                        :key="publication.doi">
                        <!-- FIX: Does not update when publication data is fetched -->
                        <div class="media-content">
                            {{ publication.title }}
                            ({{ publication.doi }})
                        </div>
                        <div class="media-right">
                            <CompactButton icon="mdi-undo" v-tippy="'Remove from list of excluded publication again.'"
                                v-on:click="removeFromExcluded(publication)"></CompactButton>
                        </div>
                    </li>
                </ul>
            </section>
        </div>
    </ModalDialog>
</template>

<script>
import { useInterfaceStore } from "@/stores/interface.js";
import { useSessionStore } from "@/stores/session.js";
import { ref, watch } from "vue";
import Publication from "@/Publication.js";

export default {
    setup() {
        const interfaceStore = useInterfaceStore();
        const sessionStore = useSessionStore();

        const excludedPublications = ref([]);

        const updateExcludedPublications = () => {
            excludedPublications.value = [];
            sessionStore.excludedPublicationsDois.forEach((doi) => {
                const publication = new Publication(doi);
                publication.fetchData();
                excludedPublications.value.push(publication);
            });
        };

        watch(
            () => interfaceStore.isExcludedModalDialogShown,
            (newValue, _) => {
                if (newValue === true) {
                    console.log("Excluded publications dialog shown");
                    updateExcludedPublications();
                }
            }
        );

        return { interfaceStore, sessionStore, excludedPublications, updateExcludedPublications };
    },
    methods: {
        removeFromExcluded(publication) {
            this.sessionStore.removeFromExcludedPublication(publication.doi)
            this.sessionStore.updateSuggestions();
            this.updateExcludedPublications();
        },
    },
};
</script>