/**
 * Keyword Node Management
 *
 * This module handles the creation, initialization, and updating of keyword nodes
 * in the network visualization. Keyword nodes represent research keywords and are
 * displayed as text-based nodes that can be dragged and repositioned.
 */

import tippy from 'tippy.js'
import * as d3 from 'd3'

/**
 * Create keyword node data from unique boost keywords
 */
export function createKeywordNodes(uniqueBoostKeywords, publications) {
  const nodes = []

  uniqueBoostKeywords.forEach((keyword) => {
    const frequency = publications.filter((publication) =>
      publication.boostKeywords.includes(keyword)
    ).length

    nodes.push({
      id: keyword,
      frequency,
      type: 'keyword'
    })
  })

  return nodes
}

/**
 * Create keyword links connecting keywords to publications
 */
export function createKeywordLinks(uniqueBoostKeywords, publicationsFiltered, doiToIndex) {
  const links = []

  uniqueBoostKeywords.forEach((keyword) => {
    publicationsFiltered.forEach((publication) => {
      if (publication.doi in doiToIndex && publication.boostKeywords.includes(keyword)) {
        links.push({
          source: keyword,
          target: publication.doi,
          type: 'keyword'
        })
      }
    })
  })

  return links
}

/**
 * Initialize keyword node DOM elements
 */
export function initializeKeywordNodes(
  nodeSelection,
  keywordNodeDrag,
  keywordNodeClick,
  keywordNodeMouseover,
  keywordNodeMouseout
) {
  const keywordNodes = nodeSelection.filter((d) => d.type === 'keyword')

  // Add text element
  keywordNodes.append('text')

  // Add event handlers
  keywordNodes
    .call(keywordNodeDrag())
    .on('click', keywordNodeClick)
    .on('mouseover', keywordNodeMouseover)
    .on('mouseout', keywordNodeMouseout)

  return keywordNodes
}

/**
 * Update keyword node visual properties
 */
export function updateKeywordNodes(nodeSelection, activePublication, existingTooltips) {
  const keywordNodes = nodeSelection.filter((d) => d.type === 'keyword')

  // Update CSS classes based on state
  keywordNodes
    .classed(
      'linkedToActive',
      (d) => activePublication && activePublication.boostKeywords.includes(d.id)
    )
    .classed(
      'non-active',
      (d) => activePublication && !activePublication.boostKeywords.includes(d.id)
    )

  // Clean up existing tooltips
  if (existingTooltips) {
    existingTooltips.forEach((tooltip) => tooltip.destroy())
  }

  // Set up tooltip content
  keywordNodes.attr('data-tippy-content', (d) => {
    const isLinked = activePublication && activePublication.boostKeywords.includes(d.id)
    return `Keyword <b>${d.id}</b> is matched in <b>${d.frequency}</b> publication${d.frequency > 1 ? 's' : ''}${
      isLinked ? ', and also linked to the currently active publication' : ''
    }.<br><br><i>Drag to reposition (sticky), click to detach.</i>`
  })

  // Create new tooltips
  const newTooltips = tippy(keywordNodes.nodes(), {
    maxWidth: 'min(400px,70vw)',
    allowHTML: true
  })

  // Update text content and styling
  keywordNodes
    .select('text')
    .attr('font-size', (d) => {
      if (d.frequency >= 10) return '0.8em'
      return '0.7em'
    })
    .text((d) => {
      if (d.id.includes('|')) {
        return `${d.id.split('|')[0]  }|..`
      }
      return d.id
    })

  return { nodes: keywordNodes, tooltips: newTooltips }
}

/**
 * Release fixed positioning from a keyword node
 */
export function releaseKeywordPosition(event, keywordNode, networkSimulation, SIMULATION_ALPHA) {
  delete keywordNode.fx
  delete keywordNode.fy
  d3.select(event.target.parentNode).classed('fixed', false)
  networkSimulation.restart(SIMULATION_ALPHA)
}

/**
 * Highlight publications that contain the specified keyword
 */
export function highlightKeywordPublications(keywordNode, publications) {
  publications.forEach((publication) => {
    if (publication.boostKeywords.includes(keywordNode.id)) {
      publication.isKeywordHovered = true
    }
  })
}

/**
 * Clear keyword highlighting from all publications
 */
export function clearKeywordHighlight(publications) {
  publications.forEach((publication) => {
    publication.isKeywordHovered = false
  })
}

/**
 * Create drag behavior for keyword nodes
 */
export function createKeywordNodeDrag(networkSimulation, SIMULATION_ALPHA) {
  function dragStart() {
    d3.select(this).classed('fixed', true)
    networkSimulation.setDragging(true)
  }

  function dragMove(event, d) {
    d.fx = event.x
    d.fy = event.y
    networkSimulation.restart(SIMULATION_ALPHA)
  }

  function dragEnd() {
    networkSimulation.setDragging(false)
  }

  return d3.drag().on('start', dragStart).on('drag', dragMove).on('end', dragEnd)
}
