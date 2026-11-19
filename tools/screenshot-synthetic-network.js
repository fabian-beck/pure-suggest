#!/usr/bin/env node

// Opens the production build with a synthetic session (see generate-synthetic-network.js) in
// a headless browser, answering requests to the publications data service from the synthetic
// data, and takes screenshots of the citation network for different numbers of shown
// selected publications.
//
// Usage: npm run build && node tools/screenshot-synthetic-network.js [output directory]

const fs = require('fs')
const path = require('path')

const LZString = require('lz-string')
const { chromium } = require('playwright')

const ROOT = path.join(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'test', 'synthetic-network')
const OUTPUT_DIR = process.argv[2] || path.join(ROOT, 'tools', 'output', 'synthetic-network')
const APP_ORIGIN = 'http://pure.test'
const API_ORIGIN = 'https://pure-publications-cw3de4q5va-ew.a.run.app'
const SETTLE_TIME = 6000 // ms for the force simulation to come to rest

const CONTENT_TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject', '.json': 'application/json', '.ico': 'image/x-icon' }

const publications = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'publications.json'), 'utf8'))
const sessionFile = fs.readdirSync(DATA_DIR).find((file) => file.startsWith('session-'))
const session = JSON.parse(fs.readFileSync(path.join(DATA_DIR, sessionFile), 'utf8'))

async function routeRequests(page) {
  await page.route('**/*', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin === API_ORIGIN) {
      const dois = url.searchParams.get('dois')?.split(',') || request.postDataJSON()?.dois
      const body = dois
        ? dois.map((doi) => publications[doi] || {})
        : publications[url.searchParams.get('doi')] || {}
      return route.fulfill({ json: body })
    }
    if (url.origin === APP_ORIGIN) {
      const file = path.join(ROOT, 'dist', url.pathname === '/' ? 'index.html' : url.pathname)
      if (!fs.existsSync(file)) return route.fulfill({ status: 404 })
      return route.fulfill({
        body: fs.readFileSync(file),
        contentType: CONTENT_TYPES[path.extname(file)] || 'application/octet-stream'
      })
    }
    // No other services (fonts, analytics, ...) are reachable
    return route.abort()
  })
}

const countNodes = (page) => page.locator('#network-svg g.node-container.publication.selected').count()

async function setSelectedNumberFactor(page, key) {
  await page.locator('.controls-footer-right .mdi-cog').click()
  const slider = page
    .locator('.v-list-item', { hasText: 'Number of selected shown' })
    .getByRole('slider')
  await slider.focus()
  await page.keyboard.press(key)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(SETTLE_TIME)
}

async function screenshot(page, name) {
  const file = path.join(OUTPUT_DIR, `${name}.png`)
  await page.locator('.network-of-references').screenshot({ path: file })
  const suggestedCount = await page
    .locator('#network-svg g.node-container.publication.suggested')
    .count()
  console.log(`${file}: ${await countNodes(page)} selected, ${suggestedCount} suggested nodes`)
}

async function main() {
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    throw new Error('No production build found, run "npm run build" first')
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })
  page.on('pageerror', (error) => console.error(`Page error: ${error.message}`))
  await routeRequests(page)

  const sessionParam = LZString.compressToEncodedURIComponent(JSON.stringify(session))
  await page.goto(`${APP_ORIGIN}/?session=${sessionParam}`)
  await page.locator('#network-svg g.node-container.publication').first().waitFor({ timeout: 60000 })
  await page.waitForTimeout(SETTLE_TIME)

  await screenshot(page, '1-default')
  await setSelectedNumberFactor(page, 'End')
  await screenshot(page, '2-all-selected')
  await setSelectedNumberFactor(page, 'Home')
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
