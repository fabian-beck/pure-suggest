<template>
  <div class="network-of-references">
    <div class="box has-background-grey">
      <div class="level">
        <div class="level-left has-text-white">
          <div
            class="level-item"
            data-tippy-content="Showing publications as nodes (<b class='has-text-primary'>selected</b>; <b class='has-text-info'>suggested</b>) with citations as links.<br><br>You can click a publication for details as well as zoom and pan the diagram."
            v-tippy
          >
            <b-icon icon="chart-bubble"></b-icon>
            <h2 class="is-size-5 ml-2">Citation network</h2>
          </div>
        </div>
        <div class="level-right" v-show="!sessionStore.isEmpty">
          <b-field
            class="level-item has-text-white mr-4 mb-0"
            data-tippy-content="There are two display <span class='key'>m</span>odes:<br><br><b>Timeline:</b> The diagram places publications from left to right based on year, and vertically tries to group linked publications close to each other.<br><br><b>Clusters:</b> The diagram groups linked publications close to each other, irrespective of publication year."
            v-tippy
          >
            <label class="mr-2"><span class="key">M</span>ode:</label>
            <label
              class="mr-2"
              :class="{ 'has-text-grey-light': isNetworkClusters }"
            >
              Timeline</label
            >
            <b-switch
              v-model="isNetworkClusters"
              type="is-dark"
              passive-type="is-dark"
              @click.native.stop=""
            ></b-switch>
            <label :class="{ 'has-text-grey-light': !isNetworkClusters }"
              >Clusters</label
            >
          </b-field>
          <b-button
            class="level-item compact-button is-hidden-touch"
            icon-right="arrow-expand"
            data-tippy-content="Expand diagram"
            v-tippy
            v-show="!interfaceStore.isNetworkExpanded"
            @click.stop="expandNetwork(true)"
          ></b-button>
          <b-button
            class="level-item compact-button is-hidden-touch"
            icon-right="arrow-collapse"
            data-tippy-content="Collapse diagram"
            v-tippy
            v-show="interfaceStore.isNetworkExpanded"
            @click.stop="expandNetwork(false)"
          ></b-button>
        </div>
      </div>
      <div id="network-svg-container">
        <svg id="network-svg">
          <g></g>
        </svg>
      </div>
      <ul class="publication-component-list">
        <PublicationComponent
          v-if="activePublication && interfaceStore.isNetworkExpanded"
          :publication="activePublication"
          :is-active="true"
        ></PublicationComponent>
      </ul>
      <div class="controls-footer">
        <button
          class="button has-background-primary has-text-white"
          @click="sessionStore.updateQueued"
          v-show="sessionStore.isUpdatable && interfaceStore.isNetworkExpanded"
          id="quick-access-update"
        >
          <b-icon icon="update" size="is-small"></b-icon>
          <div class="button-label">Update</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import _ from "lodash";
import { storeToRefs } from "pinia";

import PublicationComponent from "./PublicationComponent.vue";

import { useSessionStore } from "./../stores/session.js";
import { useInterfaceStore } from "./../stores/interface.js";

