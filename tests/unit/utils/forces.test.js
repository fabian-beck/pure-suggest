import * as d3 from 'd3'
import { describe, it, expect } from 'vitest'

import { CURRENT_YEAR } from '@/constants/config.js'
import {
  assignNodePositions,
  calculateYearX,
  createForceSimulation,
  initializeForces,
  pinTimelineX,
  SIMULATION_ALPHA
} from '@/utils/network/forces.js'
import { createKeywordNodeDrag } from '@/utils/network/keywordNodes.js'

const YEAR_MIN = 2006
const NODE_MARGIN = 10
// Rows of the year labels at the top and bottom border (6 + 20), and half a node
const BORDER_MARGIN = 38
const DEFAULT_VIEW = { width: 1200, height: 240 }
const yearX = (year) => calculateYearX(year, YEAR_MIN, 1200)

function createGraph(publicationCount = 40) {
  const random = d3.randomLcg(42)
  const nodes = d3.range(publicationCount).map((i) => ({
    id: `p${i}`,
    type: 'publication',
    publication: { year: 2026 - Math.floor(random() ** 2 * 20) }
  }))
  const links = []
  nodes.forEach((citing) =>
    nodes.forEach((cited) => {
      if (cited !== citing && cited.publication.year <= citing.publication.year && random() < 0.1) {
        links.push({ source: cited.id, target: citing.id, type: 'citation', internal: true })
      }
    })
  )
  d3.range(8).forEach((i) => {
    const publications = d3.range(3).map(() => nodes[Math.floor(random() * publicationCount)])
    const years = publications.map((publication) => publication.publication.year)
    nodes.push({
      id: `a${i}`,
      type: 'author',
      author: { yearMin: Math.min(...years), yearMax: Math.max(...years) }
    })
    publications.forEach((publication) =>
      links.push({ source: `a${i}`, target: publication.id, type: 'author' })
    )
  })
  return { nodes, links }
}

/**
 * Shaped like a typical session: few selected publications, suggestions each linked to
 * some of them and mostly from recent years, keywords linked to many publications
 */
function createSessionGraph(seed) {
  const random = d3.randomLcg(seed)
  const nodes = [2016, 2016, 2017, 2019].map((year, i) => ({
    id: `s${i}`,
    type: 'publication',
    publication: { year }
  }))
  const links = [
    { source: 's0', target: 's2', type: 'citation', internal: true },
    { source: 's2', target: 's3', type: 'citation', internal: true }
  ]
  d3.range(20).forEach((i) => {
    const year = i === 0 ? YEAR_MIN : 2026 - Math.floor(random() * 10)
    nodes.push({ id: `p${i}`, type: 'publication', publication: { year } })
    d3.range(1 + Math.floor(random() * 3)).forEach(() => {
      const selected = `s${Math.floor(random() * 4)}`
      links.push(
        year < 2018
          ? { source: `p${i}`, target: selected, type: 'citation' }
          : { source: selected, target: `p${i}`, type: 'citation' }
      )
    })
  })
  const publications = [...nodes]
  d3.range(3).forEach((i) => {
    nodes.push({ id: `k${i}`, type: 'keyword' })
    publications
      .filter(() => random() < 0.5)
      .forEach((publication) =>
        links.push({ source: `k${i}`, target: publication.id, type: 'keyword' })
      )
  })
  return { nodes, links }
}

/**
 * Same steps as a replot of the network component in a view of the given size
 * ({ width, height }), up to the start of the simulation
 */
function startLayout(graph, previousNodes, isNetworkClusters, view) {
  const simulation = createForceSimulation().stop()
  const viewYearX = (year) => calculateYearX(year, YEAR_MIN, view.width)
  initializeForces(simulation, isNetworkClusters, 40, view)
  const links = graph.links.map((link) => ({ ...link }))
  const nodes = assignNodePositions(
    graph.nodes.map((node) => ({ ...node })),
    previousNodes,
    links
  )
  pinTimelineX(nodes, isNetworkClusters, viewYearX)
  simulation.nodes(nodes)
  simulation.force('link').links(links)
  simulation.alpha(SIMULATION_ALPHA)
  return simulation
}

