// Serves the production build in a headless browser page, answering requests to the
// publications data service from synthetic data (see generate-synthetic-network.js)

const fs = require('fs')
const path = require('path')

const LZString = require('lz-string')

const ROOT = path.join(__dirname, '..')
const APP_ORIGIN = 'https://pure.test'
const API_ORIGIN = 'https://pure-publications-cw3de4q5va-ew.a.run.app'
const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.json': 'application/json',
  '.ico': 'image/x-icon'
}

function readSyntheticData(dataDir) {
  const publications = JSON.parse(fs.readFileSync(path.join(dataDir, 'publications.json'), 'utf8'))
  const sessionFile = fs.readdirSync(dataDir).find((file) => file.startsWith('session-'))
  const session = JSON.parse(fs.readFileSync(path.join(dataDir, sessionFile), 'utf8'))
  return { publications, session }
}

async function routeRequests(page, publications) {
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    throw new Error('No production build found, run "npm run build" first')
  }
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

async function openSession(page, session) {
  const sessionParam = LZString.compressToEncodedURIComponent(JSON.stringify(session))
  await page.goto(`${APP_ORIGIN}/?session=${sessionParam}`)
  await page
    .locator('#network-svg g.node-container.publication')
    .first()
    .waitFor({ timeout: 60000 })
}

async function setSelectedNumberFactor(page, key) {
  await page.locator('.controls-footer-right .mdi-cog').click()
  const slider = page
    .locator('.v-list-item', { hasText: 'Number of selected shown' })
    .getByRole('slider')
  await slider.focus()
  await page.keyboard.press(key)
  await page.keyboard.press('Escape')
}

module.exports = { readSyntheticData, routeRequests, openSession, setSelectedNumberFactor }
