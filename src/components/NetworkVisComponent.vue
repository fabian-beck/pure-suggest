<template>
    <div class="network-of-references">
        <div class="box has-background-grey">
            <NetworkHeader :errorMessage="errorMessage" v-model:isNetworkClusters="isNetworkClusters"
                @expandNetwork="expandNetwork" @collapseNetwork="collapseNetwork" @restoreNetwork="restoreNetwork" />
            <div id="network-svg-container" v-show="!interfaceStore.isNetworkCollapsed">
                <NetworkPerformanceMonitor ref="performanceMonitor" :show="interfaceStore.showPerformancePanel"
                    :isEmpty="isEmpty || !sessionStore.selectedPublications?.length" :nodeCount="graph.nodes.length"
                    :linkCount="graph.links.length" :shouldSkipEarlyTicks="shouldSkipEarlyTicks"
                    :skipEarlyTicks="skipEarlyTicks" />
                <svg id="network-svg" :class="networkCssClasses">
                    <g></g>
                </svg>
            </div>
            <ul class="publication-component-list" v-show="!interfaceStore.isNetworkCollapsed">
                <PublicationComponent v-if="activePublication && interfaceStore.isNetworkExpanded"
                    :publication="activePublication" :is-active="true"
                    :publicationType="activePublication.isSelected ? 'selected' : 'suggested'"></PublicationComponent>
            </ul>
            <div class="controls-header-left" v-show="!interfaceStore.isNetworkCollapsed">
                <v-btn class="has-background-primary has-text-white" @click="updateQueued"
                    v-show="queueStore.isUpdatable && interfaceStore.isNetworkExpanded" id="quick-access-update">
                    <v-icon left>mdi-update</v-icon>
                    <span class="key">U</span>pdate
                </v-btn>
            </div>
            <NetworkControls v-model:showNodes="showNodes" v-model:onlyShowFiltered="onlyShowFiltered"
                v-model:suggestedNumberFactor="suggestedNumberFactor" v-model:authorNumberFactor="authorNumberFactor"
                @zoom="zoomByFactor" @reset="resetZoom" @plot="plot" v-show="!interfaceStore.isNetworkCollapsed" />
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
import { useQueueStore } from "@/stores/queue.js";
import { useAuthorStore } from "@/stores/author.js";
import { useAppState } from "@/composables/useAppState.js";

// Force simulation utilities
import {
    createForceSimulation,
    initializeForces,
    calculateYearX,
    SIMULATION_ALPHA,
    getNodeXPosition
} from "@/utils/network/forces.js";

// Node types
import {
    initializePublicationNodes,
    updatePublicationNodes
} from "@/utils/network/publicationNodes.js";
import {
    initializeKeywordNodes,
    updateKeywordNodes,
    releaseKeywordPosition,
    highlightKeywordPublications,
    clearKeywordHighlight,
    createKeywordNodeDrag,
    createKeywordLinks
} from "@/utils/network/keywordNodes.js";
import {
    initializeAuthorNodes,
    updateAuthorNodes,
    highlightAuthorPublications,
    clearAuthorHighlight,
    createAuthorLinks
} from "@/utils/network/authorNodes.js";

// Links
import {
    updateNetworkLinks,
    updateLinkProperties,
    createCitationLinks
} from "@/utils/network/links.js";

// Additional node utilities
import { createPublicationNodes } from "@/utils/network/publicationNodes.js";
import { createKeywordNodes } from "@/utils/network/keywordNodes.js";
import { createAuthorNodes } from "@/utils/network/authorNodes.js";

// Year labels
import { updateYearLabels } from "@/utils/network/yearLabels.js";

// Components
import NetworkControls from "@/components/NetworkControls.vue";
import NetworkHeader from "@/components/NetworkHeader.vue";
import NetworkPerformanceMonitor from "@/components/NetworkPerformanceMonitor.vue";

export default {
    name: "NetworkVisComponent",
    components: {
        NetworkControls,
        NetworkHeader,
        NetworkPerformanceMonitor
    },
    setup() {
        const sessionStore = useSessionStore();
        const { filter, activePublication } = storeToRefs(sessionStore);
        const interfaceStore = useInterfaceStore();
        const { isNetworkClusters } = storeToRefs(interfaceStore);
        const queueStore = useQueueStore();
        const authorStore = useAuthorStore();
        const { isEmpty, activatePublicationComponentByDoi, updateQueued } = useAppState();

        return {
            sessionStore,
            filter,
            activePublication,
            interfaceStore,
            isNetworkClusters,
            queueStore,
            authorStore,
            isEmpty,
            activatePublicationComponentByDoi,
            updateQueued
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
            // D3 simulation state (moved from useNetworkSimulation)
            simulation: null,
            isDragging: false,
            graph: { nodes: [], links: [] },
            // Position change detection for performance optimization
            positionThreshold: 1, // pixels - minimum movement to trigger DOM update
            lastUpdateTime: 0,
            skipEarlyTicks: 50, // Skip DOM updates for first N ticks
            shouldSkipEarlyTicks: false, // Only skip when truly restarted with high alpha
            // X position caching for performance optimization
            nodeXPositionsCache: new Map(), // Cache X positions to avoid redundant calculations
            // Reactive tick count for CSS animation control
            currentTickCount: 0, // Synchronized with performance monitor
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

        networkCssClasses: function () {
            // Check if we should show fading animation during early tick skipping
            if (this.shouldSkipEarlyTicks && this.currentTickCount <= this.skipEarlyTicks) {
                return 'network-fading';
            } else {
                return 'network-visible';
            }
        },
    },
    watch: {
        isNetworkClusters: {
            handler: function () {
                console.log(`[NETWORK PLOT] isNetworkClusters changed to: ${this.isNetworkClusters}`);
                // Skip plotting during loading to prevent premature network rendering
                if (this.interfaceStore.isLoading) {
                    console.log(`[NETWORK PLOT] Skipping plot() - interface is loading`);
                    return;
                }
                this.plot(true);
            },
        },
        filter: {
            deep: true,
            handler: function () {
                console.log(`[NETWORK PLOT] filter changed, hasActiveFilters: ${this.sessionStore.filter.hasActiveFilters()}`);
                // Update "only show filtered" based on filter state
                if (!this.sessionStore.filter.hasActiveFilters()) {
                    this.onlyShowFiltered = false;
                } else {
                    this.onlyShowFiltered = true;
                }
                // Skip plotting during loading to prevent premature network rendering
                if (this.interfaceStore.isLoading) {
                    console.log(`[NETWORK PLOT] Skipping plot() - interface is loading`);
                    return;
                }
                this.plot(true);
            },
        },
        activePublication: {
            handler: function () {
                console.log(`[NETWORK PLOT] activePublication changed to: ${this.activePublication?.doi || 'none'}`);
                if (this.interfaceStore.isLoading) {
                    console.log(`[NETWORK PLOT] Skipping plot() - interface is loading`);
                    return;
                }
                this.plot();
            },
        },
        'interfaceStore.networkReplotTrigger': {
            handler: function (newValue, oldValue) {
                console.log(`[NETWORK PLOT] networkReplotTrigger changed from ${oldValue} to ${newValue}, showAuthorNodes: ${this.showAuthorNodes}`);
                // Only replot if author nodes are visible and the trigger value changed
                if (newValue !== oldValue && this.showAuthorNodes) {
                    console.log(`[NETWORK PLOT] Triggering replot due to networkReplotTrigger`);
                    this.$nextTick(() => {
                        // Trigger a full replot with force simulation restart
                        this.plot(true);
                    });
                } else {
                    console.log(`[NETWORK PLOT] Skipping replot - trigger unchanged or author nodes not visible`);
                }
            }
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

        // Initialize D3 simulation
        this.initializeSimulation({
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
                if (!this.interfaceStore.isLoading && name === "clear") {
                    console.log(`[NETWORK PLOT] Calling plot() due to sessionStore action: ${name}`);
                    this.plot();
                }
            });
        });
    },
    beforeUnmount() {
        // Cleanup D3 simulation (moved from useNetworkSimulation)
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }

    },
    methods: {
        plot: function (restart) {
            // Log every plot() call with stack trace to identify the source
            const stack = new Error().stack;
            const caller = stack.split('\n')[2]?.trim() || 'unknown caller';
            console.log(`[NETWORK PLOT] plot(restart=${restart}) called from: ${caller}`);
            console.log(`[NETWORK PLOT] State: isDragging=${this.isDragging}, isCollapsed=${this.interfaceStore.isNetworkCollapsed}, isEmpty=${this.isEmpty}, selectedCount=${this.sessionStore.selectedPublications?.length || 0}`);

            if (this.isDragging) {
                console.log(`[NETWORK PLOT] Skipping plot() - currently dragging`);
                return;
            }

            // Skip plotting when network is collapsed for performance
            if (this.interfaceStore.isNetworkCollapsed) {
                console.log(`[NETWORK PLOT] Skipping plot() - network is collapsed`);
                return;
            }

            // Early return if app state is empty - no need to run simulation
            if (this.isEmpty || !this.sessionStore.selectedPublications?.length) {
                console.log(`[NETWORK PLOT] Clearing visualization - empty state`);
                this.stop(); // Stop any running simulation
                this.clearExistingVisualization(); // Clear any existing network elements
                this.resetOptimizationMetrics();
                return;
            }

            console.log(`[NETWORK PLOT] Starting plot execution...`);

            try {
                console.log(`[NETWORK PLOT] Updating simulation configuration...`);
                // Update simulation configuration
                this.updateSimulation({
                    svgWidth: this.svgWidth,
                    svgHeight: this.svgHeight,
                    isMobile: this.interfaceStore.isMobile,
                    isNetworkClusters: this.isNetworkClusters,
                    selectedPublicationsCount: this.sessionStore.selectedPublications.length,
                    tickHandler: this.tick
                });

                console.log(`[NETWORK PLOT] Initializing graph...`);
                initGraph.call(this);

                console.log(`[NETWORK PLOT] Updating nodes...`);
                updateNodes.call(this);

                console.log(`[NETWORK PLOT] Updating links...`);
                this.link = updateNetworkLinks(
                    this.link,
                    this.graph.links
                );

                // Update year labels
                const hasPublications = this.sessionStore.publicationsFiltered?.length > 0;
                const shouldShow = !this.isEmpty && !this.isNetworkClusters;
                console.log(`[NETWORK PLOT] Updating year labels (hasPublications: ${hasPublications}, shouldShow: ${shouldShow})...`);

                this.label = updateYearLabels(
                    this.label,
                    hasPublications,
                    this.sessionStore.yearMin,
                    this.sessionStore.yearMax,
                    shouldShow,
                    this.yearX,
                    this.svgHeight
                );

                console.log(`[NETWORK PLOT] Updating graph data with ${this.graph.nodes.length} nodes and ${this.graph.links.length} links...`);
                // Update graph data in simulation
                this.updateGraphData(this.graph.nodes, this.graph.links);

                // Reset position tracking and optimization metrics when plot is called
                this.resetOptimizationMetrics();

                if (restart) {
                    console.log(`[NETWORK PLOT] Restarting simulation with alpha=${SIMULATION_ALPHA}...`);
                    this.restart(SIMULATION_ALPHA);
                } else {
                    console.log(`[NETWORK PLOT] Starting simulation...`);
                    this.start();
                }

                console.log(`[NETWORK PLOT] Plot execution completed successfully`);
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
                // Initialize DOI to index mapping
                const doiToIndex = {};

                // Filter authors based on factor
                const allAuthors = this.authorStore.selectedPublicationsAuthors || [];
                const filteredAuthors = allAuthors.slice(0, this.authorNumberFactor * this.sessionStore.selectedPublications.length);

                // Get filtered publications
                let publications = [];

                if (this.showSelectedNodes) {
                    let selectedPubs = this.sessionStore.selectedPublications || [];
                    if (this.onlyShowFiltered && this.sessionStore.filter.hasActiveFilters() && this.sessionStore.filter.applyToSelected) {
                        selectedPubs = selectedPubs.filter(pub => this.sessionStore.filter.matches(pub));
                    }
                    publications = publications.concat(selectedPubs);
                }

                if (this.showSuggestedNodes) {
                    let suggestedPubs = this.sessionStore.suggestedPublications || [];
                    if (this.onlyShowFiltered && this.sessionStore.filter.hasActiveFilters() && this.sessionStore.filter.applyToSuggested) {
                        suggestedPubs = suggestedPubs.filter(pub => this.sessionStore.filter.matches(pub));
                    }
                    publications = publications.concat(suggestedPubs.slice(0, Math.round(this.suggestedNumberFactor * 50)));
                }

                // Create nodes
                let nodes = [];

                // Create publication nodes
                const publicationNodes = createPublicationNodes(
                    publications,
                    doiToIndex,
                    this.queueStore.selectedQueue || [],
                    this.queueStore.excludedQueue || []
                );
                nodes = nodes.concat(publicationNodes);

                // Create keyword nodes
                if (this.showKeywordNodes) {
                    const keywordNodes = createKeywordNodes(this.sessionStore.uniqueBoostKeywords || [], this.sessionStore.publications || []);
                    nodes = nodes.concat(keywordNodes);
                }

                // Create author nodes
                if (this.showAuthorNodes) {
                    const authorNodes = createAuthorNodes(filteredAuthors, publications);
                    nodes = nodes.concat(authorNodes);
                }

                // Create links
                const links = [];

                // Create keyword links
                if (this.showKeywordNodes) {
                    const keywordLinks = createKeywordLinks(this.sessionStore.uniqueBoostKeywords || [], publications, doiToIndex);
                    links.push(...keywordLinks);
                }

                // Create citation links
                const citationLinks = createCitationLinks(this.sessionStore.selectedPublications || [], this.sessionStore.isSelected || (() => false), doiToIndex);
                links.push(...citationLinks);

                // Create author links
                if (this.showAuthorNodes) {
                    const authorLinks = createAuthorLinks(filteredAuthors, publications, doiToIndex);
                    links.push(...authorLinks);
                }

                // Store nodes and links for later processing (after updateNodes initializes this.node)
                this.tempNodes = nodes;
                this.tempLinks = links.map((d) => Object.assign({}, d));

                // Update component state
                this.doiToIndex = doiToIndex;
                this.filteredAuthors = filteredAuthors;
            }

            function updateNodes() {
                // Preserve existing node positions for smooth transitions
                const existingNodeData = (this.node && typeof this.node.data === 'function') ? this.node.data() : null;
                const processedNodes = this.preserveNodePositions(this.tempNodes, existingNodeData);
                const processedLinks = this.tempLinks;

                // Update simulation graph data
                this.graph.nodes = processedNodes;
                this.graph.links = processedLinks;

                this.node = this.node
                    .data(this.graph.nodes, (d) => d.id)
                    .join((enter) => {
                        const g = enter
                            .append("g")
                            .attr("class", (d) => `node-container ${d.type}`);

                        // Initialize publication nodes using module
                        initializePublicationNodes(g, this.activatePublication, (publication, isHovered) => {
                            if (isHovered) {
                                this.interfaceStore.setHoveredPublication(publication);
                            } else {
                                this.interfaceStore.setHoveredPublication(null);
                            }
                            this.updatePublicationHighlighting();
                        });

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
            // Skip when network is collapsed for performance
            if (this.interfaceStore.isNetworkCollapsed) {
                return;
            }

            // Early return if graph is empty - no nodes to update
            if (!this.graph.nodes || this.graph.nodes.length === 0) {
                this.$refs.performanceMonitor?.trackFps(); // Still track FPS for debugging
                return;
            }

            // Increment tick counter
            this.$refs.performanceMonitor?.incrementTick();
            // Synchronize local tick count for CSS animation reactivity
            this.currentTickCount = this.$refs.performanceMonitor?.tickCount || 0;

            // Skip DOM updates for first N ticks only if this is a true restart with high alpha
            if (this.shouldSkipEarlyTicks && this.$refs.performanceMonitor?.tickCount <= this.skipEarlyTicks) {
                this.$refs.performanceMonitor?.trackFps(); // Still track FPS for debugging
                return;
            }

            // Disable skipping after the skip period
            if (this.shouldSkipEarlyTicks && this.$refs.performanceMonitor?.tickCount > this.skipEarlyTicks) {
                this.shouldSkipEarlyTicks = false;
            }

            // Skip every second DOM update tick for performance (but not when dragging)
            if (!this.isDragging && this.currentTickCount % 2 === 0) {
                this.$refs.performanceMonitor?.recordTickSkipped();
                this.$refs.performanceMonitor?.trackFps(); // Still track FPS for debugging
                return;
            }

            // Pre-compute X positions for all nodes (major performance optimization)
            this.cacheNodeXPositions();

            // Check which nodes have moved significantly and get the changed nodes
            const changedNodes = this.detectChangedNodes();

            // Only update positions of changed nodes (not all nodes)
            if (changedNodes.length > 0) {
                this.updateChangedNodePositions(changedNodes);
                const linksUpdated = this.updateSelectiveLinks(changedNodes);
                this.lastUpdateTime = performance.now();

                // Track performance metrics - only count actual DOM updates
                this.$refs.performanceMonitor?.recordDomUpdate(changedNodes.length, linksUpdated);
            } else {
                // No nodes moved significantly, but we still processed the tick
                this.$refs.performanceMonitor?.recordSkippedUpdate();
            }

            // FPS tracking (always track for debugging)
            this.$refs.performanceMonitor?.trackFps();
        },
        keywordNodeDrag: function () {
            return createKeywordNodeDrag(this, SIMULATION_ALPHA);
        },
        keywordNodeClick: function (event, d) {
            releaseKeywordPosition(event, d, this, SIMULATION_ALPHA);
        },
        onKeywordNodeMouseover: function (event, d) {
            highlightKeywordPublications(d, this.sessionStore.publicationsFiltered || []);
            this.updatePublicationHighlighting();
        },
        onKeywordNodeMouseout: function () {
            clearKeywordHighlight(this.sessionStore.publicationsFiltered || []);
            this.updatePublicationHighlighting();
        },
        onAuthorNodeMouseover: function (event, d) {
            highlightAuthorPublications(d, this.sessionStore.publicationsFiltered || []);
            this.updatePublicationHighlighting();
        },
        onAuthorNodeMouseout: function () {
            clearAuthorHighlight(this.sessionStore.publicationsFiltered || []);
            this.updatePublicationHighlighting();
        },
        authorNodeClick: function (event, d) {
            this.interfaceStore.openAuthorModalDialog(d.author.id);
        },
        yearX: function (year) {
            return calculateYearX(year, this.svgWidth, this.svgHeight, this.interfaceStore.isMobile);
        },
        activatePublication: function (event, d) {
            this.activatePublicationComponentByDoi(d.publication.doi);
            event.stopPropagation();
        },
        toggleMode() {
            this.isNetworkClusters = !this.isNetworkClusters;
        },
        expandNetwork(isNetworkExpanded) {
            this.interfaceStore.isNetworkExpanded = isNetworkExpanded;
        },
        collapseNetwork() {
            this.interfaceStore.collapseNetwork();
        },
        restoreNetwork() {
            console.log(`[NETWORK PLOT] restoreNetwork() called - triggering plot with restart`);
            this.interfaceStore.restoreNetwork();
            // Trigger a plot update when restoring from collapsed state
            // to ensure the network is up to date
            this.$nextTick(() => {
                this.plot(true);
            });
        },
        zoomByFactor(factor) {
            const transform = d3.zoomTransform(this.svg.node());
            transform.k = transform.k * factor;
            this.svg.attr("transform", transform);
        },
        resetZoom() {
            const svg = d3.select("#network-svg");
            const transform = d3.zoomIdentity;
            svg.transition().duration(750).call(this.zoom.transform, transform);
        },
        preserveNodePositions(newNodes, existingNodeData) {
            if (!existingNodeData || typeof existingNodeData.map !== 'function') {
                // If no existing data, return nodes with default positions
                return newNodes.map((d) => Object.assign({ x: 0, y: 0 }, d));
            }

            const oldPositions = new Map(existingNodeData.map((d) => [d.id, d]));
            return newNodes.map((d) => Object.assign(oldPositions.get(d.id) || { x: 0, y: 0 }, d));
        },

        // D3 Simulation methods (moved from useNetworkSimulation)
        initializeSimulation(config) {
            const {
                svgWidth,
                svgHeight,
                isMobile,
                isNetworkClusters,
                selectedPublicationsCount,
                tickHandler
            } = config;

            const yearXCalculator = (year) => calculateYearX(year, svgWidth, svgHeight, isMobile);

            this.simulation = createForceSimulation({
                isNetworkClusters,
                selectedPublicationsCount,
                yearXCalculator,
                tickHandler
            });

            return this.simulation;
        },

        updateSimulation(config) {
            if (!this.simulation) return;

            const {
                svgWidth,
                svgHeight,
                isMobile,
                isNetworkClusters,
                selectedPublicationsCount,
                tickHandler
            } = config;

            const yearXCalculator = (year) => calculateYearX(year, svgWidth, svgHeight, isMobile);

            initializeForces(this.simulation, {
                isNetworkClusters,
                selectedPublicationsCount,
                yearXCalculator,
                tickHandler
            });
        },

        updateGraphData(nodes, links) {
            this.graph.nodes = nodes;
            this.graph.links = links;

            if (this.simulation) {
                this.simulation.nodes(nodes);
                const linkForce = this.simulation.force("link");
                if (linkForce && linkForce.links) {
                    linkForce.links(links);
                }
            }
        },

        restart(alpha = SIMULATION_ALPHA) {
            if (this.simulation && !this.isDragging) {
                // Only skip early ticks if this is a true restart with high alpha (> 0.3)
                if (alpha > 0.3) {
                    this.$refs.performanceMonitor?.resetMetrics();
                    this.currentTickCount = 0; // Reset local tick count
                    this.shouldSkipEarlyTicks = true;
                } else {
                    this.shouldSkipEarlyTicks = false;
                }

                this.simulation.alpha(alpha).restart();
            }
        },

        start() {
            if (this.simulation) {
                // start() is just resuming, don't skip ticks
                this.shouldSkipEarlyTicks = false;

                this.simulation.restart();
            }
        },

        stop() {
            if (this.simulation) {
                this.simulation.stop();
            }
        },

        setDragging(dragging) {
            this.isDragging = dragging;
        },


        // Position change detection methods
        detectChangedNodes() {
            if (!this.graph.nodes || this.graph.nodes.length === 0) {
                return [];
            }

            const changedNodes = [];

            // Check each node for significant position changes
            for (const node of this.graph.nodes) {
                // Get cached X position (major performance optimization)
                const currentX = this.getCachedNodeX(node);
                const currentY = node.y || 0;

                // Initialize last positions if not set
                if (node._lastDisplayX === undefined || node._lastDisplayY === undefined) {
                    node._lastDisplayX = currentX;
                    node._lastDisplayY = currentY;
                    changedNodes.push(node); // First render
                    continue;
                }

                // Calculate movement distance
                const deltaX = Math.abs(currentX - node._lastDisplayX);
                const deltaY = Math.abs(currentY - node._lastDisplayY);

                // Check if movement exceeds threshold
                if (deltaX > this.positionThreshold || deltaY > this.positionThreshold) {
                    changedNodes.push(node);
                    // Update last positions
                    node._lastDisplayX = currentX;
                    node._lastDisplayY = currentY;
                }
            }

            return changedNodes;
        },

        resetPositionTracking() {
            if (this.graph.nodes) {
                this.graph.nodes.forEach(node => {
                    delete node._lastDisplayX;
                    delete node._lastDisplayY;
                });
            }
        },

        resetOptimizationMetrics() {
            this.$refs.performanceMonitor?.resetMetrics(); // Reset performance metrics
            this.currentTickCount = 0; // Reset local tick count
            this.shouldSkipEarlyTicks = false; // Reset skip flag
            this.nodeXPositionsCache.clear(); // Clear X position cache
            this.resetPositionTracking();
        },

        // X position caching optimization methods
        cacheNodeXPositions() {
            // Pre-compute X positions for all nodes to avoid redundant calculations
            this.nodeXPositionsCache.clear();
            for (const node of this.graph.nodes) {
                const xPos = getNodeXPosition(node, this.isNetworkClusters, this.yearX);
                this.nodeXPositionsCache.set(node.id, xPos);
            }
        },

        getCachedNodeX(node) {
            // Get cached X position, fallback to calculation if not cached
            const cached = this.nodeXPositionsCache.get(node.id);
            if (cached !== undefined) {
                return cached;
            }
            // Fallback (should rarely happen)
            const xPos = getNodeXPosition(node, this.isNetworkClusters, this.yearX);
            this.nodeXPositionsCache.set(node.id, xPos);
            return xPos;
        },

        clearExistingVisualization() {
            // Clear all existing network elements from the DOM
            try {
                if (this.node) {
                    this.node.remove();
                }
                if (this.link) {
                    this.link.remove();
                }
                if (this.label) {
                    this.label.remove();
                }

                // Clear graph data
                this.graph = { nodes: [], links: [] };

                // Clear the SVG container
                if (this.svg && typeof this.svg.select === 'function') {
                    this.svg.select("g").selectAll("*").remove();
                }

                // Reinitialize empty D3 selections (same as mounted hook)
                if (this.svg) {
                    this.label = this.svg.append("g").attr("class", "labels").selectAll("text");
                    this.link = this.svg.append("g").attr("class", "links").selectAll("path");
                    this.node = this.svg.append("g").attr("class", "nodes").selectAll("rect");
                }

            } catch (error) {
                console.warn("Error clearing visualization:", error.message);
                // Ensure clean state even if clearing fails
                this.graph = { nodes: [], links: [] };
                // Try to reinitialize basic selections
                if (this.svg) {
                    try {
                        this.label = this.svg.append("g").attr("class", "labels").selectAll("text");
                        this.link = this.svg.append("g").attr("class", "links").selectAll("path");
                        this.node = this.svg.append("g").attr("class", "nodes").selectAll("rect");
                    } catch (reinitError) {
                        console.warn("Could not reinitialize D3 selections:", reinitError.message);
                    }
                }
            }
        },

        updateChangedNodePositions(changedNodes) {
            if (!changedNodes.length) return;

            // Create a Set of changed node IDs for fast lookup
            const changedNodeIds = new Set(changedNodes.map(node => node.id));

            // Filter nodes that have changed and update only their positions
            const changedNodeSelection = this.node.filter(function (d) {
                return changedNodeIds.has(d.id);
            });

            // Update positions of only the changed nodes
            // In timeline mode: use simulation x-position for author nodes (force attraction), 
            // calculated x-position for publication/keyword nodes (strict positioning)
            changedNodeSelection.attr("transform", (d) => `translate(${this.getNodeDisplayX(d)}, ${d.y})`);
        },

        updateSelectiveLinks(changedNodes) {
            if (!changedNodes.length) return 0;

            // Create a Set of changed node IDs for fast lookup
            const changedNodeIds = new Set(changedNodes.map(node => node.id));

            // Filter links that are connected to any changed node
            const affectedLinks = this.link.filter(function (d) {
                return changedNodeIds.has(d.source.id) || changedNodeIds.has(d.target.id);
            });

            // Update only the affected links using appropriate X positions
            updateLinkProperties(
                affectedLinks,
                (d) => this.getNodeDisplayX(d),
                this.sessionStore.activePublication
            );

            // Return how many links were updated
            return affectedLinks.size();
        },

        /**
         * Get the appropriate X position for display, respecting force simulation for author nodes in timeline mode
         */
        getNodeDisplayX(node) {
            if (!this.isNetworkClusters && node.type === "author") {
                // Use simulation x-position for author nodes in timeline mode (force attraction)
                return node.x || 0;
            }
            // Use calculated x-position for other nodes (strict positioning)
            return this.getCachedNodeX(node);
        },

        /**
         * Lightweight method to update only publication node highlighting without full re-render.
         * This avoids expensive plot() calls and simulation restarts for pure visual highlighting.
         */
        updatePublicationHighlighting() {
            // Only update publication node highlighting if nodes exist
            if (this.node) {
                this.node
                    .filter(d => d.type === "publication")
                    .classed("is-hovered", d => this.interfaceStore.hoveredPublication === d.publication.doi)
                    .classed("is-keyword-hovered", d => d.publication.isKeywordHovered)
                    .classed("is-author-hovered", d => d.publication.isAuthorHovered);
            }
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
    }
}

#network-svg-container {
    overflow: hidden;
    position: relative;
}


/* Network fade during early tick skipping */
.network-fading {
    opacity: 0.1;
    transition: opacity 0.3s ease-out;
}

.network-visible {
    opacity: 1;
    transition: opacity 0.5s ease-in;
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
                animation: node-pulse 2s ease-in-out infinite;
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
                animation: author-node-pulse 2s ease-in-out infinite;
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

@keyframes node-pulse {

    0%,
    100% {
        transform: scale(0.9);
    }

    50% {
        transform: scale(1.15);
    }
}

@keyframes author-node-pulse {

    0%,
    100% {
        transform: scale(0.9);
    }

    50% {
        transform: scale(1.15);
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