<script>
export default {
  name: 'CompactButton',
  props: {
    icon: {
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
    icon
    size="small"
    @click="openLink()"
    :disabled="disabled"
    :active="active"
    :class="{ 'is-selected': active }"
    flat
    height="30"
    width="30"
    ><v-icon>{{ icon }}</v-icon></v-btn
  >
</template>

<style scoped lang="scss">
.v-btn {
  background-color: transparent;

  &:hover {
    background-color: rgba(0, 0, 0, 0.15);
  }
}
</style>
