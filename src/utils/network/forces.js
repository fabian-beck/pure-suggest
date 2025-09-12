/**
 * Network Force Simulation Configuration
 *
 * This module handles the D3.js force simulation setup for the citation network.
 * It provides functions to configure link, charge, and positioning forces based on
 * network mode (timeline vs clusters) and publication data.
 */

import * as d3 from 'd3'
import { CURRENT_YEAR } from '@/constants/config.js'

export const SIMULATION_ALPHA = 0.7

/**
 * Calculate link distance based on link type and network mode
 */
export function getLinkDistance(link, isNetworkClusters, selectedPublicationsCount) {
  switch (link.type) {
    case 'citation':
      return isNetworkClusters && link.internal ? 1500 / selectedPublicationsCount : 10
    case 'keyword':
      return 0
    case 'author':
      return 0
    default:
      return 10
  }
}

/**
 * Calculate link strength based on link type and network mode
 */
export function getLinkStrength(link, isNetworkClusters) {
  let internalFactor
  if (link.type === 'citation') {
    internalFactor = link.internal ? 1 : 1.5
  } else if (link.type === 'keyword') {
    internalFactor = 0.5
  } else {
    internalFactor = 2.5 // author
  }

  const clustersFactor = isNetworkClusters ? 1 : 0.5
  return 0.05 * clustersFactor * internalFactor
}

/**
 * Calculate charge (repulsion) strength based on number of selected publications
 */
export function getChargeStrength(selectedPublicationsCount) {
  return Math.min(-200, -100 * Math.sqrt(selectedPublicationsCount))
}

/**
 * Calculate X coordinate based on year and display dimensions
 */
export function calculateYearX(year, svgWidth, svgHeight, isMobile) {
  const width = Math.max(svgWidth, 2 * svgHeight)
  return (year - CURRENT_YEAR) * width * 0.03 + width * (isMobile ? 0.05 : 0.3)
}

/**
 * Calculate X position for a node based on type and network mode
 */
export function getNodeXPosition(node, isNetworkClusters, yearXCalculator) {
  if (isNetworkClusters) {
    return node.x || 0
  }

  switch (node.type) {
    case 'publication':
      return yearXCalculator(node.publication.year)
    case 'keyword':
      return yearXCalculator(CURRENT_YEAR + 2)
    case 'author':
      return yearXCalculator((node.author.yearMax + node.author.yearMin) / 2)
    default:
      return node.x || 0
  }
}

/**
 * Calculate X force strength based on node type and network mode
 */
export function getXForceStrength(node, isNetworkClusters) {
  if (isNetworkClusters) {
    return 0.05
  }

  return node.type === 'author' ? 0.2 : 10
}

/**
 * Calculate Y force strength based on network mode
 */
export function getYForceStrength(isNetworkClusters) {
  return isNetworkClusters ? 0.1 : 0.25
}

/**
 * Initialize and configure all forces for the simulation
 */
export function initializeForces(simulation, config) {
  const { isNetworkClusters, selectedPublicationsCount, yearXCalculator, tickHandler } = config

  // Configure link force
  simulation.force(
    'link',
    d3
      .forceLink()
      .id((d) => d.id)
      .distance((d) => getLinkDistance(d, isNetworkClusters, selectedPublicationsCount))
      .strength((d) => getLinkStrength(d, isNetworkClusters))
  )

  // Configure charge (repulsion) force
  simulation.force(
    'charge',
    d3.forceManyBody().strength(getChargeStrength(selectedPublicationsCount)).theta(0.7) // Optimized Barnes-Hut parameter for better performance
  )

  // Configure X positioning force
  simulation.force(
    'x',
    d3
      .forceX()
      .x((d) => getNodeXPosition(d, isNetworkClusters, yearXCalculator))
      .strength((d) => getXForceStrength(d, isNetworkClusters))
  )

  // Configure Y positioning force
  simulation.force('y', d3.forceY().y(0).strength(getYForceStrength(isNetworkClusters)))

  // Set up tick handler
  if (tickHandler) {
    simulation.on('tick', tickHandler)
  }

  return simulation
}

/**
 * Create and initialize a new D3 force simulation
 */
export function createForceSimulation(config) {
  const simulation = d3.forceSimulation()
  simulation.alphaDecay(0.015).alphaMin(0.015)
  return initializeForces(simulation, config)
}
