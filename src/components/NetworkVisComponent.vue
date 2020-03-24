<template>
  <div class="column network-of-references">
    <div class="box">
      <div class="level">
        <div class="is-size-4">Network of references</div>
      </div>
      <div id="network-svg-container">
        <svg id="network-svg"/>
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";

export default {
  props: {
    selectedPublications: Array,
    suggestedPublications: Array,
  },
  data: function() {
    return {
      graph: {},
      simulation: null,
      svg: null,
      svgHeight: Number,
      svgWidth: Number
    };
  },
  watch: {
    selectedPublications: {
      deep: true,
      handler: function() {
        this.plot();
      }
    }
  },
  mounted() {
    const container = document.getElementById("network-svg-container");
    this.svg = d3.select("#network-svg");
    this.svgWidth = container.clientWidth;
    this.svgHeight = container.clientHeight;
    this.svg.attr("width", container.clientWidth);
    this.svg.attr("height", container.clientHeight);
  },
  methods: {
    plot: function() {
      const that = this;
      console.log("plot");
      const doiToIndex = {};
      let yearMin = 3000;
      let yearMax = 0;
      this.graph.nodes = [];
      let i = 0;

      this.selectedPublications
        .concat(this.suggestedPublications)
        .forEach(publication => {
          if (publication.year) {
            yearMin = Math.min(yearMin, publication.year);
            yearMax = Math.max(yearMax, publication.year);
            doiToIndex[publication.doi] = i;
            this.graph.nodes.push({
              id: publication.doi,
              publication: publication
            });
            i++;
          }
        });
      this.graph.links = [];
      this.selectedPublications.forEach(publication => {
        if (publication.doi in doiToIndex) {
          publication.citationDois.forEach(citationDoi => {
            if (citationDoi in doiToIndex) {
              this.graph.links.push({
                source: doiToIndex[citationDoi],
                target: doiToIndex[publication.doi]
              });
            }
          });
          publication.referenceDois.forEach(referenceDoi => {
            if (referenceDoi in doiToIndex) {
              this.graph.links.push({
                source: doiToIndex[publication.doi],
                target: doiToIndex[referenceDoi]
              });
            }
          });
        }
      });
      const simulation = d3
        .forceSimulation(this.graph.nodes)
        .force(
          "link",
          d3
            .forceLink(this.graph.links)
            .distance(50)
            .strength(0.05)
        )
        .force("charge", d3.forceManyBody().strength(-40))
        .force("center", d3.forceCenter(this.svgWidth / 2, this.svgHeight / 2))
        .force(
          "x",
          d3.forceX().x(function(d) {
            return (
              ((d.publication.year - yearMin) /
                Math.sqrt(1 + yearMax - yearMin)) *
              that.svgWidth *
              0.2
            );
          })
        )
        .force(
          "y",
          d3.forceY().y(function(d) {
            return (
              -Math.log(d.publication.citationDois.length + 1) *
              that.svgHeight *
              0.08
            );
          })
        );
      let n = 100;
      while (n-- > 0) {
        simulation.tick();
      }
      this.svg.selectAll("*").remove();
      this.svg
        .append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(this.graph.links)
        .enter()
        .append("path")
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
        });

      this.svg
        .append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(this.graph.nodes)
        .enter()
        .append("circle")
        .attr("class", d =>
          d.publication.isSelected ? "selected" : "suggested"
        )
        .attr("r", 10)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .append("title")
        .text(
          d =>
            `${d.publication.title} (${d.publication.authorShort}, ${d.publication.year})`
        );
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
#network-svg circle {
  stroke: white;
  stroke-width: 2;
}
#network-svg circle.selected {
  fill: $primary;
}
#network-svg circle.suggested {
  fill: $info;
}
#network-svg circle:hover {
  stroke: $grey;
}
#network-svg path {
  fill: none;
  stroke-width: 2;
  stroke: #00000022;
}
</style>