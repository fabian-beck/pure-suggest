/**
 * Year Labels Management for Network Visualization
 *
 * This composable handles the creation and positioning of year labels
 * in timeline mode for the citation network visualization.
 */

import { CURRENT_YEAR } from '@/constants/config.js'

const MARGIN = 50
const LABEL_WIDTH = 44
const LABEL_HEIGHT = 20
// Distance of a label's center from the left edge of its background stripe
const STRIPE_OFFSET = 24

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
    .attr('x', -STRIPE_OFFSET)
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
 * Set visibility and horizontal positioning of year labels
 */
export function updateYearLabelVisibility(labelSelection, isVisible, yearXCalculator) {
  labelSelection.selectAll('text, rect').attr('visibility', isVisible ? 'visible' : 'hidden')

  if (isVisible) {
    labelSelection.attr('transform', (d) => `translate(${yearXCalculator(d)}, 0)`)
  }
}

/**
 * Keep the year label texts at the top and bottom of the view and at constant font size,
 * whatever the zoom transform ({ k, y }) of the surrounding group
 */
export function updateYearLabelTextPositions(labelSelection, svgHeight, zoomTransform) {
  const { k, y } = zoomTransform
  const baseline = svgHeight / 2 - MARGIN
  labelSelection
    .selectAll('text')
    .attr(
      'transform',
      (_, i) =>
        `translate(${STRIPE_OFFSET / k - STRIPE_OFFSET}, ${((i === 0 ? -baseline : baseline) - y) / k}) scale(${1 / k})`
    )
}

/**
 * Rectangles [x, y, width, height] covered by the year label texts (top and bottom row),
 * in the coordinates of the zoomed group
 */
export function getYearLabelRects(yearRange, yearXCalculator, svgHeight, zoomTransform) {
  const { k, y } = zoomTransform
  const baseline = svgHeight / 2 - MARGIN
  return yearRange.flatMap((year) =>
    [-baseline, baseline].map((labelY) => [
      yearXCalculator(year) - STRIPE_OFFSET + (STRIPE_OFFSET - LABEL_WIDTH / 2) / k,
      (labelY - y - LABEL_HEIGHT) / k,
      LABEL_WIDTH / k,
      LABEL_HEIGHT / k
    ])
  )
}

/**
 * Updates year label content (data binding and text)
 * @param {Object} labelSelection - D3 selection for year labels
 * @param {Array<number>} yearRange - Array of years to display
 * @returns {Object} Updated label selection
 */
export function updateYearLabelContent(labelSelection, yearRange) {
  if (!labelSelection) {
    throw new Error('Label selection is undefined - cannot update year label content')
  }

  const updatedLabels = initializeYearLabels(labelSelection, yearRange)
  updateYearLabelText(updatedLabels)
  return updatedLabels
}

