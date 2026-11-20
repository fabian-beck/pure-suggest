#!/usr/bin/env node

// Benchmarks the force layout of the citation network (src/utils/network/forces.js) on the
// graphs saved by extract-network-graphs.js: runs the simulation as on the first plot of a
// session, for both modes, a wide and a tall view, and some start orders of the nodes, and
// reports the mean of layout quality metrics per mode and graph group:
//
// - groups: silhouette (-1 to 1) of the communities (see communities.js) in the layout,
//   i.e., how much closer nodes are to their own than to the nearest other community
// - topics: silhouette of the topics of synthetic publications (from their DOIs)
// - neighbors: share of the nearest nodes of a node (as many as it has neighbors) that are
//   its neighbors in the network (citation and author links)
// - evenness: Clark-Evans index, mean distance to the nearest node relative to that of
//   randomly placed nodes (1: random, higher: more evenly spread, lower: clustered)
// - gaps: share of the area of the convex hull farther than 45 px from any node
// - overlaps: overlapping pairs of publication and author nodes per 100 nodes
// - outside: nodes less than 10 px from the border of the view or beyond
// - fillX, fillY: 95th percentile of the x and y distance from the center relative to the
//   view inside its margins
// - linkLength: mean length of citation links relative to the mean spacing of the nodes
// - crossings: crossings of citation and author links per link
// - lastMove: mean movement of the nodes (px) in the last tick
// - ms: simulation time
//
// Usage: node tools/benchmark-network-layout.mjs [--baseline <git revision>]
//   [--group prefix|size|view] [--svg]
// --baseline: also benchmark forces.js of a git revision (with the current other modules)
// --group: group the graphs by name prefix (default), number of selected, or view
// --svg: save the layouts of the first start order to tools/output/network-layouts/

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { register } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import * as d3 from 'd3'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const GRAPH_DIR = path.join(ROOT, 'tools', 'output', 'network-graphs')
const OUTPUT_DIR = path.join(ROOT, 'tools', 'output')
const VIEWS = { wide: { width: 1715, height: 363 }, tall: { width: 900, height: 720 } }
const START_ORDERS = 3
const GAP_DISTANCE = 45
const METRICS = [
  'groups',
  'topics',
  'neighbors',
  'evenness',
  'gaps',
  'overlaps',
  'outside',
  'fillX',
  'fillY',
  'linkLength',
  'crossings',
  'lastMove',
  'ms'
]

// Resolve the @/ alias of the app's modules
const aliasHook = `
  const srcUrl = ${JSON.stringify(pathToFileURL(path.join(ROOT, 'src')).href)}
  export async function resolve(specifier, context, next) {
    const result = await next(specifier.startsWith('@/') ? srcUrl + specifier.slice(1) : specifier, context)
    return result.url.startsWith(srcUrl) ? { ...result, format: 'module' } : result
  }`
register(`data:text/javascript,${encodeURIComponent(aliasHook)}`)
const { detectCommunities } = await import('../src/utils/network/communities.js')

const args = process.argv.slice(2)
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const grouping = option('--group') || 'prefix'

async function loadVariants() {
  const variants = [{ name: 'current', forces: await import('../src/utils/network/forces.js') }]
  const baseline = option('--baseline')
  if (baseline) {
    const source = execFileSync('git', ['show', `${baseline}:src/utils/network/forces.js`], {
      cwd: ROOT
    })
    const file = path.join(OUTPUT_DIR, `forces-${baseline.replace(/\W/g, '_')}.mjs`)
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    fs.writeFileSync(file, source)
    variants.unshift({ name: baseline, forces: await import(pathToFileURL(file).href) })
  }
  return variants
}

function loadGraphs() {
  if (!fs.existsSync(GRAPH_DIR)) {
    throw new Error('No graphs found, run "node tools/extract-network-graphs.js" first')
  }
  return fs
    .readdirSync(GRAPH_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const graph = JSON.parse(fs.readFileSync(path.join(GRAPH_DIR, file), 'utf8'))
      const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
      const links = graph.links.map((link) => ({
        ...link,
        source: nodeById.get(link.source),
        target: nodeById.get(link.target)
      }))
      const community = detectCommunities(links)
      return {
        ...graph,
        name: file.slice(0, -5),
        community: new Map(graph.nodes.map((node) => [node.id, community.get(node)]))
      }
    })
}

/**
 * Same steps as the first plot of a session in the network component
 */
