import * as d3 from 'd3'
import { describe, it, expect } from 'vitest'

import { getCitationTimeWeight, updateNetworkLinks } from '@/utils/network/links.js'

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

describe('getCitationTimeWeight', () => {
  const createLink = (sourceYear, targetYear) => ({
    source: { publication: { year: sourceYear } },
    target: { publication: { year: targetYear } }
  })

  it('weakens citations the more years lie between the publications, few years only slightly', () => {
    const sameYear = getCitationTimeWeight(createLink(2020, 2020))
    const fewYears = getCitationTimeWeight(createLink(2017, 2020))
    const manyYears = getCitationTimeWeight(createLink(1990, 2020))

    expect(sameYear).toBe(1)
    expect(fewYears).toBeLessThan(sameYear)
    expect(fewYears).toBeGreaterThan(0.75)
    expect(manyYears).toBeLessThan(fewYears / 2)
    expect(manyYears).toBeGreaterThan(0)
  })

  it('does not weaken citations of publications without a year', () => {
    expect(getCitationTimeWeight(createLink(undefined, 2020))).toBe(1)
  })
})
