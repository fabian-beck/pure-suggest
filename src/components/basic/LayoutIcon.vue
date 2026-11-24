<script setup>
defineProps({
  layout: { type: String, required: true }
})

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
</script>

<template>
  <svg class="layout-icon" viewBox="0 0 24 18" width="24" height="18" aria-hidden="true">
    <rect
      v-for="([x, y, width, height], panel) in LAYOUT_ICONS[layout]"
      :key="panel"
      :x="x"
      :y="y"
      :width="width"
      :height="height"
      rx="1.5"
      :fill="PANEL_COLORS[panel]"
    />
  </svg>
</template>
