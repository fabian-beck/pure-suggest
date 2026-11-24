<script setup>
import { computed } from 'vue'

import { LAYOUTS, useInterfaceStore } from '@/stores/interface.js'

defineProps({
  collapsed: { type: Boolean, default: false }
})

const interfaceStore = useInterfaceStore()

const autoTooltip = computed(
  () =>
    `<b>Automatic layout</b> depending on the window size<br>(currently: ${LAYOUTS[
      interfaceStore.effectiveLayout
    ].name.toLowerCase()})`
)

const RESIZE_HINT =
  'Drag the borders between panels to resize them; double-click a border to reset its position'
</script>

<template>
  <v-menu v-if="collapsed" location="bottom" transition="slide-y-transition">
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        variant="text"
        class="layout-button layout-menu-button"
        aria-label="Layout"
        v-tippy="
          `<b>Layout:</b> ${
            interfaceStore.layoutMode === 'auto' ? 'automatic, currently ' : ''
          }${LAYOUTS[interfaceStore.effectiveLayout].name.toLowerCase()}`
        "
      >
        <LayoutIcon :layout="interfaceStore.effectiveLayout" />
        <v-icon size="18">mdi-menu-down</v-icon>
      </v-btn>
    </template>
    <v-list density="compact" class="layout-list">
      <v-list-item
        title="Automatic layout"
        :subtitle="`Currently: ${LAYOUTS[interfaceStore.effectiveLayout].name.toLowerCase()}`"
        :active="interfaceStore.layoutMode === 'auto'"
        @click="interfaceStore.setLayoutMode('auto')"
      >
        <template #prepend><span class="layout-auto">Auto</span></template>
      </v-list-item>
      <v-list-item
        v-for="(layout, key) in LAYOUTS"
        :key="key"
        :title="layout.name"
        :active="interfaceStore.layoutMode === key"
        @click="interfaceStore.setLayoutMode(key)"
      >
        <template #prepend><LayoutIcon :layout="key" /></template>
      </v-list-item>
      <v-list-item :subtitle="RESIZE_HINT" class="layout-hint" />
    </v-list>
  </v-menu>
  <v-btn-toggle
    v-else
    :model-value="interfaceStore.layoutMode"
    @update:model-value="interfaceStore.setLayoutMode"
    mandatory
    density="compact"
    variant="text"
    class="layout-menu"
  >
    <v-btn value="auto" class="layout-button layout-auto" v-tippy="autoTooltip">Auto</v-btn>
    <v-btn
      v-for="(layout, key) in LAYOUTS"
      :key="key"
      :value="key"
      class="layout-button"
      :class="{ 'is-effective': key === interfaceStore.effectiveLayout }"
      :aria-label="layout.name"
      v-tippy="`<b>${layout.name}</b><br>${RESIZE_HINT}`"
    >
      <LayoutIcon :layout="key" />
    </v-btn>
  </v-btn-toggle>
</template>

<style lang="scss" scoped>
.layout-auto {
  font-size: 0.625rem !important;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.0892857143em;
}

.layout-menu {
  height: 32px !important;
  margin-right: 0.5rem;

  & .layout-button {
    & .layout-icon {
      opacity: 0.35;
      transition: opacity 0.15s;
    }

    &.is-effective .layout-icon,
    &:hover .layout-icon {
      opacity: 1;
    }
  }
}

.layout-button {
  min-width: 0 !important;
  padding: 0 8px !important;
  height: 32px !important;
  min-height: 32px !important;

  & .layout-icon {
    display: block;
  }
}

.layout-menu-button {
  margin-right: 0.25rem;
  padding: 0 4px 0 8px !important;
}

.layout-list {
  max-width: 300px;

  & :deep(.v-list-item__prepend) {
    width: 40px;
  }

  & .layout-hint :deep(.v-list-item-subtitle) {
    -webkit-line-clamp: unset;
    white-space: normal;
  }
}
</style>
