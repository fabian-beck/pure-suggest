/**
 * Node Labels for Network Visualization
 *
 * Publication nodes are labeled "Smith et al., 2010" and author nodes "Smith, John".
 * Label Anything (WebAssembly) decides which labels fit and where they go: labels are
 * solved in the fixed pixel space of the SVG viewport, so zooming in reveals more of them.
 */

const FONT_SIZE = 12
const PUBLICATION_SIZE = 23 // rect including stroke
const PUBLICATION_ACTIVE_SIZE = 34
const AUTHOR_RADIUS = 12
const KEYWORD_CHAR_WIDTH = 6.5
const KEYWORD_HEIGHT = 16
const CITATION_ARC_SAMPLES = 6

let engine = null
let measure

/**
 * Load the WebAssembly engine; labels are skipped until it has resolved
 */
export async function loadLabelEngine() {
  const [wasm, { default: wasmUrl }] = await Promise.all([
    import('@label-anything/wasm'),
    import('@label-anything/wasm/label_anything_bg.wasm?url')
  ])
  await wasm.init(wasmUrl)
  const context = document.createElement('canvas').getContext('2d')
  if (context) {
    const { fontFamily } = getComputedStyle(document.querySelector('#network-svg'))
    measure = (text, font) => {
      context.font = `${font.weight} ${font.size}px ${fontFamily}`
      const metrics = context.measureText(text)
      return {
        width: metrics.width,
        ascent: metrics.fontBoundingBoxAscent,
        descent: metrics.fontBoundingBoxDescent
      }
    }
  }
  engine = wasm
}

export function getNodeLabelText(node) {
  if (node.type === 'author') {
    return node.author.name
  }
  if (node.type === 'publication') {
    const { authorShort, year } = node.publication
    return authorShort ? `${authorShort}, ${year}` : `${year}`
  }
  return null
}

function getNodeLabelKind(node) {
  if (node.type === 'author') return 'author'
  return node.publication.isSelected ? 'selected' : 'suggested'
}

/**
 * Tier 2: active publication, 1: linked to it, -1: filtered out, 0: all others
 */
function getNodeLabelTier(node, activeDoi) {
  if (node.type === 'publication') {
    if (node.publication.isActive) return 2
    if (activeDoi && node.publication.isLinkedToActive) return 1
    return node.isFilteredOut ? -1 : 0
  }
  return node.author.publicationDois.includes(activeDoi) ? 1 : 0
}

/**
 * Sample the circular arc a citation link is drawn with (see calculateLinkPath)
 */
function sampleCitationArc(x0, y0, x1, y1) {
  const dx = x1 - x0
  const dy = y1 - y0
  const chord = Math.hypot(dx, dy)
  if (chord < 1) return null
  const radius = Math.max(chord ** 1.2, chord / 2)
  const centerDistance = Math.sqrt(radius * radius - (chord * chord) / 4)
  const points = []
  for (let i = 0; i <= CITATION_ARC_SAMPLES; i++) {
    const t = i / CITATION_ARC_SAMPLES
    const along = chord * (t - 0.5)
    const bulge = Math.sqrt(radius * radius - along * along) - centerDistance
    points.push([x0 + dx * t + (dy / chord) * bulge, y0 + dy * t - (dx / chord) * bulge])
  }
  return points
}

/**
 * Build the Label Anything problem for the current node positions, in layout
 * coordinates: the caller adds the canvas and the transform that maps onto it.
 *
 * @param {Array} nodes - Simulation nodes
 * @param {Array} links - Simulation links (source/target resolved to nodes)
 * @param {Function} nodeX - Displayed x position of a node
 * @param {number} scale - Zoom factor: node sizes on the canvas grow with it, labels do not
 */
