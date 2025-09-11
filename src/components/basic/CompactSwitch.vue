<template>
  <v-switch
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', !modelValue)"
    hide-details
    density="compact"
  ></v-switch>
</template>

<script>
export default {
  props: {
    modelValue: Boolean
  },
  emits: ['update:modelValue']
}
</script>

<style scoped lang="scss">
.v-input {
  position: relative;
  max-height: 30px !important;
  max-width: 30px !important;
  top: -4px;
}
</style>
