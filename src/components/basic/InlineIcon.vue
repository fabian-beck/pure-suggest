<template>
    <v-icon small :class="`has-text-${color}`">{{ icon }}</v-icon>
</template>

<script>
export default {
    name: "InlineIcon",
    props: {
        icon: String,
        color: String,
    },
};
</script>

<style scoped lang="scss">
.v-icon {
    position: relative;
    top: -0.075rem;
}
</style>