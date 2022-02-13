<template>
  <div class="network-of-references">
    <div class="box has-background-grey">
      <div class="level">
        <div class="level-left has-text-white">
          <div class="level-item">
            <b-icon icon="chart-bar"></b-icon>
            <h2 class="is-size-5 ml-2">Citation network</h2>
            <span class="icon" v-show="selectedPublications.length">
              <i
                class="fas fa-info-circle"
                data-tippy-content="Showing publications as nodes (<b class='has-text-primary'>green</b>: selected; <b class='has-text-info'>blue</b>: suggested) with references connecting them as links. The layout places publications from left to right based on publication year and from top to bottom by reference frequency (<b class='has-text-primary'>selected</b>: summed references and citations; <b class='has-text-info'>suggested</b>: suggestion score). You can highlight a publication on click, zoom using the mouse wheel, and pan on drag."
                v-tippy
              ></i
            ></span>
          </div>
        </div>
      </div>
      <div id="network-svg-container">
        <svg id="network-svg" />
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

const RECT_SIZE = 20;
const ENLARGE_FACTOR = 1.5;

export default {
  props: {
    selectedPublications: Array,
    suggestedPublications: Array,
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
      .attr("width", container.clientWidth)
      .attr("height", container.clientHeight)
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
          .strength(0.02)
      )
      .force("charge", d3.forceManyBody().strength(-120))
      //.force("center", d3.forceCenter(this.svgWidth / 2, this.svgHeight / 2))
      .force(
        "x",
        d3
          .forceX()
          .x(function (d) {
            return (
              ((d.publication.year - that.yearMin) /
                Math.sqrt(1 + that.yearMax - that.yearMin)) *
              that.svgWidth *
              0.15
            );
          })
          .strength(1.0)
      )
      .force(
        "y",
        d3
          .forceY()
          .y(function (d) {
            return (
              (-Math.log(
                d.publication.isSelected
                  ? d.publication.citationDois.length +
                      d.publication.referenceDois.length +
                      1
                  : d.publication.score * 10 + 1
              ) *
                0.12 + // spread by
                0.8) * // move down by
              that.svgHeight
            );
          })
          .strength(0.4)
      )
      .on("tick", this.tick);

    this.link = this.svg.append("g").attr("class", "links").selectAll("path");

    this.node = this.svg.append("g").attr("class", "nodes").selectAll("rect");
  },
  methods: {
    plot: function () {
      function getRectSize(d) {
        return RECT_SIZE * (d.publication.isActive ? ENLARGE_FACTOR : 1);
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
          tippy(g.nodes());
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
        .attr("cy", (d) => getRectSize(d) / 2 - 1)
        .attr("r", (d) =>
          d.publication.boostFactor > 1 ? getRectSize(d) / 5 : 0
        );

      this.link = this.link
        .data(this.graph.links, (d) => [d.source, d.target])
        .join("path");
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
        .attr("class", (d) =>
          d.source.publication.isActive || d.target.publication.isActive
            ? "active"
            : ""
        );

      this.node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    },

    activatePublication: function (event, d) {
      this.$emit("activate", d.publication.doi);
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

    &.active {
      stroke: #000000aa;
    }
  }
}

@include mobile {
  .network-of-references {
    padding: 0 !important;
  }
  .network-of-references .box {
    padding: 0.5rem;
  }
}
</style>