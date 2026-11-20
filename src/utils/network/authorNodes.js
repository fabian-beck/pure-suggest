/**
 * Author Node Management
 *
 * This module handles the creation, initialization, and updating of author nodes
 * in the network visualization. Author nodes represent research authors and are
 * displayed as circular nodes with author initials.
 */

import tippy from 'tippy.js'

import { getScoreSizeFactor } from '@/utils/network/publicationNodes.js'

const AUTHOR_RADIUS = 12

/**
 * Create author node data from filtered authors
 */
export function createAuthorNodes(filteredAuthors, publications) {
  const nodes = []
  const displayedDois = new Set(publications.map((pub) => pub.doi))
  const scores = filteredAuthors.map((author) => author.score)
  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)

  filteredAuthors.forEach((author) => {
    // Check if this author has any publications in the displayed set
    const hasDisplayedPublications = author.publicationDois.some((doi) => displayedDois.has(doi))
    if (hasDisplayedPublications) {
      nodes.push({
        id: author.id,
        author,
        sizeFactor: getScoreSizeFactor(author.score, minScore, maxScore),
        type: 'author'
      })
    }
  })

  return nodes
}

/**
 * Create author links connecting authors to publications
 */
export function createAuthorLinks(filteredAuthors, publications, doiToIndex) {
  const links = []
  const displayedDois = new Set(publications.map((pub) => pub.doi))

  filteredAuthors.forEach((author) => {
    const hasDisplayedPublications = author.publicationDois.some((doi) => displayedDois.has(doi))
    if (hasDisplayedPublications) {
      author.publicationDois.forEach((doi) => {
        if (doi in doiToIndex) {
          links.push({
            source: author.id,
            target: doi,
            type: 'author'
          })
        }
      })
    }
  })

  return links
}

/**
 * Initialize author node DOM elements
 */
// @indirection-reviewed: architectural-consistency - part of initialize*Nodes pattern for different node types
export function initializeAuthorNodes(nodeSelection) {
  const authorNodes = nodeSelection.filter((d) => d.type === 'author')

  // Add circle element
  authorNodes.append('circle').attr('pointer-events', 'all').attr('fill', 'black')

  // Add text element for initials
  authorNodes.append('text').attr('pointer-events', 'none')

  return authorNodes
}

/**
 * Radius of an author node based on the author score
 */
export function getAuthorRadius(d) {
  return AUTHOR_RADIUS * d.sizeFactor
}

/**
 * Font size of the initials, fitting them into the author node
 */
function getInitialsFontSize(d) {
  const { length } = d.author.initials
  let size = 0.85
  if (length > 3) {
    size = 0.6
  } else if (length > 2) {
    size = 0.7
  }
  return `${size * d.sizeFactor}rem`
}

/**
 * Update author node visual properties
 */
export function updateAuthorNodes(nodeSelection, activePublication, existingTooltips) {
  const authorNodes = nodeSelection.filter((d) => d.type === 'author')

  // Update CSS classes based on state
  authorNodes
    .classed('linkedToActive', (d) => d.author.publicationDois.includes(activePublication?.doi))
    .classed(
      'non-active',
      (d) => activePublication && !d.author.publicationDois.includes(activePublication?.doi)
    )

  // Clean up existing tooltips
  if (existingTooltips) {
    existingTooltips.forEach((tooltip) => tooltip.destroy())
  }

  // Set up tooltip content
  authorNodes.attr('data-tippy-content', (d) => {
    const yearDisplay =
      d.author.yearMin === d.author.yearMax
        ? `in <b>${d.author.yearMin}</b>`
        : `between <b>${d.author.yearMin}</b> and <b>${d.author.yearMax}</b>`

    return `<b>${d.author.name}</b> is linked 
            to <b>${d.author.count}</b> selected publication${d.author.count > 1 ? 's' : ''}, 
            published ${yearDisplay},
            with an aggregated, weighted score of <b>${d.author.score}</b>.               
        `
  })

  // Create new tooltips
  const newTooltips = tippy(authorNodes.nodes(), {
    maxWidth: 'min(400px,70vw)',
    allowHTML: true
  })

  authorNodes.select('circle').attr('r', getAuthorRadius)

  // Update text content and styling
  authorNodes
    .select('text')
    .text((d) => d.author.initials)
    .style('font-size', getInitialsFontSize)

  return { nodes: authorNodes, tooltips: newTooltips }
}

/**
 * Highlight publications authored by the specified author
 */
export function highlightAuthorPublications(authorNode, publications) {
  publications.forEach((publication) => {
    if (authorNode.author.publicationDois.includes(publication.doi)) {
      publication.isAuthorHovered = true
    }
  })
}

/**
 * Clear author highlighting from all publications
 */
// @indirection-reviewed: architectural-consistency - matches clearKeywordHighlight pattern
export function clearAuthorHighlight(publications) {
  publications.forEach((publication) => {
    publication.isAuthorHovered = false
  })
}
