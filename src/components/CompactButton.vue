<template>
    <v-btn icon small @click.stop="$emit('click')" :disabled="disabled"><v-icon>{{ icon }}</v-icon></v-btn>
</template>

<script>
// button with properties: "icon"
export default {
    name: "CompactButton",
    props: {
        icon: String,
        click: Function,
        disabled: Boolean,
    },
};
</script>

<style scoped lang="scss">
.v-btn {
    background-color: transparent;
    &:hover {
        background-color: rgba(0, 0, 0, 0.2);
    }
}
</style>