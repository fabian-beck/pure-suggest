<template>
  <v-chip
    class="has-background-dark has-text-white"
    color="black"
    :prepend-icon="icon"
    size="small"
  >
    <slot></slot>
  </v-chip>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    default: ''
  }
})
</script>

<style scoped lang="scss">
.v-chip {
  margin-right: 0.5rem;
  padding: 0 0.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
}
</style>