function settle(simulation, onTick = () => {}) {
  while (simulation.alpha() >= simulation.alphaMin()) {
    simulation.tick()
    onTick(simulation.nodes())
  }
  return simulation.nodes()
}

const plot = (graph, previousNodes, isNetworkClusters = false, view = DEFAULT_VIEW) =>
  settle(startLayout(graph, previousNodes, isNetworkClusters, view))

describe('timeline layout', () => {
  it('keeps publications at the x of their year throughout the simulation', () => {
    let maxDeviation = 0
    settle(startLayout(createGraph(), null, false, DEFAULT_VIEW), (nodes) => {
      nodes
        .filter((node) => node.type === 'publication')
        .forEach((node) => {
          maxDeviation = Math.max(maxDeviation, Math.abs(node.x - yearX(node.publication.year)))
        })
    })
    expect(maxDeviation).toBe(0)
  })

  it('keeps the layout stable when an unchanged graph is replotted', () => {
    const graph = createGraph()
    const nodes = plot(graph, null)
    const yBefore = new Map(nodes.map((node) => [node.id, node.y]))
    const replotted = plot(graph, nodes)

    const meanShift = d3.mean(replotted, (node) => Math.abs(node.y - yBefore.get(node.id)))
    expect(meanShift).toBeLessThan(30)

    const publications = replotted.filter((node) => node.type === 'publication')
    const swapped = publications.flatMap((a) =>
      publications.filter(
        (b) =>
          a.id < b.id &&
          a.publication.year === b.publication.year &&
          (yBefore.get(a.id) - yBefore.get(b.id)) * (a.y - b.y) < 0
      )
    )
    expect(swapped).toHaveLength(0)
  })
})

describe('calculateYearX', () => {
  it.each([400, 1900])(
    'fits the years from the first year stripe to the keywords into a view %i wide',
    (width) => {
      const left = calculateYearX(2005, 2007, width)
      const right = calculateYearX(CURRENT_YEAR + 2, 2007, width)
      expect(left).toBeGreaterThanOrEqual(-width / 2)
      expect(right).toBeLessThanOrEqual(width / 2)
      // all but the margins for the first year label and the keywords
      expect(right - left).toBeGreaterThan(width - 100)
    }
  )
})

describe('layout in views of different aspect ratios', () => {
  const views = [
    { name: 'flat', width: 1050, height: 250 },
    { name: 'desktop', width: 1900, height: 450 },
    { name: 'expanded', width: 1900, height: 950 },
    { name: 'wide screen', width: 1100, height: 1300 },
    { name: 'mobile', width: 400, height: 700 }
  ]
  const cases = views.flatMap((view) => [
    { ...view, mode: 'timeline', isNetworkClusters: false },
    { ...view, mode: 'clusters', isNetworkClusters: true }
  ])
  const spread = (values) => d3.max(values) - d3.min(values)
  const expectInside = (nodes, { width, height }) => {
    expect(d3.max(nodes, (node) => Math.abs(node.x))).toBeLessThanOrEqual(width / 2 - NODE_MARGIN)
    expect(d3.max(nodes, (node) => Math.abs(node.y))).toBeLessThanOrEqual(
      height / 2 - BORDER_MARGIN
    )
  }

  it.each(cases)(
    'uses much of a $name view ($width×$height) in $mode mode, keeping the borders free',
    ({ width, height, isNetworkClusters }) => {
      const nodes = plot(createGraph(), null, isNetworkClusters, { width, height })
      expectInside(nodes, { width, height })
      expect(spread(nodes.map((node) => node.y))).toBeGreaterThan(
        0.5 * (height - 2 * BORDER_MARGIN)
      )
      if (isNetworkClusters) {
        expect(spread(nodes.map((node) => node.x))).toBeGreaterThan(0.5 * (width - 2 * NODE_MARGIN))
      }
    }
  )

  it.each(cases)(
    'keeps the nodes of a large graph inside a $name view ($width×$height) in $mode mode',
    ({ width, height, isNetworkClusters }) => {
      const nodes = plot(createGraph(120), null, isNetworkClusters, { width, height })
      expectInside(nodes, { width, height })
    }
  )

  it.each(cases.flatMap((view) => [1, 2, 3].map((seed) => ({ ...view, seed }))))(
    'uses much of a $name view ($width×$height) for a session graph ($seed) in $mode mode, keeping the borders free',
    ({ width, height, isNetworkClusters, seed }) => {
      const nodes = plot(createSessionGraph(seed), null, isNetworkClusters, { width, height })
      expectInside(nodes, { width, height })
      expect(spread(nodes.map((node) => node.y))).toBeGreaterThan(
        0.5 * (height - 2 * BORDER_MARGIN)
      )
    }
  )
})

