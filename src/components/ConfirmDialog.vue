<template>
    <v-dialog width="500" persistent v-model="interfaceStore.confirmDialog.isShown">
        <v-card>
            <v-card-title v-if="interfaceStore.confirmDialog.title">
                {{ interfaceStore.confirmDialog.title }}
            </v-card-title>
            <v-card-text><span v-html="interfaceStore.confirmDialog.message"></span>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn text @click="hideDialog">Cancel</v-btn>
                <v-btn text @click="hideDialog(); interfaceStore.confirmDialog.action()">Ok</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
import { useInterfaceStore } from "../stores/interface.js";

export default {
    name: "ConfirmDialog",
    setup: () => {
        const interfaceStore = useInterfaceStore();
        return { interfaceStore };
    },
    methods: {
        hideDialog() {
            this.interfaceStore.confirmDialog.isShown = false
        },
    },
};
</script>

<style scoped lang="scss">
::v-deep .v-dialog {

    & .v-card__text {
        padding: 0.5rem 1.5rem;
        font-size: 1.0rem;
    }
}
</style>
