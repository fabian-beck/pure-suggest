<script setup>
import { computed } from 'vue'

import CompactButton from '@/components/basic/CompactButton.vue'
import CompactSwitch from '@/components/basic/CompactSwitch.vue'
import { useInterfaceStore } from '@/stores/interface.js'

const props = defineProps({
  errorMessage: {
    type: String,
    default: ''
  },
  isNetworkClusters: {
    type: Boolean,
    default: false
  },
  hasNoContent: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'expandNetwork',
  'update:isNetworkClusters',
  'collapseNetwork',
  'restoreNetwork'
])

const interfaceStore = useInterfaceStore()

const isNetworkClustersModel = computed({
  get() {
    return props.isNetworkClusters
  },
  set(value) {
    emit('update:isNetworkClusters', value)
  }
})
</script>

<template>
  <div class="level" :class="{ 'mb-0': interfaceStore.isNetworkCollapsed }">
    <div class="level-left has-text-white">
      <div
        class="level-item"
        v-tippy="
          `Showing publications as nodes (<b class='has-text-primary'>selected</b>; 
        <b class='has-text-info'>suggested</b>) with citations as links.<br><br>
        You can click a publication for details as well as zoom and pan the diagram.`
        "
      >
        <v-icon class="has-text-white">mdi-chart-bubble</v-icon>
        <h2 class="is-size-5 ml-2">Citation network</h2>
      </div>
      <div class="has-text-danger has-background-danger-light p-1" v-if="errorMessage">
        {{ errorMessage }}
      </div>
    </div>
    <div class="level-right" v-if="!hasNoContent">
      <div
        class="level-item has-text-white mr-4 mb-0"
        v-show="!interfaceStore.isNetworkCollapsed"
        v-tippy="
          `There are two display <span class='key'>m</span>odes:<br><br><b>Timeline:</b>
        The diagram places publications from left to right based on year, and vertically tries to group linked publications close to each other.<br><br>
        <b>Clusters:</b> The diagram groups linked publications close to each other, irrespective of publication year.`
        "
      >
        <label class="mr-2"><span class="key">M</span>ode:</label>
        <label class="mr-4" :class="{ 'has-text-grey-light': isNetworkClustersModel }">
          Timeline</label
        >
        <CompactSwitch v-model="isNetworkClustersModel"></CompactSwitch>
        <label :class="{ 'has-text-grey-light': !isNetworkClustersModel }" class="ml-4"
          >Clusters</label
        >
      </div>
      <CompactButton
        icon="mdi-arrow-down"
        v-tippy="'Hide diagram'"
        v-show="!interfaceStore.isNetworkCollapsed && !interfaceStore.isMobile && !interfaceStore.isWideScreen"
        @click="$emit('collapseNetwork')"
        class="ml-4 has-text-white"
      ></CompactButton>
      <CompactButton
        icon="mdi-arrow-up"
        v-tippy="'Show diagram'"
        v-show="interfaceStore.isNetworkCollapsed && !interfaceStore.isMobile && !interfaceStore.isWideScreen"
        @click="$emit('restoreNetwork')"
        class="ml-4 has-text-white"
      ></CompactButton>
      <CompactButton
        icon="mdi-arrow-expand"
        v-tippy="'Maximize diagram'"
        v-show="!interfaceStore.isNetworkExpanded"
        @click="
          () => {
            if (interfaceStore.isNetworkCollapsed) $emit('restoreNetwork')
            $emit('expandNetwork', true)
          }
        "
        class="is-hidden-touch has-text-white"
      ></CompactButton>
      <CompactButton
        icon="mdi-arrow-collapse"
        v-tippy="'Return to normal size'"
        v-show="interfaceStore.isNetworkExpanded"
        @click="$emit('expandNetwork', false)"
        class="is-hidden-touch has-text-white"
      ></CompactButton>
    </div>
  </div>
</template>
