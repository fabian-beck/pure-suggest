<template>
    <v-dialog v-model="isDialogShown" scrollable :fullscreen="interfaceStore.isMobile" :persistent="noCloseButton">
        <v-card>
            <v-card-title :class="`has-background-${headerColor} has-text-dark`">
                <v-toolbar color="transparent" density="compact">
                    <v-icon class="has-text-dark title-icon">{{ icon }}</v-icon>
                    <v-toolbar-title>{{ title }}</v-toolbar-title>
                    <v-btn icon @click="hideDialog">
                        <v-icon>mdi-close</v-icon>
                    </v-btn>
                </v-toolbar>
            </v-card-title>
            <v-card-text>
                <slot></slot>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script>
import { useInterfaceStore } from "@/stores/interface.js";

export default {
    name: "ModalDialog",
    props: {
        modelValue: Boolean,
        headerColor: String,
        title: String,
        icon: String,
        noCloseButton: Boolean,
    },
    data() {
        return {
            isDialogShown: this.value,
        };
    },
    setup: () => {
        const interfaceStore = useInterfaceStore();
        return { interfaceStore };
    },
    watch: {
        modelValue() {
            this.isDialogShown = this.modelValue;
        },
        isDialogShown() {
            this.$emit('update:modelValue', this.isDialogShown);
        },
    },
    methods: {
        showDialog() {
            this.isDialogShown = true
        },
        hideDialog() {
            this.isDialogShown = false
        },
    },
};
</script>

<style scoped lang="scss">
:deep(.v-overlay__content) {
    max-width: 1024px !important;

    & .v-card-title {
        margin-bottom: 0;
        padding: 0.5rem;

        & .v-toolbar-title {
            font-size: 1.2rem;
        }

        & .v-btn {
            margin-right: 0 !important;
        }
    }

    & .v-card-text {
        padding: calc(0.5rem + 1%) !important;
    }

}
</style>