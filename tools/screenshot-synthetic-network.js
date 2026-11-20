#!/usr/bin/env node

// Opens the production build with a synthetic session (see generate-synthetic-network.js) in
// a headless browser, answering requests to the publications data service from the synthetic
// data, and takes screenshots of the citation network for different numbers of shown
// selected publications.
//
// Usage: npm run build && node tools/screenshot-synthetic-network.js [output directory]

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
const OUTPUT_DIR = process.argv[2] || path.join(ROOT, 'tools', 'output', 'synthetic-network')
const SETTLE_TIME = 6000 // ms for the force simulation to come to rest

const countNodes = (page) => page.locator('#network-svg g.node-container.publication.selected').count()

async function screenshot(page, name) {
  const file = path.join(OUTPUT_DIR, `${name}.png`)
  await page.locator('.network-of-references').screenshot({ path: file })
  const suggestedCount = await page
    .locator('#network-svg g.node-container.publication.suggested')
    .count()
  console.log(`${file}: ${await countNodes(page)} selected, ${suggestedCount} suggested nodes`)
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })
  page.on('pageerror', (error) => console.error(`Page error: ${error.message}`))
  const { publications, session } = readSyntheticData(path.join(ROOT, 'test', 'synthetic-network'))
  await routeRequests(page, publications)
  await openSession(page, session)
  await page.waitForTimeout(SETTLE_TIME)

  await screenshot(page, '1-default')
  await setSelectedNumberFactor(page, 'End')
  await page.waitForTimeout(SETTLE_TIME)
  await screenshot(page, '2-all-selected')
  await setSelectedNumberFactor(page, 'Home')
  await page.waitForTimeout(SETTLE_TIME)
  await screenshot(page, '3-base-selected')

  // Activate a shown node that reveals some hidden linked selected publications
  const shownCount = await countNodes(page)
  const nodes = page.locator('#network-svg g.node-container.publication.selected')
  for (let i = 0; i < shownCount; i++) {
    await nodes.nth(i).click()
    await page.waitForTimeout(500)
    const revealedCount = (await countNodes(page)) - shownCount
    if (revealedCount >= 3 && revealedCount <= 15) break
  }
  await page.waitForTimeout(SETTLE_TIME)
  await screenshot(page, '4-base-selected-active-revealing')

  // Deactivating hides the revealed publications again
  await page.locator('#network-svg').click({ position: { x: 5, y: 5 } })
  await page.waitForTimeout(SETTLE_TIME)
  await screenshot(page, '5-base-selected-deactivated')

  // Activating a hidden suggested publication in the list reveals it and its hidden selected
  // neighbors
  await page.locator('.suggested-publications .publication-component').nth(30).click()
  await page.waitForTimeout(SETTLE_TIME)
  await screenshot(page, '6-base-selected-active-hidden-suggested')

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
