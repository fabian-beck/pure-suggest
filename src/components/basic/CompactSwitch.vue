<template>
    <v-switch :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', !modelValue)" hide-details
        density="compact"></v-switch>
</template>

<script>
export default {
    props: ['modelValue'],
    emits: ['update:modelValue']
}
</script>

<style scoped lang="scss">
.v-input {
    max-height: 30px !important;
    position: relative;
    top: -4px;
}
</style>