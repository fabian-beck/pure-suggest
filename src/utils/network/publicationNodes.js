/**
 * Publication Node Management
 *
 * This module handles the creation, initialization, and updating of publication nodes
 * in the network visualization. Publication nodes are displayed Litmaps-style as
 * circles whose radius grows with the number of citations, labelled with the first
 * author and year below the circle.
 */

import tippy from 'tippy.js'

const MIN_RADIUS = 7
const MAX_RADIUS = 20
// Citation count at which a node reaches its maximum size (capped beyond this)
const CITATION_CAP = 30
const ACTIVE_ENLARGE_FACTOR = 1.3

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

  // Main circle (size encodes citations)
  publicationNodes.append('circle').classed('node-shape', true).attr('pointer-events', 'all')

  // Boost indicator circle (shows boost factor visually)
  publicationNodes.append('circle').classed('boost', true).attr('pointer-events', 'none')

  // Label below the node: "First author, year"
  publicationNodes.append('text').classed('node-label', true).attr('pointer-events', 'none')

  // Queueing labels (+ for selected, - for excluded)
  publicationNodes
    .append('text')
    .classed('labelQueuingForSelected', true)
    .attr('pointer-events', 'none')
    .attr('y', 1)
    .text('+')
  publicationNodes
    .append('text')
    .classed('labelQueuingForExcluded', true)
    .attr('pointer-events', 'none')
    .attr('y', 1)
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
    .classed('active', (d) => d.publication.isActive)
    .classed('linkedToActive', (d) => d.publication.isLinkedToActive)
    .classed(
      'non-active',
      (d) => activePublication && !d.publication.isActive && !d.publication.isLinkedToActive
    )
    .classed('queuingForSelected', (d) => d.isQueuingForSelected)
    .classed('queuingForExcluded', (d) => d.isQueuingForExcluded)
    .classed('filtered-out', (d) => d.isFilteredOut)
    .classed('is-keyword-hovered', (d) => d.publication.isKeywordHovered)
    .classed('is-author-hovered', (d) => d.publication.isAuthorHovered)

  // Build tooltip content strings
  const nodes = publicationNodes.nodes()
  const contents = nodes.map((_, i) => {
    const d = nodes[i].__data__
    let queueStatus = ''
    if (d.isQueuingForSelected) {
      queueStatus = ' and marked to be added to selected publications'
    } else if (d.isQueuingForExcluded) {
      queueStatus = ' and marked to be added to excluded publications'
    }
    return `<b>${d.publication.title ? d.publication.title : '[unknown title]'}</b> (${
      d.publication.authorShort ? `${d.publication.authorShort}, ` : ''
    }${d.publication.year ? d.publication.year : '[unknown year]'})
        <br><br>
        The publication is <b>${d.publication.isSelected ? 'selected' : 'suggested'}</b>${queueStatus}.`
  })

  let newTooltips
  if (existingTooltips && existingTooltips.length === nodes.length) {
    // Update content in-place — no destroy/recreate needed
    existingTooltips.forEach((tooltip, i) => tooltip.setContent(contents[i]))
    newTooltips = existingTooltips
  } else {
    if (existingTooltips) existingTooltips.forEach((t) => t.destroy())
    nodes.forEach((el, i) => el.setAttribute('data-tippy-content', contents[i]))
    newTooltips = tippy(nodes, { maxWidth: 'min(400px,70vw)', allowHTML: true })
  }

  // Update main circle (radius encodes citations)
  publicationNodes.select('circle.node-shape').attr('r', getNodeRadius)


  // Update boost indicator circle (top-right edge of the node)
  publicationNodes
    .select('circle.boost')
    .attr('cx', (d) => getNodeRadius(d) * 0.7)
    .attr('cy', (d) => -getNodeRadius(d) * 0.7)
    .attr('r', (d) =>
      d.publication.boostFactor > 1 ? Math.min(6, Math.max(3, getNodeRadius(d) * 0.35)) : 0
    )

  // Update label below the node
  publicationNodes
    .select('text.node-label')
    .attr('y', (d) => getNodeRadius(d) + 11)
    .text(getNodeLabel)

  return { nodes: publicationNodes, tooltips: newTooltips }
}

/**
 * Lightweight update for active/linked-to-active state changes.
 * Avoids a full D3 join — only updates CSS classes and the active node's radius.
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
  publicationNodes.select('circle.node-shape').attr('r', getNodeRadius)
}

/**
 * Number of citations used to size the node
 */
function getCitationMagnitude(d) {
  return d.publication.citationDois?.size ?? d.publication.citationCount ?? 0
}

/**
 * Calculate circle radius from citation count.
 * Scales from MIN_RADIUS up to MAX_RADIUS, reaching the maximum at CITATION_CAP
 * citations; anything above that stays at the maximum size.
 */
function getNodeRadius(d) {
  const citations = Math.min(getCitationMagnitude(d), CITATION_CAP)
  const radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.sqrt(citations / CITATION_CAP)
  return radius * (d.publication.isActive ? ACTIVE_ENLARGE_FACTOR : 1)
}

/**
 * "First author, year" label shown below the node
 */
function getNodeLabel(d) {
  const year = d.publication.year || ''
  const firstAuthor = d.publication.author
    ? d.publication.author.split(';')[0].split(',')[0].trim()
    : ''
  if (firstAuthor) {
    return year ? `${firstAuthor}, ${year}` : firstAuthor
  }
  return year || ''
}
