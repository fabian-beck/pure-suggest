import * as d3 from 'd3'
import tippy from 'tippy.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  initializePublicationNodes,
  updatePublicationNodes
} from '@/utils/network/publicationNodes.js'

vi.mock('tippy.js', () => ({
  default: vi.fn((elements) =>
    elements.map((element) => ({
      reference: element,
      setContent: vi.fn(),
      destroy: vi.fn()
    }))
  )
}))

function createPublication(doi, overrides = {}) {
  return {
    doi,
    title: `Title ${doi}`,
    year: 2020,
    score: 3,
    scoreColor: '#fff',
    boostFactor: 1,
    isSelected: false,
    isActive: false,
    isLinkedToActive: false,
    isRead: false,
    ...overrides
  }
}

function bindNodes(publications, dataOverrides = {}) {
  const data = publications.map((publication) => ({
    id: publication.doi,
    publication,
    type: 'publication',
    isQueuingForSelected: false,
    isQueuingForExcluded: false,
    isFilteredOut: false,
    ...dataOverrides
  }))
  return d3
    .select('svg g.nodes')
    .selectAll('g')
    .data(data, (d) => d.id)
    .join((enter) => {
      const g = enter.append('g').attr('class', 'node-container publication')
      initializePublicationNodes(g)
      return g
    })
}

describe('updatePublicationNodes tooltips', () => {
  beforeEach(() => {
    document.body.innerHTML = '<svg><g class="nodes"></g></svg>'
    vi.mocked(tippy).mockClear()
  })

  it('reuses tooltip instances in place when the node set is unchanged', () => {
    const publications = [createPublication('a'), createPublication('b')]
    const selection = bindNodes(publications)
    const { tooltips } = updatePublicationNodes(selection, null, undefined)
    expect(tippy).toHaveBeenCalledTimes(1)

    const rebound = bindNodes(publications, { isQueuingForSelected: true })
    const { tooltips: reusedTooltips } = updatePublicationNodes(rebound, null, tooltips)

    expect(tippy).toHaveBeenCalledTimes(1)
    expect(reusedTooltips).toBe(tooltips)
    tooltips.forEach((tooltip) => {
      expect(tooltip.destroy).not.toHaveBeenCalled()
      expect(tooltip.setContent).toHaveBeenCalledWith(
        expect.stringContaining('marked to be added to selected publications')
      )
    })
  })

  it('recreates tooltips when a publication is replaced at equal node count', () => {
    const selection = bindNodes([createPublication('a'), createPublication('b')])
    const { tooltips } = updatePublicationNodes(selection, null, undefined)

    const rebound = bindNodes([createPublication('a'), createPublication('c')])
    const { tooltips: newTooltips } = updatePublicationNodes(rebound, null, tooltips)

    expect(tippy).toHaveBeenCalledTimes(2)
    expect(newTooltips).not.toBe(tooltips)
    tooltips.forEach((tooltip) => expect(tooltip.destroy).toHaveBeenCalled())
    expect(newTooltips.map((tooltip) => tooltip.reference)).toEqual(rebound.nodes())
  })

  it('recreates tooltips when publications are added', () => {
    const selection = bindNodes([createPublication('a')])
    const { tooltips } = updatePublicationNodes(selection, null, undefined)

    const rebound = bindNodes([createPublication('a'), createPublication('b')])
    const { tooltips: newTooltips } = updatePublicationNodes(rebound, null, tooltips)

    expect(tippy).toHaveBeenCalledTimes(2)
    tooltips.forEach((tooltip) => expect(tooltip.destroy).toHaveBeenCalled())
    expect(newTooltips).toHaveLength(2)
  })
})
