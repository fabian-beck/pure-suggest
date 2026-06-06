<script setup>
import { computed } from 'vue'

const props = defineProps({
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
  },
  // Semantic color of the tag (warning, success, link, grey, ...)
  color: {
    type: String,
    default: 'default'
  }
})

defineEmits(['click'])

const COLOR_CLASSES = {
  warning: 'has-background-warning-light has-text-warning-dark',
  success: 'has-background-success-light has-text-success-dark',
  link: 'has-background-link-light has-text-link-dark',
  info: 'has-background-info-light has-text-info-dark',
  primary: 'has-background-primary-light has-text-primary-dark',
  danger: 'has-background-danger-light has-text-danger-dark',
  grey: 'has-background-grey-lighter has-text-grey-dark',
  default: 'has-background-white has-text-black'
}

const colorClass = computed(() => {
  if (props.active) {
    return 'has-background-dark has-text-white'
  }
  return COLOR_CLASSES[props.color] || COLOR_CLASSES.default
})
</script>

<template>
  <v-chip
    :class="[colorClass, { 'tag-clickable': clickable }]"
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
  font-weight: 600;

  &.has-background-dark {
    border-color: #363636;
  }

  &.tag-clickable {
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }
  }
}
</style>
