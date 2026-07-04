/**
 * Publication Node Management
 *
 * This module handles the creation, initialization, and updating of publication nodes
 * in the network visualization. Publication nodes represent research papers and are
 * displayed as rectangular nodes with associated metadata.
 */

import tippy from 'tippy.js'

const RECT_SIZE = 20
const ENLARGE_FACTOR = 1.5

/**
 * Create publication node data from publications
 */
export function createPublicationNodes(publications, doiToIndex, options = {}) {
  const { selectedQueue = [], excludedQueue = [], filter = null, onlyShowFiltered = false } = options
  const nodes = []
  let i = 0

  publications.forEach((publication) => {
    if (publication.year) {
      doiToIndex[publication.doi] = i
      
      // Determine if this publication matches the filter
      // When onlyShowFiltered is true, all shown publications match by definition
      // When onlyShowFiltered is false, we need to check each publication
      const matchesFilter = onlyShowFiltered || !filter || !filter.hasActiveFilters() || filter.matches(publication)
      
      nodes.push({
        id: publication.doi,
        publication,
        isQueuingForSelected: selectedQueue.includes(publication.doi),
        isQueuingForExcluded: excludedQueue.includes(publication.doi),
        isFilteredOut: !matchesFilter,
        type: 'publication'
      })
      i++
    }
  })

  return nodes
}

/**
 * Initialize publication node DOM elements
 */
export function initializePublicationNodes(nodeSelection) {
  const publicationNodes = nodeSelection.filter((d) => d.type === 'publication')

  // Add rect element (main visual element for publication nodes)
  publicationNodes
    .append('rect')
    .attr('pointer-events', 'all')

  // Add score text (displays the publication score)
  publicationNodes.append('text').classed('score', true).attr('pointer-events', 'none')

  // Add boost indicator circle (shows boost factor visually)
  publicationNodes.append('circle')

  // Add queueing labels (+ for selected, - for excluded)
  publicationNodes
    .append('text')
    .classed('labelQueuingForSelected', true)
    .attr('pointer-events', 'none')
    .attr('x', 15)
    .attr('y', 15)
    .text('+')
  publicationNodes
    .append('text')
    .classed('labelQueuingForExcluded', true)
    .attr('pointer-events', 'none')
    .attr('x', 15)
    .attr('y', 15)
    .text('-')

  return publicationNodes
}

/**
 * Update publication node visual properties
 */
export function updatePublicationNodes(nodeSelection, activePublication, existingTooltips) {
  const publicationNodes = nodeSelection.filter((d) => d.type === 'publication')

  // Update CSS classes based on state
  publicationNodes
    .classed('selected', (d) => d.publication.isSelected)
    .classed('suggested', (d) => !d.publication.isSelected)
    .classed('queuingForSelected', (d) => d.isQueuingForSelected)
    .classed('queuingForExcluded', (d) => d.isQueuingForExcluded)
    .classed('filtered-out', (d) => d.isFilteredOut)
    .classed('is-keyword-hovered', (d) => d.publication.isKeywordHovered)
    .classed('is-author-hovered', (d) => d.publication.isAuthorHovered)

  // Clean up existing tooltips
  if (existingTooltips) {
    existingTooltips.forEach((tooltip) => tooltip.destroy())
  }

  // Set up tooltip content
  publicationNodes.attr('data-tippy-content', (d) => {
    let queueStatus = ''
    if (d.isQueuingForSelected) {
      queueStatus = ' and marked to be added to selected publications'
    } else if (d.isQueuingForExcluded) {
      queueStatus = ' and marked to be added to excluded publications'
    }

    return `<b>${d.publication.title ? d.publication.title : '[unknown title]'}</b> (${
      d.publication.authorShort ? `${d.publication.authorShort  }, ` : ''
    }${d.publication.year ? d.publication.year : '[unknown year]'})
        <br><br>
        The publication is <b>${d.publication.isSelected ? 'selected' : 'suggested'}</b>${queueStatus}.`
  })

  // Create new tooltips
  const newTooltips = tippy(publicationNodes.nodes(), {
    maxWidth: 'min(400px,70vw)',
    allowHTML: true
  })

  // Update rect fill (size and stroke depend on the active state)
  publicationNodes.select('rect').attr('fill', (d) => d.publication.scoreColor)

  // Update score text
  publicationNodes
    .select('text.score')
    .attr('y', 1)
    .attr('font-size', '0.8em')
    .text((d) => d.publication.score)

  // Update boost indicator circle
  publicationNodes.select('circle').attr('stroke', 'black')

  // Apply all active-state-dependent classes and attributes
  updateActiveState(nodeSelection, activePublication)

  return { nodes: publicationNodes, tooltips: newTooltips }
}

/**
 * Update only the visual properties that depend on the active publication.
 * Used as a lightweight alternative to a full replot when the activation changes.
 */
export function updateActiveState(nodeSelection, activePublication) {
  const publicationNodes = nodeSelection.filter((d) => d.type === 'publication')

  publicationNodes
    .classed('active', (d) => d.publication.isActive)
    .classed('linkedToActive', (d) => d.publication.isLinkedToActive)
    .classed(
      'non-active',
      (d) => activePublication && !d.publication.isActive && !d.publication.isLinkedToActive
    )

  // The active node is enlarged, affecting the rect and the boost indicator
  publicationNodes
    .select('rect')
    .attr('width', getRectSize)
    .attr('height', getRectSize)
    .attr('x', (d) => -getRectSize(d) / 2)
    .attr('y', (d) => -getRectSize(d) / 2)
    .attr('stroke-width', (d) => (d.publication.isActive ? 4 : 3))

  publicationNodes
    .select('circle')
    .attr('cx', (d) => getRectSize(d) / 2 - 1)
    .attr('cy', (d) => -getRectSize(d) / 2 + 1)
    .attr('r', (d) => (d.publication.boostFactor > 1 ? getBoostIndicatorSize(d) / 6 : 0))

  // Activating a suggested publication marks it as read
  publicationNodes
    .select('text.score')
    .classed('unread', (d) => !d.publication.isRead && !d.publication.isSelected)

  return publicationNodes
}

/**
 * Calculate rectangle size based on publication state
 */
function getRectSize(d) {
  return RECT_SIZE * (d.publication.isActive ? ENLARGE_FACTOR : 1)
}

/**
 * Calculate boost indicator size
 */
function getBoostIndicatorSize(d) {
  let internalFactor = 1
  if (d.publication.boostFactor >= 8) {
    internalFactor = 1.8
  } else if (d.publication.boostFactor >= 4) {
    internalFactor = 1.5
  } else if (d.publication.boostFactor > 1) {
    internalFactor = 1.2
  }
  return getRectSize(d) * internalFactor * 0.8
}

// Color is handled by d.publication.scoreColor from the original logic

