<script setup>
import { inject } from 'vue'

const appMeta = inject('appMeta')
</script>

<template>
  <span class="app-logo">
    <v-icon class="app-logo-icon">mdi-water-plus-outline</v-icon>
    <span v-html="appMeta.nameHtml"></span>
  </span>
</template>

<style scoped>
.app-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.15em;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.app-logo-icon {
  font-size: 1.33em;
  color: rgb(var(--v-theme-on-surface));
}
</style>