function runLayout(forces, graph, isNetworkClusters, view) {
  const nodes = graph.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    sizeFactor: node.sizeFactor,
    publication: node.type === 'publication' ? { year: node.year } : undefined,
    author: node.type === 'author' ? { yearMin: node.yearMin, yearMax: node.yearMax } : undefined
  }))
  const links = graph.links.map((link) => ({ ...link }))
  const simulation = forces.createForceSimulation().stop()
  forces.initializeForces(simulation, isNetworkClusters, graph.selectedCount, view)
  const yearMin = d3.min(nodes, (node) => node.publication?.year)
  forces.pinTimelineX(nodes, isNetworkClusters, (year) =>
    forces.calculateYearX(year, yearMin, view.width)
  )
  simulation.nodes(nodes)
  simulation.force('link').links(links)
  simulation.alpha(forces.SIMULATION_ALPHA)
  let lastMove = 0
  const start = performance.now()
  while (simulation.alpha() >= simulation.alphaMin()) {
    const previous = nodes.map((node) => [node.x, node.y])
    simulation.tick()
    lastMove = d3.mean(nodes, (node, i) =>
      Math.hypot(node.x - previous[i][0], node.y - previous[i][1])
    )
  }
  return { nodes, links, lastMove, ms: performance.now() - start }
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

function silhouette(nodes, label) {
  const groups = d3.group(nodes, label)
  return d3.mean(nodes, (node) => {
    const own = groups.get(label(node))
    if (own.length < 2) return 0
    const meanDistance = (members) => d3.sum(members, (other) => distance(node, other))
    const a = meanDistance(own) / (own.length - 1)
    const b =
      d3.min(
        [...groups].filter(([key]) => key !== label(node)),
        ([, members]) => meanDistance(members) / members.length
      ) ?? a
    return (b - a) / Math.max(a, b)
  })
}

function countCrossings(links) {
  const side = (a, b, c) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x))
  let count = 0
  links.forEach((l1, i) =>
    links.slice(i + 1).forEach((l2) => {
      const ends = new Set([l1.source, l1.target, l2.source, l2.target])
      if (ends.size < 4) return
      if (
        side(l1.source, l1.target, l2.source) * side(l1.source, l1.target, l2.target) < 0 &&
        side(l2.source, l2.target, l1.source) * side(l2.source, l2.target, l1.target) < 0
      )
        count++
    })
  )
  return count
}

function measure(run, graph, view) {
  const { nodes, links } = run
  const nodeSize = (node) => (node.type === 'author' ? 24 : 20) * node.sizeFactor
  const shown = nodes.filter((node) => node.type !== 'keyword')
  const points = shown.map((node) => [node.x, node.y])
  const hull = d3.polygonHull(points)
  const spacing = Math.sqrt(Math.abs(d3.polygonArea(hull)) / shown.length)
  const nearestDistances = shown.map((node) =>
    d3.min(shown, (other) => (other === node ? Infinity : distance(node, other)))
  )

  const delaunay = d3.Delaunay.from(points)
  let cells = 0
  let gapCells = 0
  for (let x = -view.width / 2; x < view.width / 2; x += 15) {
    for (let y = -view.height / 2; y < view.height / 2; y += 15) {
      if (!d3.polygonContains(hull, [x, y])) continue
      cells++
      const nearest = shown[delaunay.find(x, y)]
      if (Math.hypot(x - nearest.x, y - nearest.y) > GAP_DISTANCE) gapCells++
    }
  }

  let overlaps = 0
  shown.forEach((a, i) =>
    shown.slice(i + 1).forEach((b) => {
      if (distance(a, b) < (nodeSize(a) + nodeSize(b)) / 2) overlaps++
    })
  )

  const networkLinks = links.filter((link) => link.type !== 'keyword')
  const neighbors = new Map(shown.map((node) => [node, new Set()]))
  networkLinks.forEach(({ source, target }) => {
    neighbors.get(source).add(target)
    neighbors.get(target).add(source)
  })
  const neighborShare = d3.mean(
    shown.filter((node) => neighbors.get(node).size),
    (node) => {
      const nodeNeighbors = neighbors.get(node)
      const nearest = shown
        .filter((other) => other !== node)
        .sort((a, b) => distance(node, a) - distance(node, b))
        .slice(0, nodeNeighbors.size)
      return nearest.filter((other) => nodeNeighbors.has(other)).length / nodeNeighbors.size
    }
  )

  const topic = (node) => node.id.match(/^10\.5555\/synth\.(\w+)\./)?.[1]
  const topicNodes = nodes.filter(topic)
  const quantile95 = (values) => d3.quantile(values.sort(d3.ascending), 0.95)
  const citations = links.filter((link) => link.type === 'citation')
  return {
    groups: silhouette(shown, (node) => graph.community.get(node.id)),
    topics: topicNodes.length ? silhouette(topicNodes, topic) : undefined,
    neighbors: neighborShare,
    evenness: d3.mean(nearestDistances) / (0.5 * spacing),
    gaps: gapCells / cells,
    overlaps: (100 * overlaps) / shown.length,
    outside: nodes.filter(
      (node) => Math.abs(node.x) > view.width / 2 - 10 || Math.abs(node.y) > view.height / 2 - 10
    ).length,
    fillX: quantile95(nodes.map((node) => Math.abs(node.x))) / (view.width / 2 - 15),
    fillY: quantile95(nodes.map((node) => Math.abs(node.y))) / (view.height / 2 - 40),
    linkLength: d3.mean(citations, (link) => distance(link.source, link.target)) / spacing,
    crossings: countCrossings(networkLinks) / networkLinks.length,
    lastMove: run.lastMove,
    ms: run.ms
  }
}