const RECT_SIZE = 20;
const ENLARGE_FACTOR = 1.5;
const margin = 20;
const SIMULATION_ALPHA = 0.4;

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
  components: {
    PublicationComponent,
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
    };
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
        this.plot(true);
      },
    },
    activePublication: {
      handler: function () {
        if (this.interfaceStore.isLoading) return;
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
    d3.select("#network-svg").attr(
      "viewBox",
      `${-this.svgWidth / 2} ${-this.svgHeight / 2} ${this.svgWidth} ${
        this.svgHeight
      }`
    );

    this.svg = d3
      .select("#network-svg")
      .call(
        // eslint-disable-next-line no-unused-vars
        d3.zoom().on("zoom", (event, d) => {
          that.svg.attr("transform", event.transform);
        })
      )
      .select("g");

    this.simulation = d3.forceSimulation();
    this.simulation.alphaDecay(0.02);

    this.label = this.svg.append("g").attr("class", "labels").selectAll("text");
    this.link = this.svg.append("g").attr("class", "links").selectAll("path");
    this.node = this.svg.append("g").attr("class", "nodes").selectAll("rect");

    this.isDragging = false;

    this.sessionStore.$onAction(({ name, after }) => {
      after(() => {
        if (name === "updateScores") {
          this.plot(true);
        } else if (
          (!this.interfaceStore.isLoading && name === "clear") ||
          name === "hasUpdated"
        ) {
          this.plot();
        }
      });
    });
  },
  methods: {
    initForces: function () {
      const that = this;
      this.simulation
        .force(
          "link",
          d3
            .forceLink()
            .id((d) => d.id)
            .distance((d) => {
              if (that.isNetworkClusters && d.internal)
                return 500 / that.sessionStore.selectedPublications.length;
              if (d.type === "keyword") return 0;
              return 10;
            })
            .strength((d) => {
              const internalFactor = d.internal ? 1 : 0.5;
              const clustersFactor = that.isNetworkClusters ? 1 : 0.5;
              return 0.15 * clustersFactor * internalFactor;
            })
        )
        .force(
          "charge",
          d3
            .forceManyBody()
            .strength(
              Math.min(
                -200,
                -100 * Math.sqrt(that.sessionStore.selectedPublications.length)
              )
            )
        )
        .force(
          "x",
          d3
            .forceX()
            .x((d) =>
              that.isNetworkClusters
                ? 0
                : this.yearX(d.publication ? d.publication.year : 2025)
            )
            .strength(that.isNetworkClusters ? 0.05 : 10)
        )
        .force(
          "y",
          d3
            .forceY()
            .y(0)
            .strength(that.isNetworkClusters ? 0.1 : 0.25)
        )
        .on("tick", this.tick);
    },

    plot: function (restart) {
      if (this.isDragging) return;

      try {
        console.log(
          `Plotting citation network ${
            restart ? "with" : "without"
          } restarting layout computation.`
        );

        this.initForces();

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
      } catch (error) {
        console.error("Cannot plot network: " + error.message);
        this.interfaceStore.showErrorMessage(
          "Sorry, an error occurred while plotting the citation network."
        );
      }

      function initGraph() {
        this.doiToIndex = {};
        const nodes = initNodes.call(this);
        const links = initLinks.call(this);
        // https://observablehq.com/@d3/modifying-a-force-directed-graph
        const old = new Map(this.node.data().map((d) => [d.id, d]));
        this.graph.nodes = nodes.map((d) =>
          Object.assign(old.get(d.id) || { x: this.svgWidth / 2, y: 0 }, d)
        );
        this.graph.links = links.map((d) => Object.assign({}, d));
      }

      function initNodes() {
        const publicationNodes = [];
        let i = 0;
        this.sessionStore.publicationsFiltered.forEach((publication) => {
          if (publication.year) {
            this.doiToIndex[publication.doi] = i;
            publicationNodes.push({
              id: publication.doi,
              publication: publication,
              isQueuingForSelected: this.sessionStore.isQueuingForSelected(
                publication.doi
              ),
              isQueuingForExcluded: this.sessionStore.isQueuingForExcluded(
                publication.doi
              ),
            });
            i++;
          }
        });

        const keywordNodes = [];
        this.sessionStore.uniqueBoostKeywords.forEach((keyword) => {
          const frequency = this.sessionStore.publications.filter(
            (publication) => publication.boostKeywords.includes(keyword)
          ).length;
          keywordNodes.push({
            id: keyword,
            frequency: frequency,
          });
        });

        const nodes = publicationNodes.concat(keywordNodes);
        return nodes;
      }

      function initLinks() {
        const links = [];

        this.sessionStore.uniqueBoostKeywords.forEach((keyword) => {
          this.sessionStore.publicationsFiltered.forEach((publication) => {
            if (publication.boostKeywords.includes(keyword)) {
              links.push({
                source: keyword,
                target: publication.doi,
                type: "keyword",
              });
            }
          });
        });

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

        return links;
      }

      function updateNodes() {
        this.node = this.node
          .data(this.graph.nodes, (d) => d.id)
          .join((enter) => {
            const g = enter
              .append("g")
              .attr(
                "class",
                (d) =>
                  `node-container ${d.publication ? "publication" : "keyword"}`
              );

            const publicationNodes = g.filter((d) => d.publication);
            publicationNodes
              .append("rect")
              .attr("pointer-events", "all")
              .on("click", this.activatePublication)
              .on("mouseover", (event, d) =>
                this.sessionStore.hoverPublication(d.publication, true)
              )
              .on("mouseout", (event, d) =>
                this.sessionStore.hoverPublication(d.publication, false)
              );
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

            const keywordNodes = g.filter((d) => !d.publication);
            keywordNodes.append("text");
            keywordNodes
              .call(this.keywordNodeDrag())
              .on("click", this.keywordNodeClick)
              .on("mouseover", this.keywordNodeMouseover)
              .on("mouseout", this.keywordNodeMouseout);
            return g;
          });

        try {
          updatePublicationNodes.call(this);
        } catch (error) {
          throw new Error(
            "Cannot update publication nodes in network: " + error.message
          );
        }

        try {
          updateKeywordNodes.call(this);
        } catch (error) {
          throw new Error(
            "Cannot update keyword nodes in network: " + error.message
          );
        }

        function updatePublicationNodes() {
          const publicationNodes = this.node.filter((d) => d.publication);

          publicationNodes
            .classed("selected", (d) => d.publication.isSelected)
            .classed("suggested", (d) => !d.publication.isSelected)
            .classed("active", (d) => d.publication.isActive)
            .classed("linkedToActive", (d) => d.publication.isLinkedToActive)
            .classed("queuingForSelected", (d) => d.isQueuingForSelected)
            .classed("queuingForExcluded", (d) => d.isQueuingForExcluded)
            .classed("is-hovered", (d) => d.publication.isHovered)
            .classed("isKeywordHovered", (d) => d.publication.isKeywordHovered);

          if (this.publicationTooltips)
            this.publicationTooltips.forEach((tooltip) => tooltip.destroy());
          publicationNodes.attr(
            "data-tippy-content",
            (d) =>
              `<b>${
                d.publication.title ? d.publication.title : "[unknown title]"
              }</b> (${
                d.publication.authorShort
                  ? d.publication.authorShort + ", "
                  : ""
              }${d.publication.year ? d.publication.year : "[unknown year]"})
              <br><br>
              The publication is ${
                d.publication.isSelected ? "selected" : "suggested"
              }${
                d.isQueuingForSelected
                  ? " and marked to be added to selected publications"
                  : ""
              }${
                d.isQueuingForExcluded
                  ? " and marked to be added to excluded publications"
                  : ""
              }.`
          );
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
            .classed(
              "unread",
              (d) => !d.publication.isRead && !d.publication.isSelected
            )
            .attr("y", 1)
            .attr("font-size", "0.8em")
            .text((d) => d.publication.score);

          publicationNodes
            .select("circle")
            .attr("cx", (d) => getRectSize(d) / 2 - 1)
            .attr("cy", (d) => -getRectSize(d) / 2 + 1)
            .attr("r", (d) =>
              d.publication.boostFactor > 1 ? getBoostIndicatorSize(d) / 6 : 0
            )
            .attr("stroke", "black");
        }

        function updateKeywordNodes() {
          const keywordNodes = this.node.filter((d) => !d.publication);

          keywordNodes.classed("linkedToActive", (d) =>
            this.sessionStore.isKeywordLinkedToActive(d.id)
          );

          if (this.keywordTooltips)
            this.keywordTooltips.forEach((tooltip) => tooltip.destroy());
          keywordNodes.attr(
            "data-tippy-content",
            (d) =>
              `Keyword "${d.id}" is matched in ${d.frequency} publication${
                d.frequency > 1 ? "s" : ""
              }${
                this.sessionStore.isKeywordLinkedToActive(d.id)
                  ? ", and also linked to the currently active publication"
                  : ""
              }.<br><br>Drag to reposition (sticky), click to detach.`
          );
          this.keywordTooltips = tippy(keywordNodes.nodes(), {
            maxWidth: "min(400px,70vw)",
            allowHTML: true,
          });

          keywordNodes
            .select("text")
            .attr("y", 1)
            .attr("font-size", (d) => {
              if (d.frequency >= 25) return "1.1em";
              if (d.frequency >= 10) return "0.9em";
              if (d.frequency >= 5) return "0.8em";
              return "0.7em";
            })
            .text((d) => {
              if (d.id.includes("|")) {
                return d.id.split("|")[0] + "|..";
              }
              return d.id;
            });
        }

        function getRectSize(d) {
          return RECT_SIZE * (d.publication.isActive ? ENLARGE_FACTOR : 1);
        }

        function getBoostIndicatorSize(d) {
          let internalFactor = 1;
          if (d.publication.boostFactor >= 8) {
            internalFactor = 1.8;
          } else if (d.publication.boostFactor >= 4) {
            internalFactor = 1.5;
          } else if (d.publication.boostFactor > 1) {
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
        if (this.sessionStore.publicationsFiltered.length === 0) return;
        const yearRange = _.range(
          this.sessionStore.yearMin - 4,
          this.sessionStore.yearMax + 1
        ).filter((year) => year % 5 === 0);
        this.label = this.label
          .data(yearRange, (d) => d)
          .join((enter) => {
            const g = enter.append("g");
            g.append("text");
            g.append("text");
            return g;
          });

        this.label
          .selectAll("text")
          .attr("text-anchor", "middle")
          .attr(
            "visibility",
            !this.sessionStore.isEmpty && !this.isNetworkClusters
              ? "visible"
              : "hidden"
          )
          .text((d) => d)
          .attr("fill", "grey");

        if (!this.sessionStore.isEmpty) {
          this.label
            .attr(
              "transform",
              (d) =>
                `translate(${this.yearX(d)},${this.svgHeight / 2 - margin})`
            )
            .select("text")
            .attr("y", -this.svgHeight + 2 * margin);
        }
      }
    },

    tick: function () {
      this.link
        .attr("d", (d) => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          // curved link for citations
          if (d.type === "citation") {
            const dr = Math.pow(dx * dx + dy * dy, 0.6);
            return `M${d.target.x},${d.target.y}A${dr},${dr} 0 0,1 ${d.source.x},${d.source.y}`;
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
          return `M${d.target.x - x1},${d.target.y - y1}
            L${d.target.x},${d.target.y}
            L${d.target.x - x2},${d.target.y - y2}`;
        })
        .attr("class", (d) => {
          const classes = [d.type];
          if (d.type === "citation") {
            if (d.source.publication.isActive || d.target.publication.isActive)
              classes.push("active");
            if (
              !(
                d.source.publication.isSelected &&
                d.target.publication.isSelected
              )
            )
              classes.push("external");
          }
          return classes.join(" ");
        });

      this.node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
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

    yearX: function (year) {
      return (
        ((year - this.sessionStore.yearMin) /
          Math.sqrt(
            1 + this.sessionStore.yearMax - this.sessionStore.yearMin
          )) *
          this.svgWidth *
          0.15 -
        this.svgWidth / 2
      );
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
  },
};
</script>

<style lang="scss">
.network-of-references .box {
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

  & .controls-footer {
    position: absolute;
    bottom: 1vw;
    right: 1vw;
  }
}

#network-svg-container {
  overflow: hidden;
}

#network-svg {
  background: white;
  width: 100%;
  height: 100%;
  @include inset-shadow;

  & g.publication.node-container {
    cursor: pointer;

    & rect {
      cursor: pointer;
      stroke-width: 2;
      @include light-shadow-svg;
    }

    & circle {
      fill: $warning;
      stroke-width: 1f;
      @include light-shadow-svg;
    }

    & text {
      text-anchor: middle;
      dominant-baseline: middle;
      filter: drop-shadow(0px 0px 1px white);

      &.unread {
        fill: $info-dark;
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
        stroke: $primary;
      }
    }
    &.suggested {
      & rect,
      & circle {
        stroke: $info;
      }
    }
    &.active rect {
      stroke-width: 6;
    }
    &.linkedToActive rect {
      stroke-width: 4;
    }

    &.isKeywordHovered rect {
      @include warning-shadow-svg;
    }

    &.queuingForSelected,
    &.queuingForExcluded {
      opacity: 0.5;
      filter: blur(0.5px);
    }

    &.queuingForSelected text.labelQueuingForSelected {
      visibility: visible;
      fill: $primary-dark;
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
      filter: drop-shadow(0px 0px 2px $warning);
      text-transform: lowercase;
    }

    &.fixed text {
      font-weight: 700;
    }

    &.linkedToActive text {
      text-decoration-line: underline;
    }

    &:hover text {
      transform: translate(0px, 3.5px) scale(1.1);
    }
  }

  & path.citation {
    fill: none;
    stroke-width: 3;
    stroke: #00000010;

    &.external {
      stroke: #00000006;
      stroke-width: 2;
    }

    &.active {
      stroke: #000000aa;
      stroke-dasharray: 15 5;

      &.external {
        stroke: #00000066;
      }
    }
  }
  & path.keyword {
    fill: $warning;
    opacity: 0.2;
  }
}

@include touch {
  .network-of-references {
    padding: 0 !important;
  }
  .network-of-references .box {
    padding: 0.5rem;
  }
}
</style>