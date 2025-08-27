<template>
    <div class="network-of-references">
        <div class="box has-background-grey">
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
                <div class="level-right" v-show="!sessionStore.isEmpty">
                    <div class="level-item has-text-white mr-4 mb-0"
                        v-tippy="`There are two display <span class='key'>m</span>odes:<br><br><b>Timeline:</b> 
            The diagram places publications from left to right based on year, and vertically tries to group linked publications close to each other.<br><br>
            <b>Clusters:</b> The diagram groups linked publications close to each other, irrespective of publication year.`">
                        <label class="mr-2"><span class="key">M</span>ode:</label>
                        <label class="mr-4" :class="{ 'has-text-grey-light': isNetworkClusters }">
                            Timeline</label>
                        <CompactSwitch v-model="isNetworkClusters"></CompactSwitch>
                        <label :class="{ 'has-text-grey-light': !isNetworkClusters }" class="ml-4">Clusters</label>
                    </div>
                    <CompactButton icon="mdi-arrow-expand" v-tippy="'Expand diagram'"
                        v-show="!interfaceStore.isNetworkExpanded" v-on:click="expandNetwork(true)"
                        class="ml-4 is-hidden-touch has-text-white"></CompactButton>
                    <CompactButton icon="mdi-arrow-collapse" v-tippy="'Collapse diagram'"
                        v-show="interfaceStore.isNetworkExpanded" v-on:click="expandNetwork(false)"
                        class="ml-4 is-hidden-touch has-text-white"></CompactButton>
                </div>
            </div>
            <div id="network-svg-container">
                <svg id="network-svg">
                    <g></g>
                </svg>
            </div>
            <ul class="publication-component-list">
                <PublicationComponent v-if="activePublication && interfaceStore.isNetworkExpanded"
                    :publication="activePublication" :is-active="true"></PublicationComponent>
            </ul>
            <div class="controls-header-left">
                <v-btn class="has-background-primary has-text-white" @click="sessionStore.updateQueued"
                    v-show="sessionStore.isUpdatable && interfaceStore.isNetworkExpanded" id="quick-access-update">
                    <v-icon left>mdi-update</v-icon>
                    <span class="key">U</span>pdate
                </v-btn>
            </div>
            <div class="controls-footer-right" v-show="!sessionStore.isEmpty">
                <span class="mr-4">
                    <CompactButton icon="mdi-plus" v-tippy="'Zoom in'" v-on:click="zoomByFactor(1.2)" elevation="1"
                        class="mr-2" color="white">
                    </CompactButton>
                    <CompactButton icon="mdi-minus" v-tippy="'Zoom out'" v-on:click="zoomByFactor(0.8)" elevation="1"
                        color="white">
                    </CompactButton>
                </span>
                <v-btn-toggle class="mr-4" v-model="showNodes" color="dark" multiple density="compact" elevation="1"
                    @click="plot(true)">
                    <v-btn icon="mdi-water-outline" v-tippy="'Show selected publications as nodes'" value="selected"
                        class="has-text-primary"></v-btn>
                    <v-btn icon="mdi-water-plus-outline" v-tippy="'Show suggested publications as nodes'"
                        value="suggested" class="has-text-info">
                    </v-btn>
                    <v-btn icon="mdi-chevron-double-up" v-tippy="'Show boost keywords as nodes'" value="keyword"
                        class="has-text-warning-40"></v-btn>
                    <v-btn icon="mdi-account" v-tippy="'Show authors as nodes'" value="author"
                        class="has-text-grey-dark">
                    </v-btn>
                </v-btn-toggle>
                <span>
                    <v-menu :close-on-content-click="false">
                        <template v-slot:activator="{ props }">
                            <CompactButton icon="mdi-cog" v-tippy="'Visualization settings'" elevation="1" color="white"
                                v-bind="props"></CompactButton>
                        </template>
                        <v-list>
                            <v-list-item prepend-icon="mdi-filter">
                                <v-checkbox v-model="onlyShowFiltered" label="Only show filtered"
                                    :disabled="!sessionStore.filter.hasActiveFilters()" @update:modelValue="plot(true)"
                                    hide-details class="mt-0"></v-checkbox>
                            </v-list-item>
                            <v-list-item prepend-icon="mdi-water-plus-outline">
                                <v-list-item-title>Number of <b>suggested</b> shown</v-list-item-title>
                                <v-slider v-model="suggestedNumberFactor" :max="1" :min="0.1" step="0.05"
                                    @update:modelValue="plot(true)" />
                            </v-list-item>
                            <v-list-item prepend-icon="mdi-account">
                                <v-list-item-title>Number of <b>authors</b> shown</v-list-item-title>
                                <v-slider v-model="authorNumberFactor" :max="2" :min="0.1" step="0.1"
                                    @update:modelValue="plot(true)" />
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </span>
            </div>
        </div>
    </div>
</template>

<script>
import * as d3 from "d3";
import "tippy.js/dist/tippy.css";
import { storeToRefs } from "pinia";

// Stores
import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";

// Force simulation
import { useNetworkSimulation } from "@/composables/useNetworkSimulation.js";
import { calculateYearX, SIMULATION_ALPHA, getNodeXPosition } from "@/composables/networkForces.js";

// Node types
import {
    initializePublicationNodes,
    updatePublicationNodes
} from "@/composables/publicationNodes.js";
import {
    initializeKeywordNodes,
    updateKeywordNodes,
    releaseKeywordPosition,
    highlightKeywordPublications,
    clearKeywordHighlight,
    createKeywordNodeDrag
} from "@/composables/keywordNodes.js";
import {
    initializeAuthorNodes,
    updateAuthorNodes,
    highlightAuthorPublications,
    clearAuthorHighlight
} from "@/composables/authorNodes.js";

// Links
import {
    updateNetworkLinks,
    updateLinkProperties
} from "@/composables/networkLinks.js";

// Graph data management
import {
    initializeGraphData
} from "@/composables/useGraphData.js";

// Year labels
import {
    updateYearLabels
} from "@/composables/useYearLabels.js";

export default {
    name: "NetworkVisComponent",
    setup() {
        const sessionStore = useSessionStore();
        const { filter, activePublication } = storeToRefs(sessionStore);
        const interfaceStore = useInterfaceStore();
        const { isNetworkClusters } = storeToRefs(interfaceStore);

        // Initialize network simulation composable
        const networkSimulation = useNetworkSimulation();

        return {
            sessionStore,
            filter,
            activePublication,
            interfaceStore,
            isNetworkClusters,
            networkSimulation,
        };
    },
    data: function () {
        return {
            svg: null,
            svgWidth: Number,
            svgHeight: Number,
            node: null,
            link: null,
            label: null,
            zoom: null,
            showNodes: ["selected", "suggested", "keyword", "author"],
            errorMessage: "",
            errorTimer: null,
            suggestedNumberFactor: 0.3,
            authorNumberFactor: 0.5,
            onlyShowFiltered: false,
        };
    },
    computed: {
        showSelectedNodes: function () {
            return this.showNodes.includes("selected");
        },
        showSuggestedNodes: function () {
            return this.showNodes.includes("suggested");
        },
        showKeywordNodes: function () {
            return this.showNodes.includes("keyword");
        },
        showAuthorNodes: function () {
            return this.showNodes.includes("author");
        },
    },
    watch: {
        isNetworkClusters: {
            handler: function () {
                this.plot(true);
            },
        },
        filter: {
            deep: true,
            handler: function () {
                // Update "only show filtered" based on filter state
                if (!this.sessionStore.filter.hasActiveFilters()) {
                    this.onlyShowFiltered = false;
                } else {
                    this.onlyShowFiltered = true;
                }
                this.plot(true);
            },
        },
        activePublication: {
            handler: function () {
                if (this.interfaceStore.isLoading)
                    return;
                this.plot();
            },
        },
    },
    mounted() {
        const that = this;
        const container = document.getElementById("network-svg-container");
        this.svgWidth = container.clientWidth;
        // if not mobile set height to 1/5 of width to make assumption that aspect ratio is 5:1
        this.svgHeight = this.interfaceStore.isMobile
            ? container.clientHeight
            : this.svgWidth / 5;
        // set viewbox to center
        d3.select("#network-svg").attr("viewBox", `${-this.svgWidth / 2} ${-this.svgHeight / 2} ${this.svgWidth} ${this.svgHeight}`);
        // eslint-disable-next-line no-unused-vars
        this.zoom = d3.zoom().on("zoom", (event, d) => {
            that.svg.attr("transform", event.transform);
        });
        this.svg = d3.select("#network-svg").call(this.zoom).select("g");
        this.label = this.svg.append("g").attr("class", "labels").selectAll("text");
        this.link = this.svg.append("g").attr("class", "links").selectAll("path");
        this.node = this.svg.append("g").attr("class", "nodes").selectAll("rect");

        // Initialize simulation using composable
        this.networkSimulation.initializeSimulation({
            svgWidth: this.svgWidth,
            svgHeight: this.svgHeight,
            isMobile: this.interfaceStore.isMobile,
            isNetworkClusters: this.isNetworkClusters,
            selectedPublicationsCount: this.sessionStore.selectedPublications.length,
            tickHandler: this.tick
        });

        // Set initial state of "only show filtered" based on whether filters are active
        this.onlyShowFiltered = this.sessionStore.filter.hasActiveFilters();

        this.sessionStore.$onAction(({ name, after }) => {
            after(() => {
                if (name === "updateScores") {
                    this.plot(true);
                }
                else if ((!this.interfaceStore.isLoading && name === "clear") ||
                    name === "hasUpdated") {
                    this.plot();
                }
            });
        });
    },
    methods: {
        plot: function (restart) {

            if (this.networkSimulation.isDragging.value)
                return;
            try {
                // Update simulation configuration
                this.networkSimulation.updateSimulation({
                    svgWidth: this.svgWidth,
                    svgHeight: this.svgHeight,
                    isMobile: this.interfaceStore.isMobile,
                    isNetworkClusters: this.isNetworkClusters,
                    selectedPublicationsCount: this.sessionStore.selectedPublications.length,
                    tickHandler: this.tick
                });

                initGraph.call(this);
                updateNodes.call(this);
                this.link = updateNetworkLinks(
                    this.link,
                    this.networkSimulation.graph.value.links
                );
                this.label = updateYearLabels(
                    this.label,
                    this.sessionStore.publicationsFiltered?.length > 0,
                    this.sessionStore.yearMin,
                    this.sessionStore.yearMax,
                    !this.sessionStore.isEmpty && !this.isNetworkClusters,
                    this.yearX,
                    this.svgHeight
                );

                // Update graph data in simulation
                this.networkSimulation.updateGraphData(this.networkSimulation.graph.value.nodes, this.networkSimulation.graph.value.links);

                if (restart) {
                    this.networkSimulation.restart(SIMULATION_ALPHA);
                } else {
                    this.networkSimulation.start();
                }
            }
            catch (error) {
                console.error("Cannot plot network: " + error.message);
                this.errorMessage = "Sorry, an error occurred while plotting the citation network.";
                if (this.errorTimer) {
                    clearTimeout(this.errorTimer);
                }
                this.errorTimer = setTimeout(() => {
                    this.errorMessage = "";
                }, 10000);
            }


            function initGraph() {
                // Initialize complete graph data using composable
                const graphData = initializeGraphData(this);

                // Update component state
                this.doiToIndex = graphData.doiToIndex;
                this.filteredAuthors = graphData.filteredAuthors;

                // Update simulation graph data
                this.networkSimulation.graph.value.nodes = graphData.nodes;
                this.networkSimulation.graph.value.links = graphData.links;
            }

            function updateNodes() {
                this.node = this.node
                    .data(this.networkSimulation.graph.value.nodes, (d) => d.id)
                    .join((enter) => {
                        const g = enter
                            .append("g")
                            .attr("class", (d) => `node-container ${d.type}`);

                        // Initialize publication nodes using module
                        initializePublicationNodes(g, this.activatePublication, (publication, isHovered) => this.sessionStore.hoverPublication(publication, isHovered));

                        // Initialize keyword nodes using module
                        initializeKeywordNodes(g, this.keywordNodeDrag, this.keywordNodeClick, this.onKeywordNodeMouseover, this.onKeywordNodeMouseout);

                        // Initialize author nodes using module
                        initializeAuthorNodes(g, this.onAuthorNodeMouseover, this.onAuthorNodeMouseout, this.authorNodeClick);

                        return g;
                    });
                try {
                    // Update publication nodes using module
                    const publicationResult = updatePublicationNodes(this.node, this.sessionStore.activePublication, this.publicationTooltips);
                    this.publicationTooltips = publicationResult.tooltips;
                }
                catch (error) {
                    throw new Error("Cannot update publication nodes in network: " + error.message);
                }
                try {
                    // Update keyword nodes using module
                    const keywordResult = updateKeywordNodes(this.node, this.sessionStore.activePublication, this.keywordTooltips);
                    this.keywordTooltips = keywordResult.tooltips;
                }
                catch (error) {
                    throw new Error("Cannot update keyword nodes in network: " + error.message);
                }
                try {
                    // Update author nodes using module
                    const authorResult = updateAuthorNodes(this.node, this.sessionStore.activePublication, this.authorTooltips);
                    this.authorTooltips = authorResult.tooltips;
                }
                catch (error) {
                    throw new Error("Cannot update author nodes in network: " + error.message);
                }
                // Old helper functions removed - now handled by modules
            }
        },
        tick: function () {
            // Update link properties using module
            updateLinkProperties(this.link, (d) => getNodeXPosition(d, this.isNetworkClusters, this.yearX), this.sessionStore.activePublication);

            // Update node positions
            this.node.attr("transform", (d) => `translate(${getNodeXPosition(d, this.isNetworkClusters, this.yearX)}, ${d.y})`);
        },
        keywordNodeDrag: function () {
            return createKeywordNodeDrag(this.networkSimulation, SIMULATION_ALPHA);
        },
        keywordNodeClick: function (event, d) {
            releaseKeywordPosition(event, d, this.networkSimulation, SIMULATION_ALPHA);
        },
        onKeywordNodeMouseover: function (event, d) {
            highlightKeywordPublications(d, this.sessionStore.publicationsFiltered);
            this.plot();
        },
        onKeywordNodeMouseout: function () {
            clearKeywordHighlight(this.sessionStore.publicationsFiltered);
            this.plot();
        },
        onAuthorNodeMouseover: function (event, d) {
            highlightAuthorPublications(d, this.sessionStore.publicationsFiltered);
            this.plot();
        },
        onAuthorNodeMouseout: function () {
            clearAuthorHighlight(this.sessionStore.publicationsFiltered);
            this.plot();
        },
        authorNodeClick: function (event, d) {
            this.interfaceStore.openAuthorModalDialog(d.author.id);
        },
        yearX: function (year) {
            return calculateYearX(year, this.svgWidth, this.svgHeight, this.interfaceStore.isMobile);
        },
        activatePublication: function (event, d) {
            this.sessionStore.activatePublicationComponentByDoi(d.publication.doi);
            event.stopPropagation();
        },
        toggleMode() {
            this.isNetworkClusters = !this.isNetworkClusters;
        },
        expandNetwork(isNetworkExpanded) {
            this.interfaceStore.isNetworkExpanded = isNetworkExpanded;
        },
        zoomByFactor(factor) {
            const transform = d3.zoomTransform(this.svg.node());
            transform.k = transform.k * factor;
            this.svg.attr("transform", transform);
        },
    },
};
</script>

<style lang="scss">
.network-of-references {

    & .box {
        height: 100%;
        display: grid;
        grid-template-rows: max-content auto;
        position: relative;

        & ul.publication-component-list {
            position: absolute;
            bottom: 1vw;
            left: 1vw;
            width: 50%;
            max-width: 50rem;
            min-width: 40rem;
            background: white;
        }

        & .controls-header-left {
            position: absolute;
            top: calc(1vw + 2.5rem);
            left: 1vw;
        }

        & .controls-footer-right {
            position: absolute;
            bottom: max(1vw, 1rem);
            right: max(1vw, 1rem);
            z-index: 1;
        }
    }
}

#network-svg-container {
    overflow: hidden;
}

#network-svg {
    background: white;
    width: 100%;
    height: 100%;

    & g:focus {
        outline: none;
    }

    & g.publication.node-container {
        cursor: pointer;

        & rect {
            cursor: pointer;
            stroke-width: 2;
            @include light-shadow-svg;
        }

        & circle {
            fill: var(--bulma-warning);
            stroke-width: 1f;
            @include light-shadow-svg;
        }

        & text {
            text-anchor: middle;
            dominant-baseline: middle;
            filter: drop-shadow(0px 0px 1px white);

            &.unread {
                fill: hsl(var(--bulma-info-h), var(--bulma-info-s), calc(var(--bulma-info-l) - 20%));
                font-weight: 1000;
            }

            &.labelQueuingForSelected,
            &.labelQueuingForExcluded {
                visibility: hidden;
                font-weight: 1000;
                stroke: white;
                stroke-width: 0.5;
            }
        }

        &.is-hovered {

            & rect,
            & circle {
                transform: scale(1.1);
            }
        }

        &.selected {

            & rect,
            & circle {
                stroke: var(--bulma-primary);
            }
        }

        &.suggested {

            & rect,
            & circle {
                stroke: var(--bulma-info);
            }
        }

        &.active rect {
            stroke-width: 6;
        }

        &.linkedToActive rect {
            stroke-width: 4;
        }

        &.non-active {
            opacity: 0.3;
        }

        &.is-keyword-hovered rect {
            filter: drop-shadow(0px 0px 10px var(--bulma-warning));
            stroke: hsl(var(--bulma-warning-h), var(--bulma-warning-s), calc(var(--bulma-warning-l) - 20%));
        }

        &.is-author-hovered rect {
            filter: drop-shadow(0px 0px 10px black);
            stroke: black;
        }

        &.queuingForSelected,
        &.queuingForExcluded {
            opacity: 0.5;
            filter: blur(0.5px);
        }

        &.queuingForSelected text.labelQueuingForSelected {
            visibility: visible;
            fill: hsl(var(--bulma-primary-h), var(--bulma-primary-s), calc(var(--bulma-primary-l) - 20%));
        }

        &.queuingForExcluded text.labelQueuingForExcluded {
            visibility: visible;
        }
    }

    & g.keyword.node-container {
        cursor: grab;

        & text {
            text-anchor: middle;
            transform: translate(0px, 4px);
            filter: drop-shadow(0px 0px 2px var(--bulma-warning));
        }

        &.fixed text {
            font-weight: 700;
        }

        &.linkedToActive text {
            text-decoration-line: underline;
        }

        &.non-active {
            opacity: 0.3;
        }

        &:hover text {
            transform: translate(0px, 3.5px) scale(1.1);
        }
    }

    & g.author.node-container {
        cursor: pointer;

        & circle {
            fill: black;
            @include light-shadow-svg;
        }

        & text {
            text-anchor: middle;
            dominant-baseline: middle;
            fill: white;
            font-size: 0.85rem;
            font-weight: 600;
            transform: translate(0px, 1px);

            &.long {
                font-size: 0.7rem;
            }

            &.very-long {
                font-size: 0.6rem;
            }
        }

        &.non-active {
            opacity: 0.3;
        }

        &:hover {
            & circle {
                transform: scale(1.1);
            }
        }
    }

    & path.citation {
        fill: none;
        stroke-width: 3;
        stroke: var(--bulma-primary);
        opacity: 0.15;

        &.external {
            stroke-width: 2;
            stroke: var(--bulma-info);
            opacity: 0.1;
        }

        &.active {
            opacity: 0.5;
        }

        &.non-active {
            opacity: 0.05;
        }
    }

    & path.keyword {
        fill: var(--bulma-warning);
        opacity: 0.2;

        &.active {
            opacity: 0.5;
        }

        &.non-active {
            opacity: 0.05;
        }
    }

    & path.author {
        opacity: 0.2;

        &.active {
            opacity: 0.5;
        }

        &.non-active {
            opacity: 0.05;
        }
    }
}

@media screen and (max-width: 1023px) {
    .network-of-references {
        padding: 0 !important;
    }

    .network-of-references .box {
        padding: 0.5rem;
    }

}
</style>