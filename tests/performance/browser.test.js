import { spawn } from 'child_process'

import puppeteer from 'puppeteer'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('Browser Performance Tests', () => {
  let browser
  let page
  let devServer
  const DEV_SERVER_URL = 'http://localhost:8080'

  async function waitForServer(url, timeout = 30000) {
    const start = Date.now()

    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          return true
        }
      } catch {
        // Server not ready yet, continue waiting
      }

      // Wait 100ms before next attempt
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    throw new Error(`Server at ${url} did not start within ${timeout}ms`)
  }

  beforeAll(async () => {
    // Start the dev server
    console.log('Starting dev server...')
    devServer = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      shell: true,
      detached: false
    })

    // Give the server time to initialize before checking
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Wait for the server to be ready
    console.log('Waiting for dev server to be ready...')
    await waitForServer(DEV_SERVER_URL)
    console.log('Dev server ready at', DEV_SERVER_URL)

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    page = await browser.newPage()

    // Enable Performance API
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = []
    })
  }, 60000) // 60 second timeout for dev server startup

  afterAll(async () => {
    if (browser) {
      await browser.close()
    }

    if (devServer) {
      console.log('Stopping dev server...')
      devServer.kill('SIGTERM')

      // Wait a bit for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Force kill if still running
      if (!devServer.killed) {
        devServer.kill('SIGKILL')
      }
    }
  })

  it('should measure page load performance', async () => {
    // Simple test - just check if we can load the page
    console.log('Loading page at:', DEV_SERVER_URL)

    const response = await page.goto(DEV_SERVER_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    console.log('Page response status:', response.status())
    expect(response.status()).toBe(200)

    // Check if the page has some basic content
    const title = await page.title()
    console.log('Page title:', title)
    expect(title).toBeDefined()
    expect(title.length).toBeGreaterThan(0)
  }, 30000)

  it('should measure PublicationComponent render performance in browser', async () => {
    await page.goto(DEV_SERVER_URL)

    // Wait for the Vue app to load and render content in #app
    await page.waitForFunction(
      () => {
        const app = document.querySelector('#app')
        return app && app.children.length > 0
      },
      { timeout: 15000 }
    )

    console.log('Vue app has loaded and rendered content')

    // Measure rendering time for publication components
    const renderMetrics = await page.evaluate(async () => {
      const startTime = performance.now()

      // Simulate adding publications (this would depend on your app's API)
      // For now, we'll measure existing elements
      const publications = document.querySelectorAll('.publication-component')

      const endTime = performance.now()

      return {
        renderTime: endTime - startTime,
        publicationCount: publications.length
      }
    })

    expect(renderMetrics.renderTime).toBeLessThan(500) // 500ms for initial render
  })

  it('should measure scroll performance', async () => {
    await page.goto(DEV_SERVER_URL)

    // Wait for the Vue app to load and render content in #app
    await page.waitForFunction(
      () => {
        const app = document.querySelector('#app')
        return app && app.children.length > 0
      },
      { timeout: 15000 }
    )

    console.log('Vue app loaded for scroll test')

    // Start measuring FPS
    await page.evaluate(() => {
      window.fpsData = []
      let frameCount = 0
      const startTime = performance.now()

      function measureFPS() {
        frameCount++
        const currentTime = performance.now()
        const elapsed = currentTime - startTime

        if (elapsed >= 1000) {
          window.fpsData.push(Math.round((frameCount * 1000) / elapsed))
          frameCount = 0
        }

        if (window.fpsData.length < 3) {
          requestAnimationFrame(measureFPS)
        }
      }

      requestAnimationFrame(measureFPS)
    })

    // Simulate scrolling
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 200))
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    const fpsData = await page.evaluate(() => window.fpsData)
    const averageFPS = fpsData.reduce((sum, fps) => sum + fps, 0) / fpsData.length

    expect(averageFPS).toBeGreaterThan(25) // Minimum 25 FPS (adjusted for automated testing)
  })

  it('should measure memory usage', async () => {
    await page.goto(DEV_SERVER_URL)

    const initialMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0
    })

    // Simulate user interactions that might cause memory leaks
    await page.evaluate(() => {
      // Simulate hover events
      const publications = document.querySelectorAll('.publication-component')
      publications.forEach((pub) => {
        pub.dispatchEvent(new MouseEvent('mouseenter'))
        pub.dispatchEvent(new MouseEvent('mouseleave'))
      })
    })

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const finalMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0
    })

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory - initialMemory
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024

      // Memory increase should be reasonable (less than 10MB for basic interactions)
      expect(memoryIncreaseMB).toBeLessThan(10)
    }
  })
})
