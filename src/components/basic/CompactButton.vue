<template>
    <v-btn icon size="small" @click.stop="performAction()" :disabled="disabled" flat height="30" width="30"><v-icon>{{ icon }}</v-icon></v-btn>
</template>

<script>
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