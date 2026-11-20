/**
 * Network Force Simulation Configuration
 *
 * This module handles the D3.js force simulation setup for the citation network.
 * It provides functions to configure link, charge, and positioning forces based on
 * network mode (timeline vs clusters) and publication data.
 */

import * as d3 from 'd3'

import { CURRENT_YEAR } from '@/constants/config.js'
import { detectCommunities } from '@/utils/network/communities.js'
import { getCitationTimeWeight } from '@/utils/network/links.js'

export const SIMULATION_ALPHA = 0.7
// Simulation ticks per second of an animated layout at SIMULATION_ALPHA; as nodes move less
// per tick the more the simulation has cooled down, ticks run faster in inverse proportion
// to the alpha, so that nodes move at about constant speed and a layout takes about half a
// second
const TICKS_PER_SECOND = 240
// Upper limits of ticks per second and per frame, the latter keeping the movement smooth
// when frames are slow
const MAX_TICKS_PER_SECOND = 480
const MAX_TICKS_PER_FRAME = 8
const NEW_NODE_OFFSET = 10
// Space at the left of the year axis for the first year label, at the right for keywords
const YEAR_AXIS_MARGIN_LEFT = 24
const YEAR_AXIS_MARGIN_RIGHT = 60
// Share of the view inside the margins that the nodes are meant to fill
const FILL = 1
// Pull of authors to their mean year on the timeline, on top of the centering
const AUTHOR_TIMELINE_STRENGTH = 2
// Upper limit of centering strengths: at the start of a simulation (alpha 0.7), strengths
// above about 5 make the positions oscillate with growing amplitude
const MAX_STRENGTH = 1
// Distance of node centers from the left and right border of the view, and from the top
// and bottom border, that the nodes are meant to keep, which keeps the rows of year labels
// (6 + 20) and the controls free
const VIEW_MARGIN_X = 15
const VIEW_MARGIN_Y = 40
// Area inside the margins of the network panel on a typical desktop (1880 × 400)
const REFERENCE_AREA = 1850 * 320
// Factors of the pull of citation and author links within and across communities in
// clusters mode: as the charge spreads the nodes evenly, the links alone pull nodes towards
// a mix of communities; links within communities pulling more form visible clusters
// (author links pulling more would place authors on top of their publications)
const CITATION_COMMUNITY_FACTORS = { within: 3, across: 0.5 }
const AUTHOR_COMMUNITY_FACTORS = { within: 1.5, across: 0.5 }

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
 * Calculate link strength based on link type and network mode; citations spanning many
 * years pull less (link ends are resolved to nodes when d3 reads the strengths); in
 * clusters mode, citation and author links pull more within than across the communities
 * (map from node to community, see detectCommunities)
 */
export function getLinkStrength(link, isNetworkClusters, community) {
  let internalFactor
  if (link.type === 'citation') {
    internalFactor = (link.internal ? 1 : 1.5) * getCitationTimeWeight(link)
  } else if (link.type === 'keyword') {
    internalFactor = 0.5
  } else {
    internalFactor = 2.5 // author
  }

  let clustersFactor = 0.5
  if (isNetworkClusters) {
    clustersFactor = 1
    if (community && link.type !== 'keyword') {
      const factors =
        link.type === 'citation' ? CITATION_COMMUNITY_FACTORS : AUTHOR_COMMUNITY_FACTORS
      clustersFactor =
        community.get(link.source) === community.get(link.target) ? factors.within : factors.across
    }
  }
  return 0.05 * clustersFactor * internalFactor
}

/**
 * Charge (repulsion) strength based on the number of selected publications and the area of
 * the view ({ width, height }) inside the margins: as the links hold linked nodes at a
 * distance growing with the square root of the charge, the layout scales with the view
 */
export function getChargeStrength(selectedPublicationsCount, view) {
  const area =
    Math.max(0, view.width - 2 * VIEW_MARGIN_X) * Math.max(0, view.height - 2 * VIEW_MARGIN_Y)
  return (Math.min(-200, -100 * Math.sqrt(selectedPublicationsCount)) * area) / REFERENCE_AREA
}

/**
 * X coordinate of a year in a view of the given width (centered on the origin): the years
 * from the first year stripe (see generateYearRange) to the keywords fill the view
 */
