<template>
  <div class="column network-of-references">
    <div class="box">
      <div class="is-size-4">Network of references</div>
      <svg id="network-svg" :width="svgWidth+'px'" :height="svgHeight+'px'" />
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";

export default {
  props: {
    selectedPublications: Array,
    suggestedPublications: Array,
    svgWidth: Number,
    svgHeight: Number
  },
  data: function() {
    return {
      graph: {},
      simulation: null
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
  methods: {
    plot: function() {
      console.log("plot");
      const doiToIndex = {};
      this.graph.nodes = [];
      let i = 0;
      this.selectedPublications.forEach(publication => {
        if (publication.year) {
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
        publication.citationDois.forEach(citationDoi => {
          if (citationDoi in doiToIndex) {
            this.graph.links.push({
              source: doiToIndex[citationDoi],
              target: doiToIndex[publication.doi]
            });
          }
        });
      });
      const simulation = d3
        .forceSimulation(this.graph.nodes)
        .force(
          "link",
          d3
            .forceLink(this.graph.links)
            .distance(100)
            .strength(0.1)
        )
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(this.svgWidth / 2, this.svgHeight / 2))
        .force(
          "x",
          d3.forceX().x(function(d) {
            return (d.publication.year-2000) * 100;
          })
        )
        .force(
          "y",
          d3.forceY().y(function(d) {
            return -(d.publication.citationDois.length);
          })
        );
      let n = 100;
      while (n-- > 0) {
        simulation.tick();
      }
      d3.select("#network-svg")
        .selectAll("*")
        .remove();
      d3.select("#network-svg")
        .append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(this.graph.links)
        .enter()
        .append("line")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
        .attr("stroke", "#00000033");
      d3.select("#network-svg")
        .append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(this.graph.nodes)
        .enter()
        .append("circle")
        .attr("r", 10)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .append("title")
        .text(d => `${d.publication.title} (${d.publication.authorShort}, ${d.publication.year})`);
    }
  }
};
</script>

<style lang="scss">
@import "~bulma/sass/utilities/_all";
#network-svg circle {
  fill: $primary;
  stroke: white;
  stroke-width: 2;
}
#network-svg circle:hover {
  stroke: $primary;
}
</style>