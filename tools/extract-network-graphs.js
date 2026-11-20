#!/usr/bin/env node

// Opens the production build with sessions selecting the first 12, 25, 60, and 120
// publications of a synthetic session (see generate-synthetic-network.js), with the
// default number of selected publications shown and, for the largest, all of them, and
// saves the nodes and links of the citation network as input for
// benchmark-network-layout.mjs.
//
// Usage: npm run build && node tools/extract-network-graphs.js [data directory] [name prefix]

const fs = require('fs')
const path = require('path')

const { chromium } = require('playwright')

const {
  readSyntheticData,
  routeRequests,
  openSession,
  setSelectedNumberFactor
} = require('./synthetic-network-app.js')

const ROOT = path.join(__dirname, '..')
const DATA_DIR = process.argv[2] || path.join(ROOT, 'test', 'synthetic-network')
const PREFIX = process.argv[3] || 'synthetic'
const OUTPUT_DIR = path.join(ROOT, 'tools', 'output', 'network-graphs')
const SELECTED_COUNTS = [12, 25, 60, 120]
const SETTLE_TIME = 4000 // ms for the network to be plotted

// Node and link data bound to the network's elements by d3
const readGraph = (page) =>
  page.evaluate(() => {
    const data = (selector) =>
      [...document.querySelectorAll(selector)].map((element) => element.__data__).filter(Boolean)
    const nodes = data('#network-svg g.node-container')
    const links = data('#network-svg path').filter((link) => link.type && link.source?.id)
    return {
      selectedCount: nodes.filter((node) => node.publication?.isSelected).length,
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        sizeFactor: node.sizeFactor,
        year: node.publication?.year,
        author: node.publication?.author,
        title: node.publication?.title,
        yearMin: node.author?.yearMin,
        yearMax: node.author?.yearMax
      })),
      links: links.map((link) => ({
        source: link.source.id,
        target: link.target.id,
        type: link.type,
        internal: link.internal
      }))
    }
  })

async function saveGraph(page, name) {
  const graph = await readGraph(page)
  const file = path.join(OUTPUT_DIR, `${PREFIX}-${name}.json`)
  fs.writeFileSync(file, JSON.stringify(graph))
  console.log(`${file}: ${graph.nodes.length} nodes, ${graph.links.length} links`)
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const { publications, session } = readSyntheticData(DATA_DIR)
  const browser = await chromium.launch()
  for (const selectedCount of SELECTED_COUNTS) {
    const page = await browser.newPage({ viewport: { width: 1750, height: 1000 } })
    page.on('pageerror', (error) => console.error(`Page error: ${error.message}`))
    await routeRequests(page, publications)
    await openSession(page, { ...session, selected: session.selected.slice(0, selectedCount) })
    await page.waitForTimeout(SETTLE_TIME)
    await saveGraph(page, `s${selectedCount}`)
    if (selectedCount === SELECTED_COUNTS.at(-1)) {
      await setSelectedNumberFactor(page, 'End')
      await page.waitForTimeout(SETTLE_TIME)
      await saveGraph(page, `s${selectedCount}-all`)
    }
    await page.close()
  }
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
