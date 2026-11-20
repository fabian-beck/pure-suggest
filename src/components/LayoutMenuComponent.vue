<script setup>
import { computed } from 'vue'

import { LAYOUTS, useInterfaceStore } from '@/stores/interface.js'

const interfaceStore = useInterfaceStore()

// Panel rectangles [x, y, width, height] of each layout on a 24 x 18 canvas
const LAYOUT_ICONS = {
  networkBottom: {
    selected: [0, 0, 11.25, 10],
    suggested: [12.75, 0, 11.25, 10],
    network: [0, 11.5, 24, 6.5]
  },
  networkRight: {
    selected: [0, 0, 10, 8.25],
    suggested: [0, 9.75, 10, 8.25],
    network: [11.5, 0, 12.5, 18]
  },
  threeColumns: {
    selected: [0, 0, 6.5, 18],
    suggested: [8, 0, 6.5, 18],
    network: [16, 0, 8, 18]
  }
}

const PANEL_COLORS = {
  selected: 'var(--bulma-primary)',
  suggested: 'var(--bulma-info)',
  network: 'var(--bulma-grey)'
}

const autoTooltip = computed(
  () =>
    `<b>Automatic layout</b> depending on the window size<br>(currently: ${LAYOUTS[
      interfaceStore.effectiveLayout
    ].name.toLowerCase()})`
)
</script>

<template>
  <v-btn-toggle
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
      v-tippy="`<b>${layout.name}</b><br>Drag the borders between panels to resize them; double-click a border to reset its position`"
    >
      <svg viewBox="0 0 24 18" width="24" height="18" aria-hidden="true">
        <rect
          v-for="([x, y, width, height], panel) in LAYOUT_ICONS[key]"
          :key="panel"
          :x="x"
          :y="y"
          :width="width"
          :height="height"
          rx="1.5"
          :fill="PANEL_COLORS[panel]"
        />
      </svg>
    </v-btn>
  </v-btn-toggle>
</template>

<style lang="scss" scoped>
.layout-menu {
  height: 32px !important;
  margin-right: 0.5rem;

  & .layout-button {
    min-width: 0 !important;
    padding: 0 8px !important;
    height: 32px !important;
    min-height: 32px !important;

    & svg {
      display: block;
      opacity: 0.35;
      transition: opacity 0.15s;
    }

    &.layout-auto {
      font-size: 0.625rem !important;
    }

    &.is-effective svg,
    &:hover svg {
      opacity: 1;
    }
  }
}
</style>