export function calculateYearX(year, yearMin, width) {
  const firstYear = Math.floor((yearMin ?? CURRENT_YEAR - 20) / 5) * 5
  const keywordYear = CURRENT_YEAR + 2
  const axisWidth = width - YEAR_AXIS_MARGIN_LEFT - YEAR_AXIS_MARGIN_RIGHT
  return (
    -width / 2 +
    YEAR_AXIS_MARGIN_LEFT +
    ((year - firstYear) / (keywordYear - firstYear)) * axisWidth
  )
}

/**
 * X position of a node on the timeline
 */
export function getNodeXPosition(node, yearXCalculator) {
  switch (node.type) {
    case 'publication':
      return yearXCalculator(node.publication.year)
    case 'keyword':
      return yearXCalculator(CURRENT_YEAR + 2)
    case 'author':
      return yearXCalculator((node.author.yearMax + node.author.yearMin) / 2)
  }
}

/**
 * In timeline mode, fix publications and keywords at the x of their year, so that the
 * simulation only moves them vertically, and set the x that authors are pulled to
 * (timelineX); in clusters mode, only keywords dragged to a fixed place in clusters mode
 * (clusterFx) keep their x
 */
export function pinTimelineX(nodes, isNetworkClusters, yearXCalculator) {
  nodes.forEach((node) => {
    if (!isNetworkClusters && node.type === 'author') {
      node.timelineX = getNodeXPosition(node, yearXCalculator)
    } else if (!isNetworkClusters) {
      node.fx = node.x = getNodeXPosition(node, yearXCalculator)
    } else if (node.clusterFx != null) {
      node.fx = node.x = node.clusterFx
    } else {
      delete node.fx
    }
  })
}

/**
 * Reuse the node objects of the previous layout, keeping their positions; new nodes
 * start next to their already positioned neighbors (spread on a small spiral, as nodes
 * on the same spot repel each other violently), others are placed by d3
 */
export function assignNodePositions(nodes, previousNodes, links) {
  const previousById = new Map((previousNodes || []).map((node) => [node.id, node]))
  const neighborIds = new Map()
  links.forEach(({ source, target }) => {
    ;[
      [source, target],
      [target, source]
    ].forEach(([id, neighborId]) => {
      if (!neighborIds.has(id)) neighborIds.set(id, [])
      neighborIds.get(id).push(neighborId)
    })
  })
  let newCount = 0
  return nodes.map((node) => {
    if (previousById.has(node.id)) {
      return Object.assign(previousById.get(node.id), node)
    }
    const neighbors = (neighborIds.get(node.id) || [])
      .map((id) => previousById.get(id))
      .filter(Boolean)
    if (neighbors.length) {
      const angle = newCount++ * Math.PI * (3 - Math.sqrt(5))
      node.x = d3.mean(neighbors, (neighbor) => neighbor.x) + NEW_NODE_OFFSET * Math.cos(angle)
      node.y = d3.mean(neighbors, (neighbor) => neighbor.y) + NEW_NODE_OFFSET * Math.sin(angle)
    }
    return node
  })
}

/**
 * Strengths [x, y] of the forces pulling the nodes to the center, and the charge strength,
 * so that the nodes fill a view ({ width, height }): in equilibrium, n nodes repelling each
 * other with charge q spread to an ellipse with semi-axes a and b when pulled with
 * 2|q|n / (a(a + b)) and 2|q|n / (b(a + b)). On the timeline, m nodes horizontally closer
 * than their vertical distance in a line of height 2b (2b / m) repel each other almost only
 * vertically, like nodes on a line, which spread to ±b when pulled with 2|q|m / b².
 * Strengths are limited to keep the simulation stable: for large graphs, the charge is
 * reduced along with them, which keeps the extent of the layout.
 */
export function getLayoutStrengths(nodes, isNetworkClusters, chargeStrength, view) {
  const a = FILL * (view.width / 2 - VIEW_MARGIN_X)
  const b = FILL * (view.height / 2 - VIEW_MARGIN_Y)
  const charge = Math.abs(chargeStrength)
  const factor = (2 * charge * nodes.length) / (a + b)
  let yStrength = factor / b
  if (!isNetworkClusters) {
    const timelineXs = nodes.map((node) => node.fx ?? node.timelineX).sort((x1, x2) => x1 - x2)
    let lineNodeCount = nodes.length
    while (getMaxCountInRange(timelineXs, (2 * b) / lineNodeCount) < lineNodeCount) {
      lineNodeCount--
    }
    yStrength = Math.max(yStrength, (2 * charge * lineNodeCount) / b ** 2)
  }
  const xStrength = factor / a
  const scale = Math.min(1, MAX_STRENGTH / Math.max(xStrength, yStrength))
  return [scale * xStrength, scale * yStrength, scale * chargeStrength]
}