describe('assignNodePositions', () => {
  it('keeps the node objects and positions of the previous layout', () => {
    const previous = { id: 'a', x: 10, y: 20, vx: 1 }
    const [node] = assignNodePositions([{ id: 'a', type: 'publication' }], [previous], [])
    expect(node).toBe(previous)
    expect(node).toMatchObject({ x: 10, y: 20, vx: 1, type: 'publication' })
  })

  it('places new nodes next to their already positioned neighbors, not on top of each other', () => {
    const previousNodes = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 100, y: 40 }
    ]
    const links = ['c', 'd'].flatMap((id) => [
      { source: 'a', target: id },
      { source: id, target: 'b' }
    ])
    const nodes = assignNodePositions(
      ['a', 'b', 'c', 'd'].map((id) => ({ id })),
      previousNodes,
      links
    )
    const [c, d] = nodes.slice(2)
    expect(Math.hypot(c.x - 50, c.y - 20)).toBeLessThanOrEqual(10)
    expect(Math.hypot(d.x - 50, d.y - 20)).toBeLessThanOrEqual(10)
    expect(Math.hypot(c.x - d.x, c.y - d.y)).toBeGreaterThan(1)
  })

  it('leaves nodes without positioned neighbors to the initial placement of d3', () => {
    const nodes = assignNodePositions([{ id: 'a' }, { id: 'b' }], null, [
      { source: 'a', target: 'b' }
    ])
    nodes.forEach((node) => {
      expect(node.x).toBeUndefined()
      expect(node.y).toBeUndefined()
    })
  })
})

describe('pinTimelineX', () => {
  it('pins publications and keywords to their year in timeline mode, but not authors', () => {
    const nodes = [
      { id: 'p', type: 'publication', publication: { year: 2020 }, x: 0 },
      { id: 'k', type: 'keyword', x: 0 },
      { id: 'a', type: 'author', author: { yearMin: 2010, yearMax: 2020 }, x: 0 }
    ]
    pinTimelineX(nodes, false, yearX)
    expect(nodes[0]).toMatchObject({ x: yearX(2020), fx: yearX(2020) })
    expect(nodes[1].fx).toBe(nodes[1].x)
    expect(nodes[2].fx).toBeUndefined()
  })

  it('releases x in clusters mode', () => {
    const nodes = [
      { id: 'p', type: 'publication', publication: { year: 2020 }, fx: 5 },
      { id: 'k', type: 'keyword', fx: 5 }
    ]
    pinTimelineX(nodes, true, yearX)
    expect(nodes[0].fx).toBeUndefined()
    expect(nodes[1].fx).toBeUndefined()
  })
})

describe('dragged keywords when switching between clusters and timeline mode', () => {
  const drag = (keyword, isNetworkClusters) => {
    const network = { isNetworkClusters, restart: () => {}, setDragging: () => {} }
    createKeywordNodeDrag(network, SIMULATION_ALPHA).on('drag')({ x: 5, y: 7 }, keyword)
  }

  it('returns a keyword dragged in clusters mode to its place when switching back', () => {
    const keyword = { id: 'k', type: 'keyword', x: 0, y: 0 }
    drag(keyword, true)
    pinTimelineX([keyword], false, yearX)
    expect(keyword).toMatchObject({ fx: yearX(CURRENT_YEAR + 2), fy: 7 })
    pinTimelineX([keyword], true, yearX)
    expect(keyword).toMatchObject({ fx: 5, fy: 7 })
  })

  it('keeps only the y of a keyword dragged in timeline mode when switching to clusters', () => {
    const keyword = { id: 'k', type: 'keyword', x: 0, y: 0 }
    pinTimelineX([keyword], false, yearX)
    drag(keyword, false)
    pinTimelineX([keyword], true, yearX)
    expect(keyword.fx).toBeUndefined()
    expect(keyword.fy).toBe(7)
  })
})
