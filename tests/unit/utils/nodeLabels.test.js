import * as d3 from 'd3'
import { describe, expect, it, vi } from 'vitest'

import {
  loadLabelEngine,
  getNodeLabelText,
  createNodeLabelProblem,
  placeNodeLabels,
  renderNodeLabels,
  updateNodeLabelPositions
} from '@/utils/network/nodeLabels.js'

// Vitest resolves the package's Node entry, which reads the module from a file path
vi.mock('@label-anything/wasm/label_anything_bg.wasm?url', () => ({
  default: 'node_modules/@label-anything/wasm/wasm/label_anything_bg.wasm'
}))

function publicationNode(doi, x, y, publication = {}) {
  return {
    id: doi,
    type: 'publication',
    x,
    y,
    isFilteredOut: false,
    publication: { doi, authorShort: 'Smith et al.', year: 2010, score: 1, ...publication }
  }
}

function authorNode(name, x, y, score = 1) {
  return { id: name, type: 'author', x, y, author: { name, score, publicationDois: [] } }
}

function createProblem(nodes, links = [], scale = 1) {
  const problem = createNodeLabelProblem(nodes, links, (node) => node.x, scale)
  problem.canvas = { width: 800, height: 400 }
  problem.transform = [scale, 0, 0, scale, 400, 200]
  return problem
}

describe('nodeLabels', () => {
  it('formats publication and author labels', () => {
    expect(getNodeLabelText(publicationNode('a', 0, 0))).toBe('Smith et al., 2010')
    expect(getNodeLabelText(publicationNode('a', 0, 0, { authorShort: undefined }))).toBe('2010')
    expect(getNodeLabelText(authorNode('Smith, John', 0, 0))).toBe('Smith, John')
    expect(getNodeLabelText({ id: 'vis', type: 'keyword' })).toBeNull()
  })

  it('keeps layout coordinates and scales the marks with the zoom', () => {
    const problem = createProblem(
      [publicationNode('a', 10, -20), authorNode('Smith, John', -50, 0)],
      [],
      2
    )

    expect(problem.items[0].anchor).toMatchObject({ x: 10, y: -20, mark: { shape: 'rect', w: 46 } })
    expect(problem.items[1].anchor).toMatchObject({ x: -50, y: 0, mark: { shape: 'circle', r: 24 } })
  })

  it('treats keywords as obstacles instead of labeling them', () => {
    const problem = createProblem([
      publicationNode('a', 0, 0),
      { id: 'visual', type: 'keyword', x: 100, y: 0 }
    ])

    expect(problem.items.map((item) => item.id)).toEqual(['a'])
    expect(problem.obstacles.vector[1]).toEqual({ class: 'text', rects: [[80.5, -8, 39, 16]] })
  })

  it('ranks priorities by score within selected, suggested, and author nodes', () => {
    const problem = createProblem([
      publicationNode('selected-low', 0, 0, { isSelected: true, score: 2 }),
      publicationNode('selected-high', 50, 0, { isSelected: true, score: 9 }),
      publicationNode('suggested', 100, 0, { score: 1 }),
      authorNode('Smith, John', 150, 0, 5)
    ])

    expect(problem.items.map((item) => item.priority)).toEqual([0.5, 1, 1, 1])
  })

  it('prefers the active publication and nodes linked to it', () => {
    const problem = createProblem([
      publicationNode('active', 0, 0, { isActive: true }),
      publicationNode('linked', 50, 0, { isLinkedToActive: true }),
      publicationNode('other', 100, 0),
      { ...publicationNode('filtered', 150, 0), isFilteredOut: true },
      { ...authorNode('Smith, John', 200, 0), author: { name: 'Smith, John', score: 1, publicationDois: ['active'] } }
    ])

    expect(problem.items.map((item) => item.tier)).toEqual([2, 1, 0, -1, 1])
    expect(problem.items[0].anchor.mark.w).toBeGreaterThan(problem.items[1].anchor.mark.w)
  })

  it('adds citation links as soft obstacles', () => {
    const a = publicationNode('a', -100, 0)
    const b = publicationNode('b', 100, 0)
    const problem = createProblem(
      [a, b],
      [
        { type: 'citation', source: a, target: b },
        { type: 'author', source: a, target: b }
      ]
    )

    const [arc] = problem.obstacles.vector[0].polylines
    expect(problem.obstacles.vector[0].polylines).toHaveLength(1)
    expect(arc[0]).toEqual([100, 0])
    expect(arc.at(-1)).toEqual([-100, 0])
    expect(arc[3][1]).toBeGreaterThan(0)
  })

  it('places labels without overlaps and lets them follow their nodes', async () => {
    expect(placeNodeLabels(createProblem([publicationNode('a', 0, 0)]))).toBeNull()

    await loadLabelEngine()
    const nodes = [
      publicationNode('a', 0, 0, { isSelected: true }),
      publicationNode('b', 30, 0),
      authorNode('Smith, John', 0, 40)
    ]
    const result = placeNodeLabels(createProblem(nodes))

    expect(result.stats).toMatchObject({ placed: 3, hard_violations: 0 })

    document.body.innerHTML = '<svg><g class="node-labels"></g></svg>'
    const labels = renderNodeLabels(d3.select('g.node-labels').selectAll('g'), result, nodes, null)

    expect(labels.nodes().map((node) => node.getAttribute('class'))).toEqual([
      'node-label selected',
      'node-label suggested',
      'node-label author'
    ])
    expect(labels.select('text').nodes().map((node) => node.textContent)).toEqual([
      'Smith et al., 2010',
      'Smith et al., 2010',
      'Smith, John'
    ])

    nodes[0].x = 100
    updateNodeLabelPositions(labels, (node) => node.x, d3.zoomIdentity.translate(400, 200))
    expect(labels.nodes()[0].getAttribute('transform')).toBe('translate(500, 200)')
  })
})