function toSvg(run, graph, view) {
  const color = d3.scaleOrdinal(d3.schemeTableau10)
  const linkColors = { citation: '#8cc', author: '#999', keyword: '#fc8' }
  const links = run.links
    .map(
      ({ source, target, type }) =>
        `<line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="${linkColors[type]}" stroke-opacity="0.5"/>`
    )
    .join('')
  const nodes = run.nodes
    .map((node) => {
      const fill = color(graph.community.get(node.id))
      if (node.type === 'publication') {
        const size = 20 * node.sizeFactor
        return `<rect x="${node.x - size / 2}" y="${node.y - size / 2}" width="${size}" height="${size}" fill="${fill}" stroke="white"/>`
      }
      if (node.type === 'author') {
        return `<circle cx="${node.x}" cy="${node.y}" r="${12 * node.sizeFactor}" fill="#222" stroke="${fill}" stroke-width="3"/>`
      }
      return `<text x="${node.x}" y="${node.y}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#a60">${node.id.toUpperCase()}</text>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${view.width}" height="${view.height}" viewBox="${-view.width / 2} ${-view.height / 2} ${view.width} ${view.height}"><rect x="${-view.width / 2}" y="${-view.height / 2}" width="100%" height="100%" fill="white" stroke="#ccc"/>${links}${nodes}</svg>`
}

function groupKey(row) {
  if (grouping === 'view') return row.view
  const [prefix, size] = row.graph.split(/-(.*)/)
  return grouping === 'size' ? size : prefix
}

const variants = await loadVariants()
const graphs = loadGraphs()
const rows = []
const svgDir = path.join(OUTPUT_DIR, 'network-layouts')
if (args.includes('--svg')) fs.mkdirSync(svgDir, { recursive: true })
// The order of the nodes determines their start positions
const startOrders = d3.range(START_ORDERS)
for (const [variant, graph, isNetworkClusters, [viewName, view], startOrder] of d3.cross(
  variants,
  graphs,
  [true, false],
  Object.entries(VIEWS),
  startOrders
)) {
  const offset = Math.round((startOrder * graph.nodes.length) / START_ORDERS)
  const orderedGraph = {
    ...graph,
    nodes: [...graph.nodes.slice(offset), ...graph.nodes.slice(0, offset)]
  }
  const run = runLayout(variant.forces, orderedGraph, isNetworkClusters, view)
  const mode = isNetworkClusters ? 'clusters' : 'timeline'
  rows.push({
    variant: variant.name,
    mode,
    graph: graph.name,
    view: viewName,
    ...measure(run, graph, view)
  })
  if (args.includes('--svg') && startOrder === 0) {
    const file = `${variant.name.replace(/\W/g, '_')}-${graph.name}-${mode}-${viewName}.svg`
    fs.writeFileSync(path.join(svgDir, file), toSvg(run, graph, view))
  }
}

const summary = d3
  .flatRollup(
    rows,
    (group) =>
      Object.fromEntries(
        METRICS.map((metric) => [metric, Number(d3.mean(group, (row) => row[metric])?.toFixed(3))])
      ),
    (row) => row.mode,
    groupKey,
    (row) => row.variant
  )
  .map(([mode, group, variant, metrics]) => ({ mode, group, variant, ...metrics }))
  .sort((a, b) => a.mode.localeCompare(b.mode) || a.group.localeCompare(b.group))
console.table(summary)
