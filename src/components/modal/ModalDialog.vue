<template>
    <v-dialog v-model="isDialogShown" scrollable :fullscreen="interfaceStore.isMobile" :persistent="noCloseButton">
        <v-card>
            <v-card-title :class="`has-background-${headerColor} has-text-dark level`">
                <div class="header-left">
                    <v-icon class="has-text-dark title-icon">{{ icon }}</v-icon>
                    <span>{{ title }}</span>
                </div>
                <CompactButton icon="mdi-close" class="header-right" v-on:click="hideDialog" v-if="!noCloseButton">
                </CompactButton>
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
    max-width: 960px !important;

    & .v-card-title {
        margin-bottom: 0;
        padding: calc(min(1.0rem, 2vw));

        & .title-icon {
            margin-right: 0.5rem;
            position: relative;
            top: -0.15rem;
        }
    }

}
</style>