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
import { useSessionStore } from "../../stores/session";

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
        const sessionStore = useSessionStore(); //for logging 
        return { interfaceStore, sessionStore};
    },
    watch: {
        modelValue() {
            this.isDialogShown = this.modelValue;
        },
        isDialogShown() {
            this.$emit('update:modelValue', this.isDialogShown);
            this.sessionStore.logModalAction(this.isDialogShown?"Opened ":"Closed ", this.title)
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
.v-overlay {
    z-index: 5000 !important;

    & :deep(.v-overlay__content) {
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

        & .sticky {
            position: sticky;
            top: 0;
            z-index: 3000;
            background-color: white;
        }

        & .v-card-text {
            padding: calc(0.5rem + 1%) !important;

            & h2 {
                font-size: $size-5 !important;

                & .v-icon {
                    position: relative;
                    top: -0.15rem;
                }
            }
        }

    }
}
</style>