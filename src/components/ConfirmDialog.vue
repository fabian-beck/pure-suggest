<template>
    <v-dialog width="500" persistent v-model="isDialogShown">
        <v-card>
            <v-card-title v-if="title">
                {{ title }}
            </v-card-title>
            <v-card-text><span v-html="message"></span>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn text @click="hideDialog">Cancel</v-btn>
                <v-btn text @click="hideDialog(); action()">Ok</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
export default {
    name: "ConfirmDialog",
    props: {
        value: Boolean,
        title: String,
        message: String,
        action: Function,
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

    & .v-card__text {
        padding: 0.5rem 1.5rem;
        font-size: 1.0rem;
    }
}
</style>
