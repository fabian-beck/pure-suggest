<template>
  <div class="column network-of-references">
    <div class="box">
      <div class="level">
        <div class="is-size-4">Network of references</div>
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

export default {
  props: {
    selectedPublications: Array,
    suggestedPublications: Array
  },
  data: function() {
    return {
      graph: { nodes: [], links: [] },
      simulation: null,
      svg: null,
      svgHeight: Number,
      svgWidth: Number,
      yearMin: Number,
      yearMax: Number,
      node: null,
      link: null
    };
  },
  watch: {
    selectedPublications: {
      deep: true,
      handler: function() {
        this.plot();
      }
    },
    suggestedPublications: {
      deep: true,
      handler: function() {
        this.plot();
      }
    }
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
        d3.zoom().on("zoom", function() {
          that.svg.attr("transform", d3.event.transform);
        })
      )
      .append("g");

    this.simulation = d3
      .forceSimulation()
      .force(
        "link",
        d3
          .forceLink()
          .id(d => d.id)
          .distance(50)
          .strength(0.02)
      )
      .force("charge", d3.forceManyBody().strength(-120))
      //.force("center", d3.forceCenter(this.svgWidth / 2, this.svgHeight / 2))
      .force(
        "x",
        d3
          .forceX()
          .x(function(d) {
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
          .y(function(d) {
            return (
              (-Math.log(
                d.publication.isSelected
                  ? d.publication.citationDois.length +
                      d.publication.referenceDois.length +
                      1
                  : (d.publication.referenceCount +
                      d.publication.citationCount) *
                      10 +
                      1
              ) *
                0.12 + // spread by
                0.8) * // move down by 
              that.svgHeight
            );
          })
          .strength(0.4)
      )
      .on("tick", this.tick);

    this.link = this.svg
      .append("g")
      .attr("class", "links")
      .selectAll("path");

    this.node = this.svg
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle");
  },
  methods: {
    plot: function() {
      const doiToIndex = {};
      this.yearMin = 3000;
      this.yearMax = 0;

      const nodes = [];
      let i = 0;
      this.selectedPublications
        .concat(this.suggestedPublications)
        .forEach(publication => {
          if (publication.year) {
            this.yearMin = Math.min(this.yearMin, publication.year);
            this.yearMax = Math.max(this.yearMax, publication.year);
            doiToIndex[publication.doi] = i;
            nodes.push({
              id: publication.doi,
              publication: publication
            });
            i++;
          }
        });

      const links = [];
      this.selectedPublications.forEach(publication => {
        if (publication.doi in doiToIndex) {
          publication.citationDois.forEach(citationDoi => {
            if (citationDoi in doiToIndex) {
              links.push({
                source: citationDoi,
                target: publication.doi
              });
            }
          });
          publication.referenceDois.forEach(referenceDoi => {
            if (referenceDoi in doiToIndex) {
              links.push({
                source: publication.doi,
                target: referenceDoi
              });
            }
          });
        }
      });

      // https://observablehq.com/@d3/modifying-a-force-directed-graph
      const old = new Map(this.node.data().map(d => [d.id, d]));
      this.graph.nodes = nodes.map(d =>
        Object.assign(old.get(d.id) || { x: this.svgWidth / 2, y: 0 }, d)
      );
      this.graph.links = links.map(d => Object.assign({}, d));

      this.node = this.node
        .data(this.graph.nodes, d => d.id)
        .join(enter => {
          const g = enter
            .append("g")
            .attr("class", "node-container")
            .attr(
              "data-tippy-content",
              d =>
                `${d.publication.title} (${d.publication.authorShort}, ${d.publication.year})`
            );
          g.append("circle");
          g.append("text");
          g.on("click", this.activatePublication);
          tippy(g.nodes());
          return g;
        });

      this.node
        .select("circle")
        .attr(
          "class",
          d =>
            (d.publication.isSelected ? "selected" : "suggested") +
            (d.publication.isActive ? " active" : "") +
            (d.publication.isLinkedToActive ? " linkedToActive" : "")
        )
        .attr("r", d => (d.publication.isActive ? 15 : 10))
        .attr("stroke-width", d => (d.publication.isActive ? 8 : 5));

      this.node
        .select("text")
        .attr("x", -4.5)
        .attr("y", 5.5)
        .text(d =>
          d.publication.isSelected
            ? ""
            : d.publication.referenceCount + d.publication.citationCount
        );

      this.link = this.link
        .data(this.graph.links, d => [d.source, d.target])
        .join("path");
      this.simulation.nodes(this.graph.nodes);
      this.simulation.force("link").links(this.graph.links);
      if (old.size != this.graph.nodes.length) {
        this.simulation.alpha(1.0);
      }
      this.simulation.restart();
    },
    tick: function() {
      this.link
        .attr("d", d => {
          var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
          return (
            "M" +
            d.source.x +
            "," +
            d.source.y +
            "A" +
            dr +
            "," +
            dr +
            " 0 0,1 " +
            d.target.x +
            "," +
            d.target.y
          );
        })
        .attr("class", d =>
          d.source.publication.isActive || d.target.publication.isActive
            ? "active"
            : ""
        );

      this.node.attr("transform", d => `translate(${d.x}, ${d.y})`);
    },

    activatePublication: function(d) {
      this.$emit("activate", d.publication.doi);
    }
  }
};
</script>

<style lang="scss">
@import "~bulma/sass/utilities/_all";
.network-of-references .box {
  background: $grey-lighter;
  height: 100%;
}
#network-svg-container {
  height: 100%;
}
#network-svg {
  background: white;
}
#network-svg g.node-container text {
  cursor: pointer;
}
#network-svg circle {
  fill: white;
  cursor: pointer;
}
#network-svg circle.selected {
  stroke: $primary;
}
#network-svg circle.selected.linkedToActive {
  fill: $info;
}
#network-svg circle.suggested {
  stroke: $info;
}
#network-svg circle.suggested.linkedToActive {
  fill: $primary;
}
#network-svg circle:hover {
  fill: $white-ter;
}
#network-svg circle.active {
  fill: $grey-lighter;
}
#network-svg path {
  fill: none;
  stroke-width: 2;
  stroke: #00000010;
}
#network-svg path.active {
  stroke: #000000aa;
}
</style>