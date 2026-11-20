<script setup>
import { ref } from 'vue'

import { useInterfaceStore } from '@/stores/interface.js'

const props = defineProps({
  // 'columns' or 'rows': the grid dimension along which the gutter resizes panels
  axis: {
    type: String,
    required: true
  },
  // The gutter separates the panel tracks with this index and the next one
  index: {
    type: Number,
    required: true
  }
})

const MIN_PANEL_SIZE = 150

const interfaceStore = useInterfaceStore()
const isResizing = ref(false)

function startResize(event) {
  const gutter = event.currentTarget
  const isColumns = props.axis === 'columns'
  const gridStyle = getComputedStyle(gutter.parentElement)
  // Resolved track sizes in px, alternating between panels and gutters
  const panelSizes = gridStyle[isColumns ? 'gridTemplateColumns' : 'gridTemplateRows']
    .split(' ')
    .map(parseFloat)
    .filter((_, trackIndex) => trackIndex % 2 === 0)
  const sizeBefore = panelSizes[props.index]
  const sizeAfter = panelSizes[props.index + 1]
  if (sizeBefore + sizeAfter < 2 * MIN_PANEL_SIZE) return

  const layout = interfaceStore.effectiveLayout
  const startPosition = isColumns ? event.clientX : event.clientY
  event.preventDefault()
  gutter.setPointerCapture?.(event.pointerId)
  isResizing.value = true

  function resize(moveEvent) {
    const offset = (isColumns ? moveEvent.clientX : moveEvent.clientY) - startPosition
    const delta = Math.min(
      Math.max(offset, MIN_PANEL_SIZE - sizeBefore),
      sizeAfter - MIN_PANEL_SIZE
    )
    const sizes = [...panelSizes]
    sizes[props.index] = sizeBefore + delta
    sizes[props.index + 1] = sizeAfter - delta
    const totalSize = sizes.reduce((sum, size) => sum + size, 0)
    interfaceStore.panelSizes[layout][props.axis] = sizes.map(
      (size) => Math.round((size / totalSize) * 1000) / 10
    )
  }

  function stopResize() {
    gutter.removeEventListener('pointermove', resize)
    gutter.removeEventListener('pointerup', stopResize)
    gutter.removeEventListener('pointercancel', stopResize)
    isResizing.value = false
    interfaceStore.saveLayoutSettings()
  }

  gutter.addEventListener('pointermove', resize)
  gutter.addEventListener('pointerup', stopResize)
  gutter.addEventListener('pointercancel', stopResize)
}
</script>

<template>
  <div
    class="panel-gutter"
    :class="[`is-${axis}`, { 'is-resizing': isResizing }]"
    :style="{ gridArea: `gutter-${axis}-${index}` }"
    role="separator"
    :aria-orientation="axis === 'columns' ? 'vertical' : 'horizontal'"
    @pointerdown="startResize"
    @dblclick="interfaceStore.resetPanelSizes(interfaceStore.effectiveLayout, axis)"
    @click.stop
  ></div>
</template>

<style lang="scss" scoped>
.panel-gutter {
  position: relative;
  z-index: 1;
  touch-action: none;

  &.is-columns {
    cursor: col-resize;
  }

  &.is-rows {
    cursor: row-resize;
  }

  /* Slightly enlarged grab area reaching into the neighboring panels */
  &::before {
    content: '';
    position: absolute;
    inset: 0 -3px;
  }

  &.is-rows::before {
    inset: -3px 0;
  }

  /* Grip that extends to a full-length line while hovering or dragging */
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    border-radius: 2px;
    background: var(--bulma-grey-lighter);
    transform: translate(-50%, -50%);
    transition:
      width 0.15s,
      height 0.15s,
      background-color 0.15s;
  }

  &.is-columns::after {
    width: 3px;
    height: 2rem;
  }

  &.is-rows::after {
    width: 2rem;
    height: 3px;
  }

  &:hover::after,
  &.is-resizing::after {
    background: var(--bulma-grey);
  }

  &.is-columns:hover::after,
  &.is-columns.is-resizing::after {
    height: 100%;
  }

  &.is-rows:hover::after,
  &.is-rows.is-resizing::after {
    width: 100%;
  }
}
</style>