/**
 * Largest number of the sorted values within a range of the given width
 */
function getMaxCountInRange(sortedValues, width) {
  let maxCount = 0
  let start = 0
  sortedValues.forEach((value, end) => {
    while (value - sortedValues[start] > width) start++
    maxCount = Math.max(maxCount, end - start + 1)
  })
  return maxCount
}

/**
 * Initialize and configure all forces for the simulation in a view of the given size
 * ({ width, height }); timeline positions are set by pinTimelineX
 */
export function initializeForces(simulation, isNetworkClusters, selectedPublicationsCount, view) {
  const chargeStrength = getChargeStrength(selectedPublicationsCount, view)
  // Force strengths are read per node, but only depend on all the nodes
  let strengthNodes = null
  let strengths = null
  // Communities are detected when d3 reads the link strengths, as only then link ends are
  // resolved to nodes
  let communityLinks = null
  let community = null
  const layoutStrength = (nodes, index) => {
    if (nodes !== strengthNodes) {
      strengthNodes = nodes
      strengths = getLayoutStrengths(nodes, isNetworkClusters, chargeStrength, view)
    }
    return strengths[index]
  }

  // Configure link force
  simulation.force(
    'link',
    d3
      .forceLink()
      .id((d) => d.id)
      .distance((d) => getLinkDistance(d, isNetworkClusters, selectedPublicationsCount))
      .strength((d, i, links) => {
        if (isNetworkClusters && links !== communityLinks) {
          communityLinks = links
          community = detectCommunities(links)
        }
        return getLinkStrength(d, isNetworkClusters, community)
      })
  )

  // Configure charge (repulsion) force
  simulation.force(
    'charge',
    d3
      .forceManyBody()
      .strength((d, i, nodes) => layoutStrength(nodes, 2))
      .theta(0.7) // Optimized Barnes-Hut parameter for better performance
  )

  // In timeline mode, only authors are not pinned to their year: the repulsion of the other
  // nodes pushes them outwards about as strongly as the centering pulls them in, so they
  // need both the centering and a pull to their year, which balance at their year
  simulation.force(
    'x',
    isNetworkClusters
      ? d3.forceX(0).strength((d, i, nodes) => layoutStrength(nodes, 0))
      : d3
          .forceX(
            (d, i, nodes) =>
              (AUTHOR_TIMELINE_STRENGTH * d.timelineX) /
              (layoutStrength(nodes, 0) + AUTHOR_TIMELINE_STRENGTH)
          )
          .strength((d, i, nodes) => layoutStrength(nodes, 0) + AUTHOR_TIMELINE_STRENGTH)
  )
  simulation.force(
    'y',
    d3.forceY(0).strength((d, i, nodes) => layoutStrength(nodes, 1))
  )
}

/**
 * Complement the tick of the simulation's timer with further ticks for a frame shown the given
 * time (ms) after the previous one, until the simulation has cooled down, so that the layout
 * runs at the pace of TICKS_PER_SECOND without changing; returns the number of ticks of the
 * frame
 */
export function runFrameTicks(simulation, frameTime) {
  const ticksPerSecond = Math.min(
    MAX_TICKS_PER_SECOND,
    (TICKS_PER_SECOND * SIMULATION_ALPHA) / simulation.alpha()
  )
  const frameTickCount = Math.min(
    MAX_TICKS_PER_FRAME,
    Math.round((frameTime * ticksPerSecond) / 1000)
  )
  let tickCount = 1
  while (tickCount < frameTickCount && simulation.alpha() >= simulation.alphaMin()) {
    simulation.tick()
    tickCount++
  }
  return tickCount
}

/**
 * Create a D3 force simulation; its forces are set by initializeForces
 */
export function createForceSimulation() {
  return d3.forceSimulation().alphaDecay(0.015).alphaMin(0.02)
}
