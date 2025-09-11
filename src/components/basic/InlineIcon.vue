<script>
export default {
  name: 'InlineIcon',
  props: {
    icon: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      default: ''
    }
  }
}
</script>

<template>
  <v-icon size="x-small" :class="color ? `has-text-${color.replace(/\s+/g, '-')}` : ''">{{
    icon
  }}</v-icon>
</template>

<style scoped lang="scss">
.v-icon {
  position: relative;
  top: -0.075rem;
}
</style>
