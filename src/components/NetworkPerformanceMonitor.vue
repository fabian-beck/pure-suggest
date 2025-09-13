<script setup>
import { ref } from 'vue'

import { FpsTracker } from '@/lib/FpsTracker.js'

// Props definition with defaults
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  isEmpty: {
    type: Boolean,
    default: false
  },
  nodeCount: {
    type: Number,
    default: 0
  },
  linkCount: {
    type: Number,
    default: 0
  },
  shouldSkipEarlyTicks: {
    type: Boolean,
    default: false
  },
  skipEarlyTicks: {
    type: Number,
    default: 10
  }
})

// Reactive data
const fpsTracker = ref(new FpsTracker())
const currentFps = ref(0)
const tickCount = ref(0)
const domUpdateCount = ref(0)
const skippedUpdateCount = ref(0)
const lastNodeUpdateCount = ref(0)
const lastLinkUpdateCount = ref(0)

/**
 * Updates FPS tracking and current FPS display
 */
const trackFps = () => {
  fpsTracker.value.update()
  currentFps.value = fpsTracker.value.getFps()
}

/**
 * Increments tick counter
 */
const incrementTick = () => {
  tickCount.value++
}

/**
 * Records DOM update statistics
 */
const recordDomUpdate = (nodesUpdated = 0, linksUpdated = 0) => {
  domUpdateCount.value++
  lastNodeUpdateCount.value = nodesUpdated
  lastLinkUpdateCount.value = linksUpdated
}

/**
 * Records when updates are skipped for performance
 */
const recordSkippedUpdate = () => {
  skippedUpdateCount.value++
  lastNodeUpdateCount.value = 0
  lastLinkUpdateCount.value = 0
}

/**
 * Records when entire ticks are skipped (alternating tick optimization)
 * without resetting node/link display counts
 */
const recordTickSkipped = () => {
  skippedUpdateCount.value++
  // Don't reset lastNodeUpdateCount/lastLinkUpdateCount to avoid flickering
}

/**
 * Resets all optimization metrics
 */
const resetMetrics = () => {
  fpsTracker.value = new FpsTracker()
  currentFps.value = 0
  tickCount.value = 0
  domUpdateCount.value = 0
  skippedUpdateCount.value = 0
  lastNodeUpdateCount.value = 0
  lastLinkUpdateCount.value = 0
}

// Expose methods for parent component access via refs
defineExpose({
  trackFps,
  incrementTick,
  recordDomUpdate,
  recordSkippedUpdate,
  recordTickSkipped,
  resetMetrics,
  // Also expose data for testing
  tickCount,
  domUpdateCount,
  skippedUpdateCount,
  lastNodeUpdateCount,
  lastLinkUpdateCount,
  currentFps,
  fpsTracker
})
</script>

<template>
  <div class="fps-display" v-if="show">
    <span v-if="isEmpty" style="color: orange">
      SIMULATION SKIPPED<br />
      (Empty State)<br />
      Network Cleared
    </span>
    <template v-else>
      FPS: {{ currentFps.toFixed(1) }}
      <br />
      Tick: {{ tickCount
      }}{{ shouldSkipEarlyTicks && tickCount <= skipEarlyTicks ? ' (skipping)' : '' }} <br />
      Nodes: {{ nodeCount }}
      <br />
      Links: {{ linkCount }}
      <br />
      DOM Updates: {{ domUpdateCount }}
      <br />
      Skipped: {{ skippedUpdateCount }}
      <br />
      Nodes Updated: {{ lastNodeUpdateCount }}/{{ nodeCount }}
      <br />
      Links Updated: {{ lastLinkUpdateCount }}/{{ linkCount }}
    </template>
  </div>
</template>

<style scoped>
.fps-display {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  line-height: 1.3;
  z-index: 1000;
  pointer-events: none;
  width: 220px;
  text-align: left;
}
</style>
