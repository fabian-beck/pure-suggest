<template>
    <v-dialog v-model="isDialogShown" scrollable :fullscreen="$vuetify.breakpoint.smAndDown" :persistent="noCloseButton">
        <v-card>
            <v-card-title :class="`has-background-${headerColor} has-text-dark level`">
                <div class="header-left">
                    <v-icon class="has-text-dark title-icon">{{ icon }}</v-icon>
                    <span>{{ title }}</span>
                </div>
                <CompactButton icon="mdi-close" class="header-right" v-on:click="hideDialog" v-if="!noCloseButton"></CompactButton>
            </v-card-title>
            <v-card-text>
                <slot></slot>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script>
export default {
    name: "ModalDialog",
    props: {
        value: Boolean,
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
    watch: {
        value() {
            this.isDialogShown = this.value;
        },
        isDialogShown() {
            this.$emit('input', this.isDialogShown);
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
::v-deep .v-dialog {
    max-width: 960px;

    & .v-card__title {
        margin-bottom: 0;
        padding: calc(min(1.0rem, 2vw));

        & .title-icon {
            margin-right: 0.5rem;
            position: relative;
            top: -0.15rem;
        }
    }

    & .v-card__text {
        padding-top: 1rem;
    }
}
</style>