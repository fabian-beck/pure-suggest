/**
 * Network Simulation Composable
 * 
 * This composable manages the D3.js force simulation for the NetworkVisComponent.
 * It provides reactive integration between Vue component state and D3 force simulation.
 */

import { ref, onUnmounted } from 'vue';
import { 
  createForceSimulation, 
  initializeForces,
  calculateYearX,
  SIMULATION_ALPHA 
} from './networkForces.js';

export function useNetworkSimulation() {
  // Simulation instance
  const simulation = ref(null);
  const isDragging = ref(false);
  
  // Graph data
  const graph = ref({ nodes: [], links: [] });
  
  // Create year X calculator function

  /**
   * Initialize the force simulation
   */
  function initializeSimulation(config) {
    const {
      svgWidth,
      svgHeight,
      isMobile,
      isNetworkClusters,
      selectedPublicationsCount,
      tickHandler
    } = config;

    const yearXCalculator = (year) => calculateYearX(year, svgWidth, svgHeight, isMobile);

    simulation.value = createForceSimulation({
      isNetworkClusters,
      selectedPublicationsCount,
      yearXCalculator,
      tickHandler
    });

    return simulation.value;
  }

  /**
   * Update simulation configuration when reactive props change
   */
  function updateSimulation(config) {
    if (!simulation.value) return;

    const {
      svgWidth,
      svgHeight,
      isMobile,
      isNetworkClusters,
      selectedPublicationsCount,
      tickHandler
    } = config;

    const yearXCalculator = (year) => calculateYearX(year, svgWidth, svgHeight, isMobile);

    initializeForces(simulation.value, {
      isNetworkClusters,
      selectedPublicationsCount,
      yearXCalculator,
      tickHandler
    });
  }

  /**
   * Update simulation with new graph data
   */
  function updateGraphData(nodes, links) {
    graph.value.nodes = nodes;
    graph.value.links = links;

    if (simulation.value) {
      simulation.value.nodes(nodes);
      const linkForce = simulation.value.force("link");
      if (linkForce && linkForce.links) {
        linkForce.links(links);
      }
    }
  }

  /**
   * Restart the simulation
   */
  function restart(alpha = SIMULATION_ALPHA) {
    if (simulation.value && !isDragging.value) {
      simulation.value.alpha(alpha).restart();
    }
  }

  /**
   * Start simulation
   */
  function start() {
    if (simulation.value) {
      simulation.value.restart();
    }
  }

  /**
   * Stop simulation
   */
  function stop() {
    if (simulation.value) {
      simulation.value.stop();
    }
  }

  /**
   * Set dragging state (prevents simulation updates during drag)
   */
  function setDragging(dragging) {
    isDragging.value = dragging;
  }


  /**
   * Cleanup on component unmount
   */
  onUnmounted(() => {
    if (simulation.value) {
      simulation.value.stop();
      simulation.value = null;
    }
  });

  return {
    // State
    simulation,
    graph,
    isDragging,

    // Methods
    initializeSimulation,
    updateSimulation,
    updateGraphData,
    restart,
    start,
    stop,
    setDragging,
  };
}