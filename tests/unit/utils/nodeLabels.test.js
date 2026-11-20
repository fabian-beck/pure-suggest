import * as d3 from 'd3'
import { describe, expect, it, vi } from 'vitest'

import {
  loadLabelEngine,
  getNodeLabelText,
  createNodeLabelProblem,
  limitNodeLabels,
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
    sizeFactor: 1,
    publication: { doi, authorShort: 'Smith et al.', year: 2010, score: 1, ...publication }
  }
}

function authorNode(name, x, y, score = 1) {
  return {
    id: name,
    type: 'author',
    x,
    y,
    sizeFactor: 1,
    author: { name, score, publicationDois: [] }
  }
}

function createProblem(nodes, links = [], scale = 1) {
  const problem = createNodeLabelProblem(nodes, links, scale)
  problem.canvas = { width: 800, height: 400 }
  problem.transform = [scale, 0, 0, scale, 400, 200]
  return problem
}

describe('nodeLabels', () => {
  it('formats publication and author labels, long ones in two lines', () => {
    expect(getNodeLabelText(publicationNode('a', 0, 0))).toBe('Smith et al.,\n2010')
    expect(getNodeLabelText(publicationNode('a', 0, 0, { authorShort: 'Smith' }))).toBe(
      'Smith, 2010'
    )
    expect(getNodeLabelText(publicationNode('a', 0, 0, { authorShort: undefined }))).toBe('2010')
    expect(getNodeLabelText(authorNode('Smith, John', 0, 0))).toBe('SMITH, JOHN')
    expect(getNodeLabelText(authorNode('Ludwig van Beethoven', 0, 0))).toBe(
      'VAN BEETHOVEN,\nLUDWIG'
    )
    expect(getNodeLabelText({ id: 'vis', type: 'keyword' })).toBeNull()
  })

  it('keeps layout coordinates and scales the marks with the zoom', () => {
    const problem = createProblem(
      [publicationNode('a', 10, -20), authorNode('Smith, John', -50, 0)],
      [],
      2
    )

    expect(problem.items[0].anchor).toMatchObject({ x: 10, y: -20, mark: { shape: 'rect', w: 46 } })
    expect(problem.items[1].anchor).toMatchObject({
      x: -50,
      y: 0,
      mark: { shape: 'circle', r: 24 }
    })
  })

  it('treats keywords as obstacles instead of labeling them', () => {
    const problem = createProblem([
      publicationNode('a', 0, 0),
      { id: 'visual', type: 'keyword', x: 100, y: 0 },
      { id: 'publi|literat', type: 'keyword', x: 0, y: 100 }
    ])

    expect(problem.items.map((item) => item.id)).toEqual(['a'])
    // Width of the shown text ("visual", "publi|..") plus clearance on each side
    expect(problem.obstacles.vector[1]).toEqual({
      class: 'text',
      rects: [
        [71, -13, 58, 26],
        [-37, 87, 74, 26]
      ]
    })
  })

  it('extends the mark of a boosted publication by its boost indicator', () => {
    const problem = createProblem(
      [publicationNode('boosted', 10, 0, { boostFactor: 8 }), publicationNode('plain', 50, 0)],
      [],
      2
    )

    const { mark } = problem.items[0].anchor
    expect(mark).toMatchObject({ shape: 'polygon', relative: true })
    // Indicator: radius 20 * 1.8 * 0.8 / 6 plus stroke around the corner at (9, -9), zoomed
    expect(mark.points[2][1]).toBeCloseTo(-29.6)
    expect(mark.points[4][0]).toBeCloseTo(29.6)
    expect(problem.items[1].anchor.mark).toEqual({ shape: 'rect', w: 46, h: 46 })
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
      {
        ...authorNode('Smith, John', 200, 0),
        author: { name: 'Smith, John', score: 1, publicationDois: ['active'] }
      }
    ])

    expect(problem.items.map((item) => item.tier)).toEqual([2, 1, 0, -1, 1])
    expect(problem.items[0].anchor.mark.w).toBeGreaterThan(problem.items[1].anchor.mark.w)
  })

  it('limits labels to the most important nodes and keeps the others as marks', () => {
    const problem = createProblem([
      publicationNode('low', 0, 0, { isSelected: true, score: 1 }),
      publicationNode('high', 50, 0, { isSelected: true, score: 9 }),
      publicationNode('active', 100, 0, { isSelected: true, score: 0, isActive: true }),
      publicationNode('medium', 150, 0, { isSelected: true, score: 5 })
    ])

    limitNodeLabels(problem, 2)

    expect(problem.items.map((item) => item.id)).toEqual(['high', 'active'])
    expect(problem.obstacles.vector.at(-1)).toEqual({
      class: 'points',
      shapes: [
        { shape: 'rect', w: 23, h: 23, x: 0, y: 0 },
        { shape: 'rect', w: 23, h: 23, x: 150, y: 0 }
      ]
    })
    expect(placeNodeLabels(problem)?.stats.hard_violations ?? 0).toBe(0)
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
    const lines = labels.select('text').selectAll('tspan')
    expect(lines.nodes().map((node) => node.textContent)).toEqual([
      'Smith et al.,',
      '2010',
      'Smith et al.,',
      '2010',
      'SMITH, JOHN'
    ])
    const [first, second] = lines.nodes().map((node) => Number(node.getAttribute('y')))
    expect(second - first).toBeCloseTo(12 * 1.2, 0)
    expect(
      labels
        .select('text')
        .nodes()
        .map((node) => node.style.fontSize)
    ).toEqual(['12px', '12px', '10px'])

    nodes[0].x = 100
    updateNodeLabelPositions(labels, d3.zoomIdentity.translate(400, 200))
    expect(labels.nodes()[0].getAttribute('transform')).toBe('translate(500, 200)')
  })

  it('places labels clearly nearer to their nodes than to other nodes', async () => {
    await loadLabelEngine()
    let seed = 1
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const ambiguous = []
    for (let graph = 0; graph < 10; graph++) {
      const nodes = Array.from({ length: 15 }, (_, i) =>
        publicationNode(`${graph}-${i}`, (random() - 0.5) * 700, (random() - 0.5) * 300, {
          score: random() * 10
        })
      )
      const problem = createProblem(nodes)
      const halfSizes = problem.items.map((item) => item.anchor.mark.w / 2)
      limitNodeLabels(problem, 5)
      placeNodeLabels(problem).placements.forEach((placement) => {
        // A label away from its node is connected to it with a leader
        if (!placement.placed || placement.leader) return
        // Distances of the label box to the marks of the nodes (on the canvas, see createProblem)
        const { x, y, w, h } = placement.box
        const distances = nodes.map((node, i) => {
          const nodeX = node.x + 400
          const nodeY = node.y + 200
          return Math.hypot(
            Math.max(x - nodeX - halfSizes[i], 0, nodeX - halfSizes[i] - x - w),
            Math.max(y - nodeY - halfSizes[i], 0, nodeY - halfSizes[i] - y - h)
          )
        })
        const own = nodes.findIndex((node) => node.id === placement.id)
        if (distances.some((distance, i) => i !== own && distance < distances[own] + 3)) {
          ambiguous.push(placement.id)
        }
      })
    }
    expect(ambiguous).toEqual([])
  })

  it('moves, shows, and hides labels smoothly when they are placed anew', async () => {
    const nodes = [
      publicationNode('a', 0, 0),
      publicationNode('b', 50, 0),
      publicationNode('c', 0, 50)
    ]
    const placement = (id, boxX, anchorX = 0) => ({
      id,
      placed: true,
      anchor: [anchorX, 0],
      box: { x: boxX, y: 0 },
      text: { x_offset: 0, baseline_offsets: [10], font_size: 12, lines: ['label'] },
      leader: null,
      priority: { tier: 0 }
    })
    document.body.innerHTML = '<svg><g class="node-labels"></g></svg>'
    let labels = renderNodeLabels(
      d3.select('g.node-labels').selectAll('g'),
      { placements: [placement('a', 10), placement('b', 60, 50)] },
      nodes,
      null
    )
    const label = (id) => d3.selectAll('g.node-labels > g').filter((d) => d.placement.id === id)
    const textX = (id) => Number(label(id).select('tspan').attr('x'))
    const opacity = (id) => Number(label(id).style('opacity'))
    // Labels shown for the first time start at their place
    expect(textX('a')).toBe(10)

    await new Promise((resolve) => setTimeout(resolve, 500))
    labels = renderNodeLabels(
      labels,
      { placements: [placement('a', -40), placement('c', 10)] },
      nodes,
      null
    )

    expect(textX('a')).toBe(10)
    expect(opacity('b')).toBe(1)
    expect(opacity('c')).toBe(0)
    expect(labels.size()).toBe(2)

    await new Promise((resolve) => setTimeout(resolve, 500))

    expect(textX('a')).toBe(-40)
    expect(label('b').empty()).toBe(true)
    expect(opacity('c')).toBe(1)
  })
})
