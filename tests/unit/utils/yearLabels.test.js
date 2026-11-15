import * as d3 from 'd3'
import { describe, it, expect } from 'vitest'

import {
  getYearLabelRects,
  updateYearLabelContent,
  updateYearLabelTextPositions
} from '@/utils/network/yearLabels.js'

describe('year labels under zoom and pan', () => {
  const viewHeight = 300
  const zoomTransform = { k: 2, x: 30, y: 40 }

  it('keeps the texts at the top and bottom of the view at constant font size', () => {
    const group = d3.select(document.createElementNS('http://www.w3.org/2000/svg', 'g'))
    const labels = updateYearLabelContent(group.selectAll('g'), [2000])
    updateYearLabelTextPositions(labels, viewHeight, zoomTransform)

    const transforms = labels
      .selectAll('text')
      .nodes()
      .map((text) => text.getAttribute('transform'))
    // On screen: k * y + zoomTransform.y = -129 and 139, close to the borders at -/+ 150
    expect(transforms).toEqual([
      'translate(-12, -84.5) scale(0.5)',
      'translate(-12, 49.5) scale(0.5)'
    ])
  })

  it('reports the label rectangles in the coordinates of the zoomed group', () => {
    const rects = getYearLabelRects([2000], () => 10, viewHeight, zoomTransform)
    expect(rects).toEqual([
      [-13, -92, 22, 10],
      [-13, 42, 22, 10]
    ])
  })
})
