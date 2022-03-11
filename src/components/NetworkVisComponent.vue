<template>
  <div class="network-of-references">
    <div class="box has-background-grey">
      <div class="level">
        <div class="level-left has-text-white">
          <div class="level-item">
            <b-icon icon="chart-bubble"></b-icon>
            <h2 class="is-size-5 ml-2">Citation network</h2>
            <b-icon
              icon="information-outline"
              size="is-small"
              class="ml-2"
              v-show="selectedPublications.length"
              data-tippy-content="Showing publications as nodes (<b class='has-text-primary'>selected</b>; <b class='has-text-info'>suggested</b>) with citations as links.<br><br>The diagram places publications from left to right based on year and from top to bottom by reference/citation frequency (ignoring boost).<br><br>You can click a pubication for details as well as zoom and pan the diagram."
              v-tippy
            ></b-icon>
          </div>
        </div>
        <div class="level-right is-hidden-touch">
          <b-button
            icon-right="arrow-expand-up"
            size="is-small"
            data-tippy-content="Expand diagram"
            v-tippy
            v-show="!isExpanded"
            @click="$emit('expand')"
          ></b-button>
          <b-button
            icon-right="arrow-expand-down"
            size="is-small"
            data-tippy-content="Collapse diagram"
            v-tippy
            v-show="isExpanded"
            @click="$emit('collapse')"
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

const RECT_SIZE = 20;
const ENLARGE_FACTOR = 1.5;

export default {
  props: {
    selectedPublications: Array,
    suggestedPublications: Array,
    isExpanded: Boolean,
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
      isTimeline: false,
    };
  },
  watch: {
    selectedPublications: {
      deep: true,
      handler: function () {
        this.plot();
      },
    },
    suggestedPublications: {
      deep: true,
      handler: function () {
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

    this.simulation = d3
      .forceSimulation()
      .force(
        "link",
        d3
          .forceLink()
          .id((d) => d.id)
          .distance(50)
          .strength(that.isTimeline ? 0.02 : 0.15)
      )
      .force("charge", d3.forceManyBody().strength(-120))
      .force(
        "x",
        d3
          .forceX()
          .x((d) => this.yearX(d.publication.year))
          .strength(that.isTimeline ? 1.0 : 0.001)
      )
      .force(
        "y",
        d3
          .forceY()
          .y(function (d) {
            if (that.isTimeline) {
              return (
                (-Math.log(
                  (d.publication.citationCount +
                    d.publication.referenceCount +
                    (d.publication.isSelected ? 1 : 0) +
                    1) *
                    10
                ) *
                  0.12 + // spread by
                  0.8) * // move down by
                that.svgHeight
              );
            } else {
              return 0.5 * that.svgHeight;
            }
          })
          .strength(that.isTimeline ? 0.4 : 0.1)
      )
      .on("tick", this.tick);

    this.link = this.svg.append("g").attr("class", "links").selectAll("path");

    this.node = this.svg.append("g").attr("class", "nodes").selectAll("rect");

    this.label = this.svg.append("g").attr("class", "labels").selectAll("text");
  },
  methods: {
    plot: function () {

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
        return getRectSize(d) * factor;
      }

      const doiToIndex = {};
      this.yearMin = 3000;
      this.yearMax = 0;

      const nodes = [];
      let i = 0;
      this.selectedPublications
        .concat(this.suggestedPublications)
        .forEach((publication) => {
          if (publication.year) {
            this.yearMin = Math.min(this.yearMin, publication.year);
            this.yearMax = Math.max(this.yearMax, publication.year);
            doiToIndex[publication.doi] = i;
            nodes.push({
              id: publication.doi,
              publication: publication,
            });
            i++;
          }
        });

      const links = [];
      this.selectedPublications.forEach((publication) => {
        if (publication.doi in doiToIndex) {
          publication.citationDois.forEach((citationDoi) => {
            if (citationDoi in doiToIndex) {
              links.push({
                source: citationDoi,
                target: publication.doi,
              });
            }
          });
          publication.referenceDois.forEach((referenceDoi) => {
            if (referenceDoi in doiToIndex) {
              links.push({
                source: publication.doi,
                target: referenceDoi,
              });
            }
          });
        }
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
            .attr("class", "node-container")
            .attr(
              "data-tippy-content",
              (d) => `${d.publication.title} (${d.publication.shortReference})`
            );
          g.append("rect");
          g.append("text");
          g.append("circle");
          g.on("click", this.activatePublication);
          tippy(g.nodes(), {
            maxWidth: "min(400px,70vw)",
          });
          return g;
        });

      this.node
        .select("rect")
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
        .select("text")
        .attr("y", 1)
        .text((d) => d.publication.score);

      this.node
        .select("circle")
        .attr("cx", (d) => getRectSize(d) / 2 - 1)
        .attr("cy", (d) => -getRectSize(d) / 2 + 1)
        .attr("r", (d) =>
          d.publication.boostFactor > 1 ? getBoostIndicatorSize(d) / 6 : 0
        )
        .attr("stroke", "black");

      this.link = this.link
        .data(this.graph.links, (d) => [d.source, d.target])
        .join("path");

      const yearRange = _.range(this.yearMin, this.yearMax + 1).filter(
        (year) => year % 5 === 0
      );
      this.label = this.label
        .data(yearRange, (d) => d)
        .join("text")
        .attr("text-anchor", "middle")
        .attr(
          "visibility",
          (this.selectedPublications.length > 0 && this.isTimeline) ? "visible" : "hidden"
        )
        .text((d) => d);

      if (this.selectedPublications.length > 0) {
        this.label
          .attr("x", (d) => this.yearX(d))
          .attr(
            "y",
            () =>
              (-Math.log(
                (this.selectedPublications.length +
                  this.suggestedPublications.length) *
                  10
              ) *
                0.12 + // spread by
                0.8) * // move down by
              this.svgHeight
          );
      }

      this.simulation.nodes(this.graph.nodes);
      this.simulation.force("link").links(this.graph.links);
      if (old.size != this.graph.nodes.length) {
        this.simulation.alpha(1.0);
      }
      this.simulation.restart();
    },

    tick: function () {
      this.link
        .attr("d", (d) => {
          var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.pow(dx * dx + dy * dy, 0.6);
          return (
            "M" +
            d.target.x +
            "," +
            d.target.y +
            "A" +
            dr +
            "," +
            dr +
            " 0 0,1 " +
            d.source.x +
            "," +
            d.source.y
          );
        })
        .attr(
          "class",
          (d) =>
            (d.source.publication.isActive || d.target.publication.isActive
              ? "active"
              : "") +
            (d.source.publication.isSelected && d.target.publication.isSelected
              ? ""
              : " external")
        );

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
      this.$emit("activate", d.publication.doi);
      event.stopPropagation();
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

    &:hover rect {
      transform: scale(1.2);
    }
  }
  & path {
    fill: none;
    stroke-width: 2;
    stroke: #00000010;
    stroke-dasharray: 15 5;

    &.active {
      stroke: #000000aa;
    }

    &.external {
      stroke-dasharray: none;
    }
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