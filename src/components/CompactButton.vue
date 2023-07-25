<template>
    <v-btn icon small @click.stop="performAction()" :disabled="disabled"><v-icon>{{ icon }}</v-icon></v-btn>
</template>

<script>
// button with properties: "icon"
export default {
    name: "CompactButton",
    props: {
        icon: String,
        click: Function,
        disabled: Boolean,
        href: String,
    },
    methods: {
        performAction() {
            this.$emit('click')
            if (this.href) window.open(this.href, '_blank');
        },
    }
};
</script>

<style scoped lang="scss">
.v-btn {
    background-color: transparent;

    &:hover {
        background-color: rgba(0, 0, 0, 0.15);
    }
}
</style>