<script>
export default {
  name: 'CompactButton',
  props: {
    icon: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    click: {
      type: Function,
      default: null
    },
    disabled: Boolean,
    href: {
      type: String,
      default: ''
    },
    active: Boolean
  },
  methods: {
    openLink() {
      this.click?.()
      if (this.href) window.open(this.href, '_blank')
    }
  }
}
</script>

<template>
  <v-btn
    :icon="!label && !$slots.default"
    size="small"
    @click="openLink()"
    :disabled="disabled"
    :active="active"
    :class="{ 'is-selected': active }"
    flat
    height="30"
    :width="label || $slots.default ? undefined : 30"
    :style="{
      minHeight: '30px',
      padding: label || $slots.default ? '0 8px' : undefined
    }"
    >
    <v-icon v-if="icon">{{ icon }}</v-icon>
    <span v-if="label" class="ml-1">{{ label }}</span>
    <span v-if="$slots.default" class="ml-1"><slot /></span>
  </v-btn>
</template>

<style scoped lang="scss">
.v-btn {
  background-color: transparent;

  &:hover {
    background-color: rgba(0, 0, 0, 0.15);
  }
}
</style>
