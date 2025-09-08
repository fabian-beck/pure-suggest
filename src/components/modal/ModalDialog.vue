<template>
    <v-dialog v-model="isDialogShown" scrollable :fullscreen="interfaceStore.isMobile" :z-index="9000" overlay-class="modal-dialog-overlay">
        <v-card>
            <v-card-title
                :class="`has-background-${headerColor} ${headerColor.startsWith('light') ? 'has-text-dark' : 'has-text-light'}`">
                <v-toolbar color="transparent" density="compact">
                    <v-icon class="title-icon ml-2">{{ icon }}</v-icon>
                    <v-toolbar-title>{{ title }}</v-toolbar-title>
                    <slot name="header-menu"></slot>
                    <v-btn icon @click="hideDialog">
                        <v-icon>mdi-close</v-icon>
                    </v-btn>
                </v-toolbar>
            </v-card-title>
            <div class="sticky">
                <slot name="sticky"></slot>
            </div>
            <v-card-text>
                <slot></slot>
            </v-card-text>
            <slot name="footer"></slot>
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
        hideDialog() {
            this.isDialogShown = false
        },
    },
};
</script>

<style scoped lang="scss">

// Ensure modal overlay covers the entire viewport including header
// Target only modal dialogs with the specific overlay class to avoid affecting confirm dialogs
:deep(.modal-dialog-overlay) {
    z-index: 9000 !important; // Much higher than default Vuetify z-indexes (dialog: 2400, menu: 2410)
}

:deep(.modal-dialog-overlay .v-overlay__scrim) {
    // Ensure the dark overlay covers the full viewport including header
    z-index: 8999 !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    position: fixed !important;
}

:deep(.v-overlay__content:has(.v-card)) {
    margin-top: 48px !important;
    height: calc(100vh - 48px) !important;
    // Ensure content is also above header and any menus
    z-index: 9001 !important;

    & .v-card-title {
        margin-bottom: 0;
        padding: 0.5rem;

        & .v-toolbar-title {
            font-size: 1.2rem;
            font-weight: 600;
        }

        & .v-btn {
            margin-right: 0 !important;
        }
    }

    & .sticky {
        position: sticky;
        top: 0;
        z-index: 3000;
        background-color: white;
    }

    & .v-card-text {
        padding: calc(0.5rem + 1%) !important;

        & h2 {
            font-size: 1.25rem !important;

            & .v-icon {
                position: relative;
                top: -0.15rem;
            }
        }
    }

}

@media screen and (min-width: 1024px) {
    :deep(.v-overlay__content) {
        max-width: 1024px !important;
        margin-top: 60px !important;
        margin-bottom: 20px !important;
        max-height: calc(100vh - 80px) !important;
    }
}
</style>