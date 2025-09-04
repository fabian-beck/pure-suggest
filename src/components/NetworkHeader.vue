<template>
    <div class="level">
        <div class="level-left has-text-white">
            <div class="level-item" v-tippy="`Showing publications as nodes (<b class='has-text-primary'>selected</b>; 
        <b class='has-text-info'>suggested</b>) with citations as links.<br><br>
        You can click a publication for details as well as zoom and pan the diagram.`">
                <v-icon class="has-text-white">mdi-chart-bubble</v-icon>
                <h2 class="is-size-5 ml-2">Citation network</h2>
            </div>
            <div class="has-text-danger has-background-danger-light p-1" v-if="errorMessage">{{ errorMessage }}
            </div>
        </div>
        <div class="level-right" v-show="!isEmpty">
            <div class="level-item has-text-white mr-4 mb-0"
                v-tippy="`There are two display <span class='key'>m</span>odes:<br><br><b>Timeline:</b> 
        The diagram places publications from left to right based on year, and vertically tries to group linked publications close to each other.<br><br>
        <b>Clusters:</b> The diagram groups linked publications close to each other, irrespective of publication year.`">
                <label class="mr-2"><span class="key">M</span>ode:</label>
                <label class="mr-4" :class="{ 'has-text-grey-light': isNetworkClustersModel }">
                    Timeline</label>
                <CompactSwitch v-model="isNetworkClustersModel"></CompactSwitch>
                <label :class="{ 'has-text-grey-light': !isNetworkClustersModel }" class="ml-4">Clusters</label>
            </div>
            <CompactButton icon="mdi-arrow-expand" v-tippy="'Expand diagram'"
                v-show="!interfaceStore.isNetworkExpanded && !interfaceStore.isNetworkCollapsed" v-on:click="$emit('expandNetwork', true)"
                class="ml-4 is-hidden-touch has-text-white"></CompactButton>
            <CompactButton icon="mdi-arrow-collapse" v-tippy="'Collapse diagram'"
                v-show="interfaceStore.isNetworkExpanded" v-on:click="$emit('expandNetwork', false)"
                class="ml-4 is-hidden-touch has-text-white"></CompactButton>
            <CompactButton icon="mdi-window-minimize" v-tippy="'Minimize diagram'"
                v-show="!interfaceStore.isNetworkCollapsed" v-on:click="$emit('collapseNetwork')"
                class="ml-4 is-hidden-touch has-text-white"></CompactButton>
            <CompactButton icon="mdi-window-restore" v-tippy="'Restore diagram'"
                v-show="interfaceStore.isNetworkCollapsed" v-on:click="$emit('restoreNetwork')"
                class="ml-4 is-hidden-touch has-text-white"></CompactButton>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import CompactButton from "@/components/basic/CompactButton.vue";
import CompactSwitch from "@/components/basic/CompactSwitch.vue";
import { useInterfaceStore } from "@/stores/interface.js";
import { useAppState } from "@/composables/useAppState.js";

const props = defineProps({
    errorMessage: {
        type: String,
        default: ""
    },
    isNetworkClusters: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(["expandNetwork", "update:isNetworkClusters", "collapseNetwork", "restoreNetwork"]);

const interfaceStore = useInterfaceStore();
const { isEmpty } = useAppState();

const isNetworkClustersModel = computed({
    get() {
        return props.isNetworkClusters;
    },
    set(value) {
        emit("update:isNetworkClusters", value);
    }
});
</script>