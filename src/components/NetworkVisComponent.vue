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
                                    :disabled="!sessionStore.filter.hasActiveFilters()"
                                    @update:modelValue="plot(true)" 
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
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import { storeToRefs } from "pinia";

import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";

const RECT_SIZE = 20;
const ENLARGE_FACTOR = 1.5;
const MARGIN = 50;
const SIMULATION_ALPHA = 0.5;
const CURRENT_YEAR = new Date().getFullYear();

export default {
    name: "NetworkVisComponent",
    setup() {
        const sessionStore = useSessionStore();
        const { filter, activePublication } = storeToRefs(sessionStore);
        const interfaceStore = useInterfaceStore();
        const { isNetworkClusters } = storeToRefs(interfaceStore);
        return {
            sessionStore,
            filter,
            activePublication,
            interfaceStore,
            isNetworkClusters,
        };
    },
    data: function () {
        return {
            graph: { nodes: [], links: [] },
            simulation: null,
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
        this.simulation = d3.forceSimulation();
        this.simulation.alphaDecay(0.015).alphaMin(0.01);
        this.label = this.svg.append("g").attr("class", "labels").selectAll("text");
        this.link = this.svg.append("g").attr("class", "links").selectAll("path");
        this.node = this.svg.append("g").attr("class", "nodes").selectAll("rect");
        this.isDragging = false;
        
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

            if (this.isDragging)
                return;
            try {
                initForces.call(this);
                initGraph.call(this);
                updateNodes.call(this);
                updateLinks.call(this);
                updateYearLabels.call(this);
                this.simulation.nodes(this.graph.nodes);
                this.simulation.force("link").links(this.graph.links);
                if (restart) {
                    this.simulation.alpha(SIMULATION_ALPHA);
                }
                this.simulation.restart();
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

            function initForces() {
                const that = this;
                this.simulation
                    .force("link", d3
                        .forceLink()
                        .id((d) => d.id)
                        .distance((d) => {
                            switch (d.type) {
                                case "citation":
                                    return (that.isNetworkClusters && d.internal) ? 1500 / that.sessionStore.selectedPublications.length : 10;
                                case "keyword":
                                    return 0;
                                case "author":
                                    return 0;
                            }
                        })
                        .strength((d) => {
                            const internalFactor = d.type === "citation" ? (d.internal ? 1 : 1.5)
                                : (d.type === "keyword" ? 0.5
                                    : 2.5); // author
                            const clustersFactor = that.isNetworkClusters ? 1 : 0.5;
                            return 0.05 * clustersFactor * internalFactor;
                        }))
                    .force("charge", d3
                        .forceManyBody()
                        .strength(Math.min(-200, -100 * Math.sqrt(that.sessionStore.selectedPublications.length))))
                    .force("x", d3
                        .forceX()
                        .x((d) => {
                            if (that.isNetworkClusters) {
                                return 0;
                            }
                            switch (d.type) {
                                case "publication":
                                    return this.yearX(d.publication.year);
                                case "keyword":
                                    return this.yearX(CURRENT_YEAR + 2);
                                default:
                                    return this.yearX((d.author.yearMax + d.author.yearMin) / 2);
                            }
                        })
                        .strength((d) => that.isNetworkClusters ? 0.05 : (d.type === "author" ? 0.2 : 10)))
                    .force("y", d3
                        .forceY()
                        .y(0)
                        .strength(that.isNetworkClusters ? 0.1 : 0.25))
                    .on("tick", this.tick);
            }

            function initGraph() {
                this.doiToIndex = {};
                const allAuthors = this.sessionStore.selectedPublicationsAuthors;
                this.filteredAuthors = allAuthors.slice(0, this.authorNumberFactor * this.sessionStore.selectedPublications.length);
                
                const nodes = initNodes.call(this);
                const links = initLinks.call(this);
                // https://observablehq.com/@d3/modifying-a-force-directed-graph
                const old = new Map(this.node.data().map((d) => [d.id, d]));
                this.graph.nodes = nodes.map((d) => Object.assign(old.get(d.id) || { x: 0, y: 0 }, d));
                this.graph.links = links.map((d) => Object.assign({}, d));

                function initNodes() {
                    let nodes = [];
                    let i = 0;

                    let publications = [];
                    if (this.showSelectedNodes) {
                        let selectedPubs = this.sessionStore.selectedPublications;
                        if (this.onlyShowFiltered && this.sessionStore.filter.hasActiveFilters() && this.sessionStore.filter.applyToSelected) {
                            selectedPubs = selectedPubs.filter(pub => this.sessionStore.filter.matches(pub));
                        }
                        publications = publications.concat(selectedPubs);
                    }
                    if (this.showSuggestedNodes) {
                        let suggestedPubs = this.sessionStore.suggestedPublications;
                        if (this.onlyShowFiltered && this.sessionStore.filter.hasActiveFilters() && this.sessionStore.filter.applyToSuggested) {
                            suggestedPubs = suggestedPubs.filter(pub => this.sessionStore.filter.matches(pub));
                        }
                        publications = publications.concat(suggestedPubs.slice(0, Math.round(this.suggestedNumberFactor * 50)));
                    }

                    publications.forEach((publication) => {
                        if (publication.year) {
                            this.doiToIndex[publication.doi] = i;
                            nodes.push({
                                id: publication.doi,
                                publication: publication,
                                isQueuingForSelected: this.sessionStore.isQueuingForSelected(publication.doi),
                                isQueuingForExcluded: this.sessionStore.isQueuingForExcluded(publication.doi),
                                type: "publication",
                            });
                            i++;
                        }
                    });
                    if (this.showKeywordNodes) {
                        this.sessionStore.uniqueBoostKeywords.forEach((keyword) => {
                            const frequency = this.sessionStore.publications.filter((publication) => publication.boostKeywords.includes(keyword)).length;
                            nodes.push({
                                id: keyword,
                                frequency: frequency,
                                type: "keyword"
                            });
                        });
                    }
                    if (this.showAuthorNodes) {
                        // Only show authors connected to currently displayed publications
                        const displayedDois = new Set(publications.map(pub => pub.doi));
                        this.filteredAuthors.forEach((author) => {
                            // Check if this author has any publications in the displayed set
                            const hasDisplayedPublications = author.publicationDois.some(doi => displayedDois.has(doi));
                            if (hasDisplayedPublications) {
                                nodes.push({
                                    id: author.id,
                                    author: author,
                                    type: "author",
                                });
                            }
                        });
                    }
                    return nodes;
                }

                function initLinks() {
                    const links = [];
                    if (this.showKeywordNodes) {
                        this.sessionStore.uniqueBoostKeywords.forEach((keyword) => {
                            this.sessionStore.publicationsFiltered.forEach((publication) => {
                                if (publication.doi in this.doiToIndex && publication.boostKeywords.includes(keyword)) {
                                    links.push({
                                        source: keyword,
                                        target: publication.doi,
                                        type: "keyword",
                                    });
                                }
                            });
                        });
                    }
                    this.sessionStore.selectedPublications.forEach((publication) => {
                        if (publication.doi in this.doiToIndex) {
                            publication.citationDois.forEach((citationDoi) => {
                                if (citationDoi in this.doiToIndex) {
                                    links.push({
                                        source: citationDoi,
                                        target: publication.doi,
                                        type: "citation",
                                        internal: this.sessionStore.isSelected(citationDoi),
                                    });
                                }
                            });
                            publication.referenceDois.forEach((referenceDoi) => {
                                if (referenceDoi in this.doiToIndex) {
                                    links.push({
                                        source: publication.doi,
                                        target: referenceDoi,
                                        type: "citation",
                                        internal: this.sessionStore.isSelected(referenceDoi),
                                    });
                                }
                            });
                        }
                    });
                    if (this.showAuthorNodes) {
                        this.filteredAuthors.forEach((author) => {
                            author.publicationDois
                                .forEach((publicationDoi) => {
                                    if (publicationDoi in this.doiToIndex) {
                                        links.push({
                                            source: author.id,
                                            target: publicationDoi,
                                            type: "author",
                                        });
                                    }
                                });
                        });
                    }
                    return links;
                }

            }

            function updateNodes() {
                this.node = this.node
                    .data(this.graph.nodes, (d) => d.id)
                    .join((enter) => {
                        const g = enter
                            .append("g")
                            .attr("class", (d) => `node-container ${d.type}`);

                        const publicationNodes = g.filter((d) => d.type === "publication");
                        publicationNodes
                            .append("rect")
                            .attr("pointer-events", "all")
                            .on("click", this.activatePublication)
                            .on("mouseover", (event, d) => this.sessionStore.hoverPublication(d.publication, true))
                            .on("mouseout", (event, d) => this.sessionStore.hoverPublication(d.publication, false));
                        publicationNodes
                            .append("text")
                            .classed("score", true)
                            .attr("pointer-events", "none");
                        publicationNodes
                            .append("text")
                            .classed("labelQueuingForSelected", true)
                            .attr("pointer-events", "none")
                            .attr("x", 15)
                            .attr("y", 15)
                            .text("+");
                        publicationNodes
                            .append("text")
                            .classed("labelQueuingForExcluded", true)
                            .attr("pointer-events", "none")
                            .attr("x", 15)
                            .attr("y", 15)
                            .text("-");
                        publicationNodes.append("circle");

                        const keywordNodes = g.filter((d) => d.type === "keyword");
                        keywordNodes.append("text");
                        keywordNodes
                            .call(this.keywordNodeDrag())
                            .on("click", this.keywordNodeClick)
                            .on("mouseover", this.keywordNodeMouseover)
                            .on("mouseout", this.keywordNodeMouseout);

                        const authorNodes = g.filter((d) => d.type === "author");
                        authorNodes
                            .append("circle")
                            .attr("pointer-events", "all")
                            .attr("r", 12)
                            .attr("fill", "black");
                        authorNodes.append("text")
                            .attr("pointer-events", "none");
                        authorNodes
                            .on("mouseover", this.authorNodeMouseover)
                            .on("mouseout", this.authorNodeMouseout)
                            .on("click", this.authorNodeClick);

                        return g;
                    });
                try {
                    updatePublicationNodes.call(this);
                }
                catch (error) {
                    throw new Error("Cannot update publication nodes in network: " + error.message);
                }
                try {
                    updateKeywordNodes.call(this);
                }
                catch (error) {
                    throw new Error("Cannot update keyword nodes in network: " + error.message);
                }
                try {
                    updateAuthorNodes.call(this);
                }
                catch (error) {
                    throw new Error("Cannot update author nodes in network: " + error.message);
                }
                function updatePublicationNodes() {
                    const publicationNodes = this.node.filter((d) => d.type === "publication");
                    publicationNodes
                        .classed("selected", (d) => d.publication.isSelected)
                        .classed("suggested", (d) => !d.publication.isSelected)
                        .classed("active", (d) => d.publication.isActive)
                        .classed("linkedToActive", (d) => d.publication.isLinkedToActive)
                        .classed("non-active", (d) => this.sessionStore.activePublication && !d.publication.isActive && !d.publication.isLinkedToActive)
                        .classed("queuingForSelected", (d) => d.isQueuingForSelected)
                        .classed("queuingForExcluded", (d) => d.isQueuingForExcluded)
                        .classed("is-hovered", (d) => d.publication.isHovered)
                        .classed("is-keyword-hovered", (d) => d.publication.isKeywordHovered)
                        .classed("is-author-hovered", (d) => d.publication.isAuthorHovered);
                    if (this.publicationTooltips)
                        this.publicationTooltips.forEach((tooltip) => tooltip.destroy());
                    publicationNodes.attr("data-tippy-content", (d) => `<b>${d.publication.title ? d.publication.title : "[unknown title]"}</b> (${d.publication.authorShort
                        ? d.publication.authorShort + ", "
                        : ""}${d.publication.year ? d.publication.year : "[unknown year]"})
              <br><br>
              The publication is <b>${d.publication.isSelected ? "selected" : "suggested"}</b>${d.isQueuingForSelected
                            ? " and marked to be added to selected publications"
                            : ""}${d.isQueuingForExcluded
                                ? " and marked to be added to excluded publications"
                                : ""}.`);
                    this.publicationTooltips = tippy(publicationNodes.nodes(), {
                        maxWidth: "min(400px,70vw)",
                        allowHTML: true,
                    });
                    publicationNodes
                        .select("rect")
                        .attr("width", (d) => getRectSize(d))
                        .attr("height", (d) => getRectSize(d))
                        .attr("x", (d) => -getRectSize(d) / 2)
                        .attr("y", (d) => -getRectSize(d) / 2)
                        .attr("stroke-width", (d) => (d.publication.isActive ? 4 : 3))
                        .attr("fill", (d) => d.publication.scoreColor);
                    publicationNodes
                        .select(".publication text.score")
                        .classed("unread", (d) => !d.publication.isRead && !d.publication.isSelected)
                        .attr("y", 1)
                        .attr("font-size", "0.8em")
                        .text((d) => d.publication.score);
                    publicationNodes
                        .select("circle")
                        .attr("cx", (d) => getRectSize(d) / 2 - 1)
                        .attr("cy", (d) => -getRectSize(d) / 2 + 1)
                        .attr("r", (d) => d.publication.boostFactor > 1 ? getBoostIndicatorSize(d) / 6 : 0)
                        .attr("stroke", "black");
                }
                function updateKeywordNodes() {
                    const keywordNodes = this.node.filter((d) => d.type === "keyword");
                    keywordNodes
                        .classed("linkedToActive", (d) => this.sessionStore.isKeywordLinkedToActive(d.id))
                        .classed("non-active", (d) => this.sessionStore.activePublication && !this.sessionStore.isKeywordLinkedToActive(d.id));
                    if (this.keywordTooltips)
                        this.keywordTooltips.forEach((tooltip) => tooltip.destroy());
                    keywordNodes.attr("data-tippy-content", (d) => `Keyword <b>${d.id}</b> is matched in <b>${d.frequency}</b> publication${d.frequency > 1 ? "s" : ""}${this.sessionStore.isKeywordLinkedToActive(d.id)
                        ? ", and also linked to the currently active publication"
                        : ""}.<br><br><i>Drag to reposition (sticky), click to detach.</i>`);
                    this.keywordTooltips = tippy(keywordNodes.nodes(), {
                        maxWidth: "min(400px,70vw)",
                        allowHTML: true,
                    });
                    keywordNodes
                        .select("text")
                        .attr("y", 1)
                        .attr("font-size", (d) => {
                            if (d.frequency >= 25)
                                return "1.1em";
                            if (d.frequency >= 10)
                                return "0.9em";
                            if (d.frequency >= 5)
                                return "0.8em";
                            return "0.7em";
                        })
                        .text((d) => {
                            if (d.id.includes("|")) {
                                return d.id.split("|")[0] + "|..";
                            }
                            return d.id;
                        });
                }
                function updateAuthorNodes() {
                    const authorNodes = this.node.filter((d) => d.type === "author");
                    authorNodes
                        .classed("linkedToActive", (d) => d.author.publicationDois.includes(this.sessionStore.activePublication?.doi))
                        .classed("non-active", (d) => this.sessionStore.activePublication && !d.author.publicationDois.includes(this.sessionStore.activePublication?.doi));
                    if (this.authorTooltips)
                        this.authorTooltips.forEach((tooltip) => tooltip.destroy());
                    authorNodes.attr("data-tippy-content", (d) => `<b>${d.author.name}</b> is linked 
                        to <b>${d.author.count}</b> selected publication${d.author.count > 1 ? "s" : ""}, 
                        published ${d.author.yearMin === d.author.yearMax
                            ? `in <b>${d.author.yearMin}</b>`
                            : `between <b>${d.author.yearMin}</b> and <b>${d.author.yearMax}</b>`},
                        with an aggregated, weighted score of <b>${d.author.score}</b>.               
                    `);
                    this.authorTooltips = tippy(authorNodes.nodes(), {
                        maxWidth: "min(400px,70vw)",
                        allowHTML: true,
                    });
                    authorNodes
                        .select("text")
                        .text((d) => d.author.initials)
                        .classed("long", (d) => d.author.initials.length > 2)
                        .classed("very-long", (d) => d.author.initials.length > 3);
                }
                function getRectSize(d) {
                    return RECT_SIZE * (d.publication.isActive ? ENLARGE_FACTOR : 1);
                }
                function getBoostIndicatorSize(d) {
                    let internalFactor = 1;
                    if (d.publication.boostFactor >= 8) {
                        internalFactor = 1.8;
                    }
                    else if (d.publication.boostFactor >= 4) {
                        internalFactor = 1.5;
                    }
                    else if (d.publication.boostFactor > 1) {
                        internalFactor = 1.2;
                    }
                    return getRectSize(d) * internalFactor * 0.8;
                }
            }

            function updateLinks() {
                this.link = this.link
                    .data(this.graph.links, (d) => [d.source, d.target])
                    .join("path");
            }

            function updateYearLabels() {
                if (this.sessionStore.publicationsFiltered.length === 0)
                    return;
                const yearRange = Array.from(
                    { length: this.sessionStore.yearMax - this.sessionStore.yearMin + 6 },
                    (_, i) => this.sessionStore.yearMin - 4 + i
                ).filter((year) => year % 5 === 0);
                this.label = this.label
                    .data(yearRange, (d) => d)
                    .join((enter) => {
                        const g = enter.append("g");
                        g.append("rect");
                        g.append("text");
                        g.append("text");
                        return g;
                    });
                this.label
                    .selectAll("rect")
                    .attr("width", (d) => this.yearX(Math.min(d + 5, CURRENT_YEAR)) - this.yearX(d))
                    .attr("height", 20000)
                    .attr("fill", (d) => d % 10 === 0 ? "#fafafa" : "white")
                    .attr("x", -24)
                    .attr("y", -10000);
                this.label
                    .selectAll("text")
                    .attr("text-anchor", "middle")
                    .text((d) => d)
                    .attr("fill", "grey");
                this.label
                    .selectAll("text, rect")
                    .attr("visibility", !this.sessionStore.isEmpty && !this.isNetworkClusters
                        ? "visible"
                        : "hidden");
                if (!this.sessionStore.isEmpty) {
                    this.label
                        .attr("transform", (d) => `translate(${this.yearX(d)},${this.svgHeight / 2 - MARGIN})`)
                        .select("text")
                        .attr("y", -this.svgHeight + 2 * MARGIN);
                }
            }
        },
        tick: function () {
            this.link
                .attr("d", (d) => {
                    const dx = this.nodeX(d.target) - this.nodeX(d.source);
                    const dy = d.target.y - d.source.y;
                    // curved link for citations
                    if (d.type === "citation") {
                        const dr = Math.pow(dx * dx + dy * dy, 0.6);
                        return `M${this.nodeX(d.target)},${d.target.y}A${dr},${dr} 0 0,1 ${this.nodeX(d.source)},${d.source.y}`;
                    }
                    // tapered links for keywords:
                    // drawing a triangle as part of a circle segment with its center at the target node
                    const r = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                    const alpha = Math.acos(dx / r);
                    const beta = 2 / r;
                    const x1 = r * Math.cos(alpha + beta);
                    let y1 = r * Math.sin(alpha + beta);
                    const x2 = r * Math.cos(alpha - beta);
                    let y2 = r * Math.sin(alpha - beta);
                    if (d.source.y > d.target.y) {
                        y1 = -y1;
                        y2 = -y2;
                    }
                    return `M${this.nodeX(d.target) - x1},${d.target.y - y1}
            L${this.nodeX(d.target)},${d.target.y}
            L${this.nodeX(d.target) - x2},${d.target.y - y2}`;
                })
                .attr("class", (d) => {
                    const classes = [d.type];
                    if (d.type === "citation") {
                        if (this.sessionStore.activePublication) {
                            if (d.source.publication.isActive || d.target.publication.isActive)
                                classes.push("active");
                            else {
                                classes.push("non-active");
                            }
                        }
                        if (!(d.source.publication.isSelected &&
                            d.target.publication.isSelected))
                            classes.push("external");
                    } else if (d.type === "keyword") {
                        if (this.sessionStore.activePublication) {
                            if (d.target.publication.isActive)
                                classes.push("active");
                            else {
                                classes.push("non-active");
                            }
                        }
                    } else if (d.type === "author") {
                        if (this.sessionStore.activePublication) {
                            if (d.target.publication.isActive)
                                classes.push("active");
                            else {
                                classes.push("non-active");
                            }
                        }
                    }
                    return classes.join(" ");
                });
            this.node.attr("transform", (d) => `translate(${this.nodeX(d)}, ${d.y})`);
        },
        keywordNodeDrag: function () {
            const that = this;
            function dragStart() {
                d3.select(this).classed("fixed", true);
                that.isDragging = true;
            }
            function dragMove(event, d) {
                d.fx = event.x;
                d.fy = event.y;
                that.simulation.alpha(SIMULATION_ALPHA).restart();
            }
            function dragEnd() {
                that.isDragging = false;
            }
            return d3
                .drag()
                .on("start", dragStart)
                .on("drag", dragMove)
                .on("end", dragEnd);
        },
        keywordNodeClick: function (event, d) {
            delete d.fx;
            delete d.fy;
            d3.select(event.target.parentNode).classed("fixed", false);
            this.simulation.alpha(SIMULATION_ALPHA).restart();
        },
        keywordNodeMouseover: function (event, d) {
            this.sessionStore.publicationsFiltered.forEach((publication) => {
                if (publication.boostKeywords.includes(d.id)) {
                    publication.isKeywordHovered = true;
                }
            });
            this.plot();
        },
        keywordNodeMouseout: function () {
            this.sessionStore.publicationsFiltered.forEach((publication) => {
                publication.isKeywordHovered = false;
            });
            this.plot();
        },
        authorNodeMouseover: function (event, d) {
            this.sessionStore.publicationsFiltered.forEach((publication) => {
                if (d.author.publicationDois.includes(publication.doi)) {
                    publication.isAuthorHovered = true;
                }
            });
            this.plot();
        },
        authorNodeMouseout: function () {
            this.sessionStore.publicationsFiltered.forEach((publication) => {
                publication.isAuthorHovered = false;
            });
            this.plot();
        },
        authorNodeClick: function (event, d) {
            this.interfaceStore.openAuthorModalDialog(d.author.id);
        },
        yearX: function (year) {
            const width = Math.max(this.svgWidth, 2 * this.svgHeight);
            return ((year - CURRENT_YEAR) * width * 0.03 +
                width * (this.interfaceStore.isMobile ? 0.05 : 0.3));
        },
        nodeX: function (d) {
            if (this.isNetworkClusters) {
                return d.x;
            } else {
                switch (d.type) {
                    case "publication":
                        return this.yearX(d.publication.year);
                    case "keyword":
                        return this.yearX(CURRENT_YEAR + 2);
                    default:
                        return d.x;
                }
            }
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