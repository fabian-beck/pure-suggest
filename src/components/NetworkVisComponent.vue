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
            @click.stop="interfaceStore.isNetworkExpanded = true"
          ></b-button>
          <b-button
            class="level-item compact-button is-hidden-touch"
            icon-right="arrow-collapse"
            data-tippy-content="Collapse diagram"
            v-tippy
            v-show="interfaceStore.isNetworkExpanded"
            @click.stop="interfaceStore.isNetworkExpanded = false"
          ></b-button>
        </div>
      </div>
      <div id="network-svg-container">
        <svg id="network-svg" width="100%" height="100%" />
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

import { useSessionStore } from "./../stores/session.js";
import { useInterfaceStore } from "./../stores/interface.js";

const RECT_SIZE = 20;
const ENLARGE_FACTOR = 1.5;
const margin = 20;

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
      svgHeight: Number,
      svgWidth: Number,
      yearMin: Number,
      yearMax: Number,
      node: null,
      link: null,
      label: null,
    };
  },
  watch: {
    isNetworkClusters: {
      handler: function () {
        this.initForces();
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
    this.svgHeight = container.clientHeight;

    this.svg = d3
      .select("#network-svg")
      .call(
        // eslint-disable-next-line no-unused-vars
        d3.zoom().on("zoom", (event, d) => {
          that.svg.attr("transform", event.transform);
        })
      )
      .append("g");

    this.simulation = d3.forceSimulation();
    this.simulation.alphaDecay(0.02);

    this.initForces();

    this.label = this.svg.append("g").attr("class", "labels").selectAll("text");

    this.link = this.svg.append("g").attr("class", "links").selectAll("path");

    this.node = this.svg.append("g").attr("class", "nodes").selectAll("rect");

    this.sessionStore.$onAction(({ name, after }) => {
      after(() => {
        if (
          name === "updateSuggestions" ||
          name === "queueForSelected" ||
          name === "queueForExcluded" ||
          name === "updateScores"
        )
          this.plot(true);
        else if (!this.interfaceStore.isLoading && name === "clear")
          this.plot();
      });
    });
  },
  methods: {
    initForces: function () {
      console.log("Initializing general forces for citation network.");
      const that = this;
      this.simulation
        .force(
          "link",
          d3
            .forceLink()
            .id((d) => d.id)
            .distance(50)
            .strength(!that.isNetworkClusters ? 0.08 : 0.15)
        )
        .force("charge", d3.forceManyBody().strength(-180))
        .force(
          "x",
          d3
            .forceX()
            .x((d) => this.yearX(d.publication ? d.publication.year : 2025))
            .strength(!that.isNetworkClusters ? 10 : 0)
        )
        .force(
          "y",
          d3
            .forceY()
            .y(0.5 * (that.svgHeight - RECT_SIZE))
            .strength(!that.isNetworkClusters ? 0.25 : 0.1)
        )
        .on("tick", this.tick);
    },

    plot: function (restart) {
      console.log(
        `Plotting citation network ${
          restart ? "with" : "without"
        } restarting layout computation.`
      );
      function getRectSize(d) {
        return RECT_SIZE * (d.publication.isActive ? ENLARGE_FACTOR : 1);
      }

      function getBoostIndicatorSize(d) {
        let factor = 1;
        if (d.publication.boostFactor >= 8) {
          factor = 2;
        } else if (d.publication.boostFactor >= 4) {
          factor = 1.6;
        } else if (d.publication.boostFactor > 1) {
          factor = 1.3;
        }
        return getRectSize(d) * factor * 0.8;
      }

      const doiToIndex = {};
      this.yearMin = 3000;
      this.yearMax = 0;

      const publicationNodes = [];
      let i = 0;
      this.sessionStore.publicationsFiltered.forEach((publication) => {
        if (publication.year) {
          this.yearMin = Math.min(this.yearMin, publication.year);
          this.yearMax = Math.max(this.yearMax, publication.year);
          doiToIndex[publication.doi] = i;
          publicationNodes.push({
            id: publication.doi,
            publication: publication,
          });
          i++;
        }
      });

      const keywordNodes = [];
      let uniqueKeywords = [...new Set(this.sessionStore.boostKeywords)];
      uniqueKeywords.forEach((keyword) => {
        const frequency = this.sessionStore.publications.filter((publication) =>
          publication.boostKeywords.includes(keyword)
        ).length;
        keywordNodes.push({
          id: keyword,
          frequency: frequency,
        });
      });

      const nodes = publicationNodes.concat(keywordNodes);

      const links = [];

      this.sessionStore.selectedPublications.forEach((publication) => {
        if (publication.doi in doiToIndex) {
          publication.citationDois.forEach((citationDoi) => {
            if (citationDoi in doiToIndex) {
              links.push({
                source: citationDoi,
                target: publication.doi,
                type: "citation",
              });
            }
          });
          publication.referenceDois.forEach((referenceDoi) => {
            if (referenceDoi in doiToIndex) {
              links.push({
                source: publication.doi,
                target: referenceDoi,
                type: "citation",
              });
            }
          });
        }
      });

      uniqueKeywords.forEach((keyword) => {
        this.sessionStore.publications.forEach((publication) => {
          if (publication.boostKeywords.includes(keyword)) {
            links.push({
              source: keyword,
              target: publication.doi,
              type: "keyword",
            });
          }
        });
      });

      // https://observablehq.com/@d3/modifying-a-force-directed-graph
      const old = new Map(this.node.data().map((d) => [d.id, d]));
      this.graph.nodes = nodes.map((d) =>
        Object.assign(old.get(d.id) || { x: this.svgWidth / 2, y: 0 }, d)
      );
      this.graph.links = links.map((d) => Object.assign({}, d));

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
          publicationNodes.append("rect");
          publicationNodes.append("text");
          publicationNodes.append("circle");
          publicationNodes.on("click", this.activatePublication);
          publicationNodes.attr(
            "data-tippy-content",
            (d) =>
              `${
                d.publication.title ? d.publication.title : "[unknown title]"
              } (${
                d.publication.authorShort
                  ? d.publication.authorShort + ", "
                  : ""
              }${d.publication.year ? d.publication.year : "[unknown year]"})`
          );
          tippy(publicationNodes.nodes(), {
            maxWidth: "min(400px,70vw)",
          });
          const keywordNodes = g.filter((d) => !d.publication);
          keywordNodes.append("text");
          return g;
        });

      this.node
        .select(".publication rect")
        .attr(
          "class",
          (d) =>
            (d.publication.isSelected ? "selected" : "suggested") +
            (d.publication.isActive ? " active" : "") +
            (d.publication.isLinkedToActive ? " linkedToActive" : "")
        )
        .attr("width", (d) => getRectSize(d))
        .attr("height", (d) => getRectSize(d))
        .attr("x", (d) => -getRectSize(d) / 2)
        .attr("y", (d) => -getRectSize(d) / 2)
        .attr("stroke-width", (d) => (d.publication.isActive ? 4 : 3))
        .attr("fill", (d) => d.publication.scoreColor);

      this.node
        .select(".publication text")
        .attr(
          "class",
          (d) =>
            `${
              !d.publication.isRead && !d.publication.isSelected ? "unread" : ""
            }`
        )
        .attr("y", 1)
        .attr("font-size", "0.8em")
        .text((d) => d.publication.score);

      this.node
        .select(".publication circle")
        .attr("cx", (d) => getRectSize(d) / 2 - 1)
        .attr("cy", (d) => -getRectSize(d) / 2 + 1)
        .attr("r", (d) =>
          d.publication.boostFactor > 1 ? getBoostIndicatorSize(d) / 6 : 0
        )
        .attr("stroke", "black");

      this.node
        .select(".keyword text")
        .attr("y", 1)
        .attr("font-size", (d) => {
          if (d.frequency >= 25) return "1.2em";
          if (d.frequency >= 10) return "1.0em";
          if (d.frequency >= 5) return "0.85em";
          return "0.7em";
        })
        .text((d) => d.id);

      this.link = this.link
        .data(this.graph.links, (d) => [d.source, d.target])
        .join("path");

      const yearRange = _.range(this.yearMin - 4, this.yearMax + 1).filter(
        (year) => year % 5 === 0
      );
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
            (d) => `translate(${this.yearX(d)},${this.svgHeight - margin})`
          )
          .select("text")
          .attr("y", -this.svgHeight + 2 * margin);
      }

      this.simulation.nodes(this.graph.nodes);
      this.simulation.force("link").links(this.graph.links);
      if (restart) {
        this.simulation.alpha(0.4);
      }
      this.simulation.restart();
    },

    tick: function () {
      this.link
        .attr("d", (d) => {
          if (d.type === "citation") {
            var dx = d.target.x - d.source.x,
              dy = d.target.y - d.source.y,
              dr = Math.pow(dx * dx + dy * dy, 0.6);
            return `M${d.target.x},${d.target.y}A${dr},${dr} 0 0,1 ${d.source.x},${d.source.y}`;
          }
          // TODO: replace with triangle correctly computed from circle segment
          return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}L${d.source.x-5},${d.source.y}`;
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

    yearX: function (year) {
      return (
        ((year - this.yearMin) / Math.sqrt(1 + this.yearMax - this.yearMin)) *
        this.svgWidth *
        0.15
      );
    },

    activatePublication: function (event, d) {
      this.sessionStore.activatePublicationComponentByDoi(d.publication.doi);
      event.stopPropagation();
    },

    toggleMode() {
      this.isNetworkClusters = !this.isNetworkClusters;
    },
  },
};
</script>

<style lang="scss">
@import "~bulma/sass/utilities/_all";

.network-of-references .box {
  height: 100%;
  display: grid;
  grid-template-rows: max-content auto;
}

#network-svg {
  background: white;

  & g.node-container {
    cursor: pointer;

    & rect {
      cursor: pointer;
      stroke-width: 2;

      &.selected {
        stroke: $primary;
      }
      &.suggested {
        stroke: $info;
      }
      &.active {
        stroke-width: 6;
      }
      &.linkedToActive {
        stroke-width: 4;
      }
    }

    & circle {
      fill: $warning;
    }

    & text {
      text-anchor: middle;
      dominant-baseline: middle;
    }

    & text.unread {
      fill: $info-dark;
      font-weight: 1000;
    }

    &:hover rect {
      transform: scale(1.2);
    }
  }
  & path.citation {
    fill: none;
    stroke-width: 2;
    stroke: #00000010;

    &.external {
      stroke: #00000006;
    }

    &.active {
      stroke: #000000aa;
      stroke-dasharray: 5 5;

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