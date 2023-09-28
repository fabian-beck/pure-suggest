<template>
    <v-dialog width="700" v-model="interfaceStore.infoDialog.isShown">
        <v-card>
            <v-card-title v-if="interfaceStore.infoDialog.title">
                {{ interfaceStore.infoDialog.title }}
            </v-card-title>
            <v-card-text><span v-html="interfaceStore.infoDialog.message"></span>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                    <v-btn text @click="hideDialog">Close</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
import { useInterfaceStore } from "@/stores/interface.js";

export default {
    name: "InfoDialog",
    setup: () => {
        const interfaceStore = useInterfaceStore();
        return { interfaceStore };
    },
    methods: {
        hideDialog() {
            this.interfaceStore.infoDialog.isShown = false
        },
    },
};
</script>