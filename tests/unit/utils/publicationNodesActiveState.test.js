import * as d3 from 'd3'
import { describe, expect, it, vi } from 'vitest'

import {
  initializePublicationNodes,
  updatePublicationNodes,
  updateActiveState
} from '@/utils/network/publicationNodes.js'

vi.mock('tippy.js', () => ({ default: vi.fn(() => []) }))

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

function buildNodeSelection(publications) {
  document.body.innerHTML = '<svg><g class="nodes"></g></svg>'
  const data = publications.map((publication) => ({
    id: publication.doi,
    publication,
    type: 'publication',
    isQueuingForSelected: false,
    isQueuingForExcluded: false,
    isFilteredOut: false
  }))
  const selection = d3
    .select('svg g.nodes')
    .selectAll('g')
    .data(data, (d) => d.id)
    .join('g')
    .attr('class', 'node-container publication')
  initializePublicationNodes(selection)
  updatePublicationNodes(selection, null, undefined)
  return selection
}

describe('updateActiveState', () => {
  it('applies active highlighting and enlarges the active node', () => {
    const active = createPublication('a', { isActive: true })
    const linked = createPublication('b', { isLinkedToActive: true })
    const other = createPublication('c')
    const selection = buildNodeSelection([active, linked, other])

    updateActiveState(selection, active)

    const [activeGroup, linkedGroup, otherGroup] = document.querySelectorAll('g.node-container')
    expect(activeGroup.classList.contains('active')).toBe(true)
    expect(activeGroup.querySelector('rect').getAttribute('width')).toBe('30')
    expect(activeGroup.querySelector('rect').getAttribute('stroke-width')).toBe('4')
    expect(linkedGroup.classList.contains('linkedToActive')).toBe(true)
    expect(linkedGroup.classList.contains('non-active')).toBe(false)
    expect(otherGroup.classList.contains('non-active')).toBe(true)
    expect(otherGroup.querySelector('rect').getAttribute('width')).toBe('20')
    expect(otherGroup.querySelector('rect').getAttribute('stroke-width')).toBe('3')
  })

  it('restores nodes when the active publication is cleared', () => {
    const publication = createPublication('a', { isActive: true })
    const selection = buildNodeSelection([publication])
    updateActiveState(selection, publication)

    publication.isActive = false
    updateActiveState(selection, null)

    const group = document.querySelector('g.node-container')
    expect(group.classList.contains('active')).toBe(false)
    expect(group.classList.contains('non-active')).toBe(false)
    expect(group.querySelector('rect').getAttribute('width')).toBe('20')
    expect(group.querySelector('rect').getAttribute('stroke-width')).toBe('3')
  })

  it('unmarks the score of an activated suggested publication as unread', () => {
    const suggested = createPublication('a')
    const selection = buildNodeSelection([suggested])
    expect(document.querySelector('text.score').classList.contains('unread')).toBe(true)

    suggested.isActive = true
    suggested.isRead = true
    updateActiveState(selection, suggested)

    expect(document.querySelector('text.score').classList.contains('unread')).toBe(false)
  })
})
