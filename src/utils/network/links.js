/**
 * Network Link Management
 *
 * This module handles the creation, initialization, and updating of links
 * in the network visualization. Links represent relationships between nodes
 * including citations, keywords, and authors.
 */

/**
 * Create citation links between publications
 */
export function createCitationLinks(selectedPublications, isSelectedFn, doiToIndex) {
  const links = []
  const linkSet = new Set() // Track unique links to avoid duplicates

  selectedPublications.forEach((publication) => {
    if (publication.doi in doiToIndex) {
      // Create links for citations (papers this publication cites)
      publication.citationDois.forEach((citationDoi) => {
        if (citationDoi in doiToIndex) {
          const linkKey = `${citationDoi}→${publication.doi}`
          if (!linkSet.has(linkKey)) {
            linkSet.add(linkKey)
            links.push({
              source: citationDoi,
              target: publication.doi,
              type: 'citation',
              internal: isSelectedFn(citationDoi)
            })
          }
        }
      })

      // Create links for references (papers that cite this publication)
      publication.referenceDois.forEach((referenceDoi) => {
        if (referenceDoi in doiToIndex) {
          const linkKey = `${publication.doi}→${referenceDoi}`
          if (!linkSet.has(linkKey)) {
            linkSet.add(linkKey)
            links.push({
              source: publication.doi,
              target: referenceDoi,
              type: 'citation',
              internal: isSelectedFn(referenceDoi)
            })
          }
        }
      })
    }
  })

  return links
}

/**
 * Update link DOM elements with data binding
 */
// @indirection-reviewed: meaningful-abstraction - D3 data binding abstraction adds clarity
export function updateNetworkLinks(linkSelection, links) {
  // Link ends are ids in new links, but nodes once the simulation has resolved them
  return linkSelection
    .data(links, (d) => [d.type, d.source.id ?? d.source, d.target.id ?? d.target].join('|'))
    .join('path')
}

/**
 * Calculate link path geometry for different link types
 */
export function calculateLinkPath(d) {
  const dx = d.target.x - d.source.x
  const dy = d.target.y - d.source.y

  // Curved link for citations
  if (d.type === 'citation') {
    const dr = (dx * dx + dy * dy)**0.6
    return `M${d.target.x},${d.target.y}A${dr},${dr} 0 0,1 ${d.source.x},${d.source.y}`
  }

  // Tapered links for keywords and authors:
  // Drawing a triangle as part of a circle segment with its center at the target node
  const r = Math.sqrt(dx**2 + dy**2)
  const alpha = Math.acos(dx / r)
  const beta = 2 / r
  const x1 = r * Math.cos(alpha + beta)
  let y1 = r * Math.sin(alpha + beta)
  const x2 = r * Math.cos(alpha - beta)
  let y2 = r * Math.sin(alpha - beta)

  if (d.source.y > d.target.y) {
    y1 = -y1
    y2 = -y2
  }

  return `M${d.target.x - x1},${d.target.y - y1}
        L${d.target.x},${d.target.y}
        L${d.target.x - x2},${d.target.y - y2}`
}

/**
 * Calculate CSS classes for link styling based on state
 */
export function calculateLinkClasses(d, activePublication) {
  const classes = [d.type]

  if (d.type === 'citation') {
    if (activePublication) {
      if (d.source.publication.isActive || d.target.publication.isActive) {
        classes.push('active')
      } else {
        classes.push('non-active')
      }
    }
    if (!(d.source.publication.isSelected && d.target.publication.isSelected)) {
      classes.push('external')
    }
  } else if (d.type === 'keyword' || d.type === 'author') {
    if (activePublication) {
      if (d.target.publication.isActive) {
        classes.push('active')
      } else {
        classes.push('non-active')
      }
    }
  }

  return classes.join(' ')
}

