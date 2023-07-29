<template>
    <v-dialog v-model="isDialogShown" scrollable>
        <v-card>
            <v-card-title :class="`has-background-${headerColor} has-text-dark level`">
                <div class="level-left">
                    <v-icon class="has-text-dark">{{ icon }}</v-icon>
                    &ensp;{{ title }}
                </div>
                <CompactButton
                    icon="mdi-close"
                    class="level-right"
                    v-on:click="hideDialog"
                ></CompactButton>
            </v-card-title>
            <v-card-text>
                <slot></slot>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script>
export default {
    name: "MainDialog",
    props: {
        value: Boolean,
        headerColor: String,
        title: String,
        icon: String,
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
  }

  & .v-card__text {
    padding-top: 1rem;
  }
}
</style>