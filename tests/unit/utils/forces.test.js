import * as d3 from 'd3'
import { describe, it, expect } from 'vitest'

import { CURRENT_YEAR } from '@/constants/config.js'
import {
  assignNodePositions,
  calculateYearX,
  createForceSimulation,
  getLinkStrength,
  initializeForces,
  keepLayout,
  pinTimelineX,
  rememberLayout,
  returnToLayout,
  REVEAL_ALPHA,
  runFrameTicks,
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
    publication: { year: 2026 - Math.floor(random() ** 2 * 20) },
    sizeFactor: 1
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
      author: { yearMin: Math.min(...years), yearMax: Math.max(...years) },
      sizeFactor: 1
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
    publication: { year },
    sizeFactor: 1
  }))
  const links = [
    { source: 's0', target: 's2', type: 'citation', internal: true },
    { source: 's2', target: 's3', type: 'citation', internal: true }
  ]
  d3.range(20).forEach((i) => {
    const year = i === 0 ? YEAR_MIN : 2026 - Math.floor(random() * 10)
    nodes.push({ id: `p${i}`, type: 'publication', publication: { year }, sizeFactor: 1 })
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

describe('switching between timeline and clusters mode', () => {
  const positions = (nodes) => new Map(nodes.map((node) => [node.id, [node.x, node.y]]))
  const meanShift = (nodes, previousPositions) =>
    d3.mean(nodes, (node) => {
      const [x, y] = previousPositions.get(node.id)
      return Math.hypot(node.x - x, node.y - y)
    })
  // Same steps as a replot in the network component, which returns to the layout of the
  // mode when switching to it, and remembers the layout at the end of the simulation
  const plotRemembering = (layouts, graph, previousNodes, isNetworkClusters) => {
    const simulation = startLayout(graph, previousNodes, isNetworkClusters, DEFAULT_VIEW)
    const layoutGraph = { nodes: simulation.nodes(), links: simulation.force('link').links() }
    simulation.force(
      'return',
      returnToLayout(layouts, layoutGraph, DEFAULT_VIEW, isNetworkClusters)
    )
    settle(simulation)
    rememberLayout(layouts, layoutGraph, DEFAULT_VIEW, isNetworkClusters)
    return layoutGraph.nodes
  }
  const switchTwice = (graph, isNetworkClusters) => {
    const layouts = {}
    const nodes = plotRemembering(layouts, graph, null, isNetworkClusters)
    const previousPositions = positions(nodes)
    const otherMode = plotRemembering(layouts, graph, nodes, !isNetworkClusters)
    const switchedBack = plotRemembering(layouts, graph, otherMode, isNetworkClusters)
    return meanShift(switchedBack, previousPositions)
  }

  it.each([1, 2, 3, 4])(
    'returns to the clusters layout (%i) when switching to the timeline and back',
    (seed) => {
      expect(switchTwice(createSessionGraph(seed), true)).toBeLessThan(3)
    }
  )

  it.each([1, 2, 3, 4])(
    'returns to the timeline layout (%i) when switching to clusters and back',
    (seed) => {
      expect(switchTwice(createSessionGraph(seed), false)).toBeLessThan(3)
    }
  )

  it('lays out the graph anew when it changed while in the other mode', () => {
    const graph = createSessionGraph(1)
    const smallerGraph = {
      nodes: graph.nodes.filter((node) => node.id !== 'p0'),
      links: graph.links.filter((link) => link.source !== 'p0' && link.target !== 'p0')
    }
    const layouts = {}
    const clusters = plotRemembering(layouts, graph, null, true)
    const timeline = plotRemembering(layouts, smallerGraph, clusters, false)
    const simulation = startLayout(smallerGraph, timeline, true, DEFAULT_VIEW)
    const layoutGraph = { nodes: simulation.nodes(), links: simulation.force('link').links() }
    expect(returnToLayout(layouts, layoutGraph, DEFAULT_VIEW, true)).toBeNull()
  })
})

describe('showing further nodes temporarily in a layout at rest', () => {
  const cases = [
    { mode: 'timeline', isNetworkClusters: false },
    { mode: 'clusters', isNetworkClusters: true }
  ]
  // Publications shown only temporarily, each linked to some of the others
  const REVEALED_IDS = ['p3', 'p17', 'p31']
  const createGraphs = () => {
    const graph = createGraph()
    graph.nodes.forEach((node) => (node.sizeFactor = 1))
    const isRevealed = (id) => REVEALED_IDS.includes(id)
    const restGraph = {
      nodes: graph.nodes.filter((node) => !isRevealed(node.id)),
      links: graph.links.filter((link) => !isRevealed(link.source) && !isRevealed(link.target))
    }
    return { graph, restGraph }
  }
  // Same steps as the network component when the active publication reveals or hides nodes
  const plotKeeping = (positions, graph, previousNodes, isNetworkClusters) => {
    const simulation = startLayout(graph, previousNodes, isNetworkClusters, DEFAULT_VIEW)
    simulation.force('keep', keepLayout(positions))
    simulation.alpha(REVEAL_ALPHA)
    return settle(simulation)
  }
  const rest = (restGraph, isNetworkClusters) => {
    const nodes = plot(restGraph, null, isNetworkClusters)
    const positions = rememberLayout({}, { nodes, links: [] }, DEFAULT_VIEW, isNetworkClusters)
    return { nodes, positions }
  }
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
  const shifts = (nodes, positions) =>
    nodes
      .filter((node) => positions.has(node.id))
      .map((node) => distance(node, positions.get(node.id)))

  it.each(cases)('moves only few nodes of the $mode layout', ({ isNetworkClusters }) => {
    const { graph, restGraph } = createGraphs()
    const { nodes, positions } = rest(restGraph, isNetworkClusters)
    const revealing = plotKeeping(positions, graph, nodes, isNetworkClusters)

    const moved = shifts(revealing, positions).filter((shift) => shift > 1)
    expect(moved.length).toBeLessThanOrEqual(8)
    expect(d3.max(moved) ?? 0).toBeLessThan(30)
  })

  it.each(cases)(
    'keeps the further nodes from overlapping the nodes of the $mode layout',
    ({ isNetworkClusters }) => {
      const { graph, restGraph } = createGraphs()
      const { nodes, positions } = rest(restGraph, isNetworkClusters)
      const revealing = plotKeeping(positions, graph, nodes, isNetworkClusters)

      // Publication squares (20 px) and author circles (24 px), unless the layout is denser
      const distances = (node, others) =>
        others.filter((other) => other !== node).map((other) => distance(node, other))
      const layoutDistance = d3.min(nodes, (node) =>
        d3.min(distances(positions.get(node.id), [...positions.values()]))
      )
      revealing
        .filter((node) => REVEALED_IDS.includes(node.id))
        .forEach((revealed) => {
          expect(d3.min(distances(revealed, revealing))).toBeGreaterThan(
            Math.min(24, layoutDistance) - 1
          )
        })
    }
  )

  it.each(cases)(
    'returns to the $mode layout when the further nodes are hidden again',
    ({ isNetworkClusters }) => {
      const { graph, restGraph } = createGraphs()
      const { nodes, positions } = rest(restGraph, isNetworkClusters)
      const revealing = plotKeeping(positions, graph, nodes, isNetworkClusters)
      const hidden = plotKeeping(positions, restGraph, revealing, isNetworkClusters)

      expect(hidden).toHaveLength(restGraph.nodes.length)
      expect(d3.max(shifts(hidden, positions))).toBeLessThan(0.5)
    }
  )

  it('keeps authors at their publications when revealing an older publication rescales the timeline', () => {
    const node = { id: 'a', type: 'author', sizeFactor: 1, x: 110, y: 20, timelineX: 100 }
    const positions = rememberLayout({}, { nodes: [node], links: [] }, DEFAULT_VIEW, false)
    node.timelineX = 300
    const simulation = createForceSimulation().stop().nodes([node])
    simulation.force('keep', keepLayout(positions))
    settle(simulation.alpha(REVEAL_ALPHA))

    expect(node.x).toBeCloseTo(310, 0)
    expect(node.y).toBeCloseTo(20, 0)
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

describe('clusters layout', () => {
  it('keeps publication and author nodes from overlapping', () => {
    const graph = createGraph(80)
    const nodes = plot(graph, null, true)
    const minDistance = d3.min(nodes, (node, i) =>
      d3.min(nodes.slice(i + 1), (other) => Math.hypot(node.x - other.x, node.y - other.y))
    )
    // Publication squares (20 px) and author circles (24 px) with some space in between
    expect(minDistance).toBeGreaterThan(26)
  })
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
  // The centering forces only approximate the view: few nodes may reach into the borders
  const expectInside = (nodes, { width, height }) => {
    const outsideBorders = nodes.filter(
      (node) =>
        Math.abs(node.x) > width / 2 - NODE_MARGIN || Math.abs(node.y) > height / 2 - BORDER_MARGIN
    )
    expect(outsideBorders.length).toBeLessThanOrEqual(0.1 * nodes.length)
    expect(d3.max(nodes, (node) => Math.abs(node.x))).toBeLessThanOrEqual(width / 2)
    expect(d3.max(nodes, (node) => Math.abs(node.y))).toBeLessThanOrEqual(height / 2)
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
    'fits a large graph into a $name view ($width×$height) in $mode mode',
    ({ width, height, isNetworkClusters }) => {
      const nodes = plot(createGraph(250), null, isNetworkClusters, { width, height })
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

describe('getLinkStrength', () => {
  const createCitation = (sourceYear, targetYear) => ({
    type: 'citation',
    internal: true,
    source: { publication: { year: sourceYear } },
    target: { publication: { year: targetYear } }
  })

  it('pulls publications of citations spanning many years together less strongly', () => {
    ;[true, false].forEach((isNetworkClusters) => {
      expect(getLinkStrength(createCitation(1995, 2020), isNetworkClusters)).toBeLessThan(
        getLinkStrength(createCitation(2019, 2020), isNetworkClusters) / 2
      )
    })
  })

  it('pulls more within than across communities in clusters mode only', () => {
    const link = createCitation(2019, 2020)
    const community = (sameCommunity) =>
      new Map([
        [link.source, 0],
        [link.target, sameCommunity ? 0 : 1]
      ])
    expect(getLinkStrength(link, true, community(true))).toBeGreaterThan(
      2 * getLinkStrength(link, true, community(false))
    )
    expect(getLinkStrength(link, false, community(true))).toBe(
      getLinkStrength(link, false, community(false))
    )
  })
})

describe('runFrameTicks', () => {
  it('animates a layout in about half a second, speeding up as it cools down, ending in the same layout', () => {
    const positions = (nodes) => nodes.map((node) => [node.x, node.y])
    const layout = positions(plot(createGraph(), null, true))
    ;[30, 60, 120].forEach((frameRate) => {
      const simulation = startLayout(createGraph(), null, true, DEFAULT_VIEW)
      const frameTickCounts = []
      while (simulation.alpha() >= simulation.alphaMin()) {
        simulation.tick() // Tick of the simulation's timer
        frameTickCounts.push(runFrameTicks(simulation, 1000 / frameRate))
      }
      if (frameRate >= 60) {
        expect(frameTickCounts.length / frameRate).toBeGreaterThan(0.4)
        expect(frameTickCounts.length / frameRate).toBeLessThan(0.7)
        expect(frameTickCounts[0]).toBeLessThan(frameTickCounts.at(-2))
      }
      expect(positions(simulation.nodes())).toEqual(layout)
    })
  })

  it('limits the ticks of slow frames', () => {
    const simulation = startLayout(createGraph(), null, true, DEFAULT_VIEW)
    expect(runFrameTicks(simulation, 1000)).toBe(8)
  })
})
