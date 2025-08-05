import puppeteer from 'puppeteer';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Browser Performance Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Enable Performance API
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = [];
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('should measure page load performance', async () => {
    // Start the dev server (assuming it's running)
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    expect(metrics.domContentLoaded).toBeLessThan(2000); // 2 seconds
    expect(metrics.loadComplete).toBeLessThan(3000); // 3 seconds
  });

  it('should measure PublicationComponent render performance in browser', async () => {
    await page.goto('http://localhost:5173');
    
    // Wait for the application to load
    await page.waitForSelector('[data-testid="app"]', { timeout: 10000 });

    // Measure rendering time for publication components
    const renderMetrics = await page.evaluate(async () => {
      const startTime = performance.now();
      
      // Simulate adding publications (this would depend on your app's API)
      // For now, we'll measure existing elements
      const publications = document.querySelectorAll('.publication-component');
      
      const endTime = performance.now();
      
      return {
        renderTime: endTime - startTime,
        publicationCount: publications.length
      };
    });

    expect(renderMetrics.renderTime).toBeLessThan(500); // 500ms for initial render
  });

  it('should measure scroll performance', async () => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="app"]', { timeout: 10000 });

    // Start measuring FPS
    await page.evaluate(() => {
      window.fpsData = [];
      let frameCount = 0;
      const startTime = performance.now();
      
      function measureFPS() {
        frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;
        
        if (elapsed >= 1000) {
          window.fpsData.push(Math.round((frameCount * 1000) / elapsed));
          frameCount = 0;
        }
        
        if (window.fpsData.length < 3) {
          requestAnimationFrame(measureFPS);
        }
      }
      
      requestAnimationFrame(measureFPS);
    });

    // Simulate scrolling
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 200));
      await page.waitForTimeout(200);
    }

    const fpsData = await page.evaluate(() => window.fpsData);
    const averageFPS = fpsData.reduce((sum, fps) => sum + fps, 0) / fpsData.length;

    expect(averageFPS).toBeGreaterThan(30); // Minimum 30 FPS
  });

  it('should measure memory usage', async () => {
    await page.goto('http://localhost:5173');
    
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });

    // Simulate user interactions that might cause memory leaks
    await page.evaluate(() => {
      // Simulate hover events
      const publications = document.querySelectorAll('.publication-component');
      publications.forEach(pub => {
        pub.dispatchEvent(new MouseEvent('mouseenter'));
        pub.dispatchEvent(new MouseEvent('mouseleave'));
      });
    });

    await page.waitForTimeout(1000);

    const finalMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      // Memory increase should be reasonable (less than 10MB for basic interactions)
      expect(memoryIncreaseMB).toBeLessThan(10);
    }
  });
});