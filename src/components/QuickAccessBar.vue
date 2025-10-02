<script setup>
import { reactive, onMounted, onUnmounted } from 'vue'

import { useAppState } from '@/composables/useAppState.js'
import { scrollToTargetAdjusted } from '@/lib/Util.js'
import { useQueueStore } from '@/stores/queue.js'

const queueStore = useQueueStore()
const { updateQueued } = useAppState()

function scrollTo(id) {
  scrollToTargetAdjusted(document.getElementById(id), 55)
}

const isComponentActive = reactive({
  selected: true,
  suggested: false,
  network: false
})

function updateActiveButton() {
  isComponentActive.selected = false
  isComponentActive.suggested = false
  isComponentActive.network = false

  const activationHeight = document.documentElement.clientHeight * 0.7
  for (const componentId of Object.keys(isComponentActive)) {
    const component = document.getElementById(componentId)
    if (!component) {
      continue
    }
    const rect = component.getBoundingClientRect()
    isComponentActive[componentId] =
      (rect.top >= 0 && rect.top <= activationHeight) ||
      (rect.top < 0 && rect.bottom > activationHeight)
    if (isComponentActive[componentId]) {
      break
    }
  }
}

onMounted(() => {
  document.addEventListener('scroll', updateActiveButton)
})

onUnmounted(() => {
  document.removeEventListener('scroll', updateActiveButton)
})
</script>

<template>
  <div>
    <v-btn
      class="has-background-primary has-text-white"
      @click="updateQueued"
      v-show="queueStore.isUpdatable"
      id="quick-access-update"
      elevation="6"
      prepend-icon="mdi-update"
    >
      <div class="button-label">Update</div>
    </v-btn>
    <v-btn-toggle borderless elevation="6">
      <v-btn
        class="has-background-primary has-text-white"
        :class="{
          active: isComponentActive.selected
        }"
        @click="scrollTo('selected')"
      >
        <v-icon class="has-text-white" top>mdi-water-outline</v-icon>
        <div class="button-label">Selected</div>
      </v-btn>
      <v-btn
        class="has-background-info has-text-white"
        :class="{
          active: isComponentActive.suggested
        }"
        @click="scrollTo('suggested')"
      >
        <v-icon class="has-text-white" top>mdi-water-plus-outline</v-icon>
        <div class="button-label">Suggested</div>
      </v-btn>
      <v-btn
        class="has-background-grey has-text-white"
        :class="{
          active: isComponentActive.network
        }"
        @click="scrollTo('network')"
      >
        <v-icon class="has-text-white" top>mdi-chart-bubble</v-icon>
        <div class="button-label">Network</div>
      </v-btn>
    </v-btn-toggle>
  </div>
</template>
<style lang="scss" scoped>
.v-btn-group {
  background-color: white;

  & button,
  & button:focus {
    width: 5rem;
    height: 3rem !important;
    filter: opacity(0.5);
    transition: filter 0.3s ease-in-out;

    &.active {
      filter: opacity(1);
      border: 1px solid black !important;
    }

    & :deep(.v-btn__content) {
      display: block;
    }

    & .button-label {
      font-size: 0.7rem;
    }
  }
}

#quick-access-update {
  position: absolute;
  bottom: 3.5rem;
  display: inline-flex;
  height: 2rem;
}
</style>
