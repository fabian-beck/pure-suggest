import * as d3 from 'd3'
import { describe, it, expect } from 'vitest'

import { updateNetworkLinks } from '@/utils/network/links.js'

describe('updateNetworkLinks', () => {
  it('keeps the link elements when replotting links whose ends were resolved to nodes', () => {
    const createLinks = () => [
      { source: 'a', target: 'b', type: 'citation' },
      { source: 'k', target: 'b', type: 'keyword' }
    ]
    const svg = d3.select(document.body).append('svg')
    let selection = updateNetworkLinks(svg.append('g').selectAll('path'), createLinks())
    const elements = selection.nodes()
    // The simulation replaces the ids of the link ends with the nodes
    selection.each((link) => {
      link.source = { id: link.source }
      link.target = { id: link.target }
    })

    selection = updateNetworkLinks(selection, createLinks())

    expect(selection.nodes()).toHaveLength(2)
    selection.nodes().forEach((element, i) => expect(element).toBe(elements[i]))
  })
})
