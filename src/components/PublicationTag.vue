<script setup>
defineProps({
  icon: {
    type: String,
    default: ''
  },
  clickable: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])
</script>

<template>
  <v-chip
    class="has-background-dark has-text-white"
    :class="{ 'tag-clickable': clickable, 'tag-active': active }"
    color="black"
    :prepend-icon="icon"
    size="small"
    @click="clickable ? $emit('click') : null"
  >
    <slot></slot>
  </v-chip>
</template>

<style scoped lang="scss">
.v-chip {
  margin-right: 0.5rem;
  padding: 0 0.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;

  &.tag-clickable {
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }
  }

  &.tag-active {
    outline: 2px solid #ffd700;
    outline-offset: 1px;
  }
}
</style>
