/**
 * Author Node Management
 *
 * This module handles the creation, initialization, and updating of author nodes
 * in the network visualization. Author nodes represent research authors and are
 * displayed as circular nodes with author initials.
 */

import tippy from 'tippy.js'

/**
 * Create author node data from filtered authors
 */
export function createAuthorNodes(filteredAuthors, publications) {
  const nodes = []
  const displayedDois = new Set(publications.map((pub) => pub.doi))

  filteredAuthors.forEach((author) => {
    // Check if this author has any publications in the displayed set
    const hasDisplayedPublications = author.publicationDois.some((doi) => displayedDois.has(doi))
    if (hasDisplayedPublications) {
      nodes.push({
        id: author.id,
        author: author,
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
export function initializeAuthorNodes(
  nodeSelection,
  authorNodeMouseover,
  authorNodeMouseout,
  authorNodeClick
) {
  const authorNodes = nodeSelection.filter((d) => d.type === 'author')

  // Add circle element
  authorNodes.append('circle').attr('pointer-events', 'all').attr('r', 12).attr('fill', 'black')

  // Add text element for initials
  authorNodes.append('text').attr('pointer-events', 'none')

  // Add event handlers
  authorNodes
    .on('mouseover', authorNodeMouseover)
    .on('mouseout', authorNodeMouseout)
    .on('click', authorNodeClick)

  return authorNodes
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

  // Update text content and styling
  authorNodes
    .select('text')
    .text((d) => d.author.initials)
    .classed('long', (d) => d.author.initials.length > 2)
    .classed('very-long', (d) => d.author.initials.length > 3)

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
export function clearAuthorHighlight(publications) {
  publications.forEach((publication) => {
    publication.isAuthorHovered = false
  })
}
