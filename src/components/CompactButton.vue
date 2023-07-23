<template>
    <v-btn icon small @click.stop="$emit('click')" :disabled="disabled" plain><v-icon>{{ icon }}</v-icon></v-btn>
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

<style scoped></style>