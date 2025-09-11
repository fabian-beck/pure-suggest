/**
 * Year Labels Management for Network Visualization
 *
 * This composable handles the creation and positioning of year labels
 * in timeline mode for the citation network visualization.
 */

import { CURRENT_YEAR } from '@/constants/config.js'

const MARGIN = 50

/**
 * Generate array of years to display as labels (every 5 years)
 */
export function generateYearRange(yearMin, yearMax) {
  if (yearMin === undefined || yearMax === undefined) {
    return []
  }

  const rangeLength = yearMax - yearMin + 6
  const startYear = yearMin - 4

  return Array.from({ length: rangeLength }, (_, i) => startYear + i).filter(
    (year) => year % 5 === 0
  )
}

/**
 * Initialize year label elements in the SVG
 */
export function initializeYearLabels(labelSelection, yearRange) {
  return labelSelection
    .data(yearRange, (d) => d)
    .join((enter) => {
      const g = enter.append('g')
      g.append('rect')
      g.append('text')
      g.append('text')
      return g
    })
}

/**
 * Update year label rectangles (background stripes)
 */
export function updateYearLabelRects(labelSelection, yearXCalculator) {
  labelSelection
    .selectAll('rect')
    .attr('width', (d) => yearXCalculator(Math.min(d + 5, CURRENT_YEAR)) - yearXCalculator(d))
    .attr('height', 20000)
    .attr('fill', (d) => (d % 10 === 0 ? '#fafafa' : 'white'))
    .attr('x', -24)
    .attr('y', -10000)
}

/**
 * Update year label text elements
 */
export function updateYearLabelText(labelSelection) {
  labelSelection
    .selectAll('text')
    .attr('text-anchor', 'middle')
    .text((d) => d)
    .attr('fill', 'grey')
}

/**
 * Set visibility and positioning of year labels
 */
export function updateYearLabelVisibility(labelSelection, isVisible, yearXCalculator, svgHeight) {
  labelSelection.selectAll('text, rect').attr('visibility', isVisible ? 'visible' : 'hidden')

  if (isVisible) {
    labelSelection
      .attr('transform', (d) => `translate(${yearXCalculator(d)}, ${svgHeight / 2 - MARGIN})`)
      .select('text')
      .attr('y', -svgHeight + 2 * MARGIN)
  }
}

/**
 * Complete year labels update function
 * This is the main function that orchestrates all year label updates
 */
export function updateYearLabels(
  labelSelection,
  hasPublications,
  yearMin,
  yearMax,
  shouldShow,
  yearXCalculator,
  svgHeight
) {
  // Early return if no publications
  if (!hasPublications) {
    return labelSelection
  }

  // Validate label selection
  if (!labelSelection) {
    throw new Error('Label selection is undefined - cannot update year labels')
  }

  // Generate year range and initialize labels
  const yearRange = generateYearRange(yearMin, yearMax)
  const updatedLabels = initializeYearLabels(labelSelection, yearRange)

  // Update visual properties
  updateYearLabelRects(updatedLabels, yearXCalculator)
  updateYearLabelText(updatedLabels)

  // Set visibility and positioning
  updateYearLabelVisibility(updatedLabels, shouldShow, yearXCalculator, svgHeight)

  return updatedLabels
}