export function createNodeLabelProblem(nodes, links, nodeX, scale) {
  const activeDoi = nodes.find((node) => node.publication?.isActive)?.id

  // Rank within each kind, so that the top selected, suggested, and author nodes
  // compete on equal terms for the available space
  const scoresByKind = { selected: [], suggested: [], author: [] }
  nodes.forEach((node) => {
    if (node.type === 'keyword') return
    scoresByKind[getNodeLabelKind(node)].push((node.author ?? node.publication).score)
  })
  Object.values(scoresByKind).forEach((scores) => scores.sort((a, b) => b - a))

  const items = []
  const keywordRects = []
  nodes.forEach((node) => {
    const x = nodeX(node)
    if (node.type === 'keyword') {
      const w = node.id.length * KEYWORD_CHAR_WIDTH
      keywordRects.push([x - w / 2, node.y - KEYWORD_HEIGHT / 2, w, KEYWORD_HEIGHT])
      return
    }
    const scores = scoresByKind[getNodeLabelKind(node)]
    const score = (node.author ?? node.publication).score
    let mark
    if (node.type === 'author') {
      mark = { shape: 'circle', r: AUTHOR_RADIUS * scale }
    } else {
      const size =
        (node.publication.isActive ? PUBLICATION_ACTIVE_SIZE : PUBLICATION_SIZE) * scale
      mark = { shape: 'rect', w: size, h: size }
    }
    items.push({
      id: node.id,
      anchor: { type: 'point', x, y: node.y, mark },
      label: { type: 'text', text: getNodeLabelText(node) },
      priority: 1 - scores.indexOf(score) / scores.length,
      tier: getNodeLabelTier(node, activeDoi)
    })
  })

  const citationArcs = []
  links.forEach((link) => {
    if (link.type !== 'citation') return
    const arc = sampleCitationArc(
      nodeX(link.target),
      link.target.y,
      nodeX(link.source),
      link.source.y
    )
    if (arc) citationArcs.push(arc)
  })

  return {
    preset: 'graph',
    defaults: { font: { size: FONT_SIZE } },
    placement: { aggressiveness: 'low', internal: 'never' },
    degrade: ['evict_lower', 'omit'],
    items,
    obstacles: {
      vector: [
        { class: 'lines', width: 3 * scale, polylines: citationArcs },
        { class: 'text', rects: keywordRects }
      ]
    },
    solver: { time_budget_ms: 10 }
  }
}

/**
 * Solve a label problem; null while the engine is not loaded or if solving fails
 */
export function placeNodeLabels(problem) {
  if (!engine) return null
  try {
    return engine.place(problem, { measure })
  } catch (error) {
    console.error(`Cannot place network labels: ${error.message}`)
    return null
  }
}

/**
 * Draw the placed labels of a result. Each label is positioned relative to its node's
 * anchor, so that it can follow the node between solves (updateNodeLabelPositions).
 */
export function renderNodeLabels(labelSelection, result, nodes, activePublication) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const labels = result.placements
    .filter((placement) => placement.placed && nodesById.has(placement.id))
    .map((placement) => ({ placement, node: nodesById.get(placement.id) }))

  const updated = labelSelection
    .data(labels, (d) => d.placement.id)
    .join((enter) => {
      const g = enter.append('g')
      g.append('path')
      g.append('text')
      return g
    })
    .attr('class', (d) => `node-label ${getNodeLabelKind(d.node)}`)
    .classed('non-active', (d) => activePublication && d.placement.priority.tier < 1)
    .attr('transform', (d) => `translate(${d.placement.anchor[0]}, ${d.placement.anchor[1]})`)

  updated.select('path').attr('d', ({ placement }) =>
    placement.leader
      ? `M${placement.leader.points
          .map(([x, y]) => `${x - placement.anchor[0]},${y - placement.anchor[1]}`)
          .join('L')}`
      : null
  )
  updated
    .select('text')
    .attr('x', ({ placement }) => placement.box.x + placement.text.x_offset - placement.anchor[0])
    .attr(
      'y',
      ({ placement }) => placement.box.y + placement.text.baseline_offsets[0] - placement.anchor[1]
    )
    .text(({ placement }) => placement.text.lines[0])

  return updated
}

/**
 * Move the labels along with their nodes; viewTransform (a d3 zoom transform) maps
 * layout coordinates onto the canvas the labels were placed in
 */
export function updateNodeLabelPositions(labelSelection, nodeX, viewTransform) {
  labelSelection.attr(
    'transform',
    ({ node }) =>
      `translate(${viewTransform.applyX(nodeX(node))}, ${viewTransform.applyY(node.y)})`
  )
}
