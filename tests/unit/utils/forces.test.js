import * as d3 from 'd3'
import { describe, it, expect } from 'vitest'

import {
  assignNodePositions,
  calculateYearX,
  createForceSimulation,
  initializeForces,
  pinTimelineX,
  SIMULATION_ALPHA
} from '@/utils/network/forces.js'

const yearX = (year) => calculateYearX(year, 1200, 240, false)

function createGraph() {
  const random = d3.randomLcg(42)
  const nodes = d3.range(40).map((i) => ({
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
    const publications = d3.range(3).map(() => nodes[Math.floor(random() * 40)])
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
 * Same steps as a replot of the network component, with the simulation run to its end
 */
function plot(simulation, graph, previousNodes, onTick = () => {}) {
  initializeForces(simulation, {
    isNetworkClusters: false,
    selectedPublicationsCount: 40,
    yearXCalculator: yearX
  })
  const links = graph.links.map((link) => ({ ...link }))
  const nodes = assignNodePositions(
    graph.nodes.map((node) => ({ ...node })),
    previousNodes,
    links
  )
  pinTimelineX(nodes, false, yearX)
  simulation.nodes(nodes)
  simulation.force('link').links(links)
  simulation.alpha(SIMULATION_ALPHA)
  while (simulation.alpha() >= simulation.alphaMin()) {
    simulation.tick()
    onTick(nodes)
  }
  return nodes
}

describe('timeline layout', () => {
  it('keeps publications at the x of their year throughout the simulation', () => {
    const simulation = createForceSimulation({}).stop()
    let maxDeviation = 0
    plot(simulation, createGraph(), null, (nodes) => {
      nodes
        .filter((node) => node.type === 'publication')
        .forEach((node) => {
          maxDeviation = Math.max(maxDeviation, Math.abs(node.x - yearX(node.publication.year)))
        })
    })
    expect(maxDeviation).toBe(0)
  })

  it('keeps the layout stable when an unchanged graph is replotted', () => {
    const simulation = createForceSimulation({}).stop()
    const graph = createGraph()
    const nodes = plot(simulation, graph, null)
    const yBefore = new Map(nodes.map((node) => [node.id, node.y]))
    const replotted = plot(simulation, graph, nodes)

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

  it('releases x in clusters mode, except for keywords dragged to a fixed place', () => {
    const nodes = [
      { id: 'p', type: 'publication', publication: { year: 2020 }, fx: 5 },
      { id: 'k', type: 'keyword', fx: 5 },
      { id: 'dragged', type: 'keyword', fx: 5, fy: 7 }
    ]
    pinTimelineX(nodes, true, yearX)
    expect(nodes[0].fx).toBeUndefined()
    expect(nodes[1].fx).toBeUndefined()
    expect(nodes[2]).toMatchObject({ fx: 5, fy: 7 })
  })
})
