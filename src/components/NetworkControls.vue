<template>
  <div class="controls-footer-right" v-show="!isEmpty">
    <span class="mr-4">
      <CompactButton
        icon="mdi-plus"
        v-tippy="'Zoom in'"
        v-on:click="$emit('zoom', 1.2)"
        elevation="1"
        class="mr-2"
        color="white"
      >
      </CompactButton>
      <CompactButton
        icon="mdi-minus"
        v-tippy="'Zoom out'"
        v-on:click="$emit('zoom', 0.8)"
        elevation="1"
        class="mr-2"
        color="white"
      >
      </CompactButton>
      <CompactButton
        icon="mdi-backup-restore"
        v-tippy="'Reset zoom and pan'"
        v-on:click="$emit('reset')"
        elevation="1"
        color="white"
      >
      </CompactButton>
    </span>
    <v-btn-toggle
      class="mr-4"
      v-model="showNodesModel"
      color="dark"
      multiple
      density="compact"
      elevation="1"
      @click="$emit('plot', true)"
    >
      <v-btn
        icon="mdi-water-outline"
        v-tippy="'Show selected publications as nodes'"
        value="selected"
        class="has-text-primary"
      ></v-btn>
      <v-btn
        icon="mdi-water-plus-outline"
        v-tippy="'Show suggested publications as nodes'"
        value="suggested"
        class="has-text-info"
      >
      </v-btn>
      <v-btn
        icon="mdi-chevron-double-up"
        v-tippy="'Show boost keywords as nodes'"
        value="keyword"
        class="has-text-warning-40"
      ></v-btn>
      <v-btn
        icon="mdi-account"
        v-tippy="'Show authors as nodes'"
        value="author"
        class="has-text-grey-dark"
      >
      </v-btn>
    </v-btn-toggle>
    <span>
      <v-menu :close-on-content-click="false">
        <template v-slot:activator="{ props }">
          <CompactButton
            icon="mdi-cog"
            v-tippy="'Visualization settings'"
            elevation="1"
            color="white"
            v-bind="props"
          ></CompactButton>
        </template>
        <v-list>
          <v-list-item prepend-icon="mdi-filter">
            <v-checkbox
              v-model="onlyShowFilteredModel"
              label="Only show filtered"
              :disabled="!sessionStore.filter.hasActiveFilters()"
              @update:modelValue="$emit('plot', true)"
              hide-details
              class="mt-0"
            ></v-checkbox>
          </v-list-item>
          <v-list-item prepend-icon="mdi-water-plus-outline">
            <v-list-item-title>Number of <b>suggested</b> shown</v-list-item-title>
            <v-slider
              v-model="suggestedNumberFactorModel"
              :max="1"
              :min="0.1"
              step="0.05"
              @update:modelValue="$emit('plot', true)"
            />
          </v-list-item>
          <v-list-item prepend-icon="mdi-account">
            <v-list-item-title>Number of <b>authors</b> shown</v-list-item-title>
            <v-slider
              v-model="authorNumberFactorModel"
              :max="2"
              :min="0.1"
              step="0.1"
              @update:modelValue="$emit('plot', true)"
            />
          </v-list-item>
        </v-list>
      </v-menu>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CompactButton from '@/components/basic/CompactButton.vue'
import { useSessionStore } from '@/stores/session.js'
import { useAppState } from '@/composables/useAppState.js'

const props = defineProps({
  showNodes: {
    type: Array,
    default: () => ['selected', 'suggested', 'keyword', 'author']
  },
  onlyShowFiltered: {
    type: Boolean,
    default: false
  },
  suggestedNumberFactor: {
    type: Number,
    default: 0.3
  },
  authorNumberFactor: {
    type: Number,
    default: 0.5
  }
})

const emit = defineEmits([
  'zoom',
  'reset',
  'plot',
  'update:showNodes',
  'update:onlyShowFiltered',
  'update:suggestedNumberFactor',
  'update:authorNumberFactor'
])

const sessionStore = useSessionStore()
const { isEmpty } = useAppState()

const showNodesModel = computed({
  get() {
    return props.showNodes
  },
  set(value) {
    emit('update:showNodes', value)
  }
})

const onlyShowFilteredModel = computed({
  get() {
    return props.onlyShowFiltered
  },
  set(value) {
    emit('update:onlyShowFiltered', value)
  }
})

const suggestedNumberFactorModel = computed({
  get() {
    return props.suggestedNumberFactor
  },
  set(value) {
    emit('update:suggestedNumberFactor', value)
  }
})

const authorNumberFactorModel = computed({
  get() {
    return props.authorNumberFactor
  },
  set(value) {
    emit('update:authorNumberFactor', value)
  }
})
</script>

<style lang="scss" scoped>
.controls-footer-right {
  position: absolute;
  bottom: max(1vw, 1rem);
  right: max(1vw, 1rem);
  z-index: 1;
}

// Fix for slider thumb being cut off when at minimum and maximum values
.v-list-item .v-slider {
  padding-left: 16px;
  padding-right: 16px;
}
</style>
