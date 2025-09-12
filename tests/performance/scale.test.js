import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  measureRenderTime,
  measureMemoryUsage,
  createMockPublications,
  PerformanceProfiler
} from './utils.js'

import PublicationComponent from '@/components/PublicationComponent.vue'


// Mock IndexedDB and dependencies
global.indexedDB = {
  open: vi.fn(() => ({ result: {}, onsuccess: vi.fn(), onerror: vi.fn() })),
  deleteDatabase: vi.fn(),
  cmp: vi.fn()
}

vi.mock('idb-keyval', () => ({
  keys: vi.fn(() => Promise.resolve([])),
  get: vi.fn(() => Promise.resolve(null)),
  set: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve())
}))

const SCALE_THRESHOLDS = {
  small: { count: 10, renderTimeMs: 200, memoryMB: 5 },
  medium: { count: 100, renderTimeMs: 700, memoryMB: 20 },
  large: { count: 500, renderTimeMs: 2500, memoryMB: 50 },
  xlarge: { count: 1000, renderTimeMs: 4000, memoryMB: 100 }
}

function createMountWrapper(publications) {
  return () => {
    const wrappers = []
    publications.forEach((publication, _index) => {
      const wrapper = mount(PublicationComponent, {
        props: { publication },
        global: {
          stubs: {
            PublicationDescription: {
              template: '<div class="publication-description"><slot></slot></div>'
            },
            CompactButton: { template: '<button class="compact-button"><slot></slot></button>' },
            InlineIcon: { template: '<i class="inline-icon"><slot></slot></i>' },
            tippy: { template: '<span class="tippy"><slot></slot></span>' }
          },
          directives: {
            tippy: {
              mounted() {},
              unmounted() {},
              updated() {}
            }
          }
        },
        attachTo: document.createElement('div')
      })
      wrappers.push(wrapper)
    })
    return wrappers
  }
}

async function measureBatchOperations(wrappers, operationName, operation) {
  const profiler = new PerformanceProfiler(`batch-${operationName}`)
  profiler.start()

  const start = performance.now()
  for (const wrapper of wrappers) {
    await operation(wrapper)
  }
  const end = performance.now()

  profiler.end()
  return {
    totalTime: end - start,
    averageTime: (end - start) / wrappers.length,
    profilerReport: profiler.getReport()
  }
}

describe('PublicationComponent Scale Performance Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Clear memory before each test
    if (global.gc) {
      global.gc()
    }
  })

  it('should handle 10 publications efficiently (baseline)', async () => {
    const publications = createMockPublications(SCALE_THRESHOLDS.small.count)
    const memoryBefore = measureMemoryUsage()

    const { result: wrappers, renderTime } = measureRenderTime(createMountWrapper(publications))

    const memoryAfter = measureMemoryUsage()

    expect(renderTime).toBeLessThan(SCALE_THRESHOLDS.small.renderTimeMs)

    if (memoryBefore && memoryAfter) {
      const memoryUsedMB = (memoryAfter.used - memoryBefore.used) / 1024 / 1024
      expect(memoryUsedMB).toBeLessThan(SCALE_THRESHOLDS.small.memoryMB)
    }

    // Test batch hover operations
    const hoverMetrics = await measureBatchOperations(wrappers, 'hover', async (wrapper) => {
      const el = wrapper.find('.publication-component')
      await el.trigger('mouseenter')
      await el.trigger('mouseleave')
    })

    expect(hoverMetrics.averageTime).toBeLessThan(5) // 5ms per hover operation

    // Cleanup
    wrappers.forEach((wrapper) => wrapper.unmount())

    console.log(
      `✅ Small Scale (${SCALE_THRESHOLDS.small.count}): Render ${renderTime.toFixed(2)}ms, Avg Hover ${hoverMetrics.averageTime.toFixed(2)}ms`
    )
  })

  it('should handle 100 publications at medium scale', async () => {
    const publications = createMockPublications(SCALE_THRESHOLDS.medium.count)
    const memoryBefore = measureMemoryUsage()

    const profiler = new PerformanceProfiler('medium-scale-render')
    profiler.start()

    const { result: wrappers, renderTime } = measureRenderTime(createMountWrapper(publications))

    profiler.mark('components-created').end()
    const memoryAfter = measureMemoryUsage()

    expect(renderTime).toBeLessThan(SCALE_THRESHOLDS.medium.renderTimeMs)

    if (memoryBefore && memoryAfter) {
      const memoryUsedMB = (memoryAfter.used - memoryBefore.used) / 1024 / 1024
      expect(memoryUsedMB).toBeLessThan(SCALE_THRESHOLDS.medium.memoryMB)
      console.log(`📊 Memory usage: ${memoryUsedMB.toFixed(2)}MB`)
    }

    // Test subset of hover operations (every 10th component to avoid timeout)
    const sampleWrappers = wrappers.filter((_, index) => index % 10 === 0)
    const hoverMetrics = await measureBatchOperations(
      sampleWrappers,
      'hover-sample',
      async (wrapper) => {
        const el = wrapper.find('.publication-component')
        await el.trigger('mouseenter')
        await el.trigger('mouseleave')
      }
    )

    expect(hoverMetrics.averageTime).toBeLessThan(10) // 10ms per hover operation at scale

    // Cleanup
    wrappers.forEach((wrapper) => wrapper.unmount())

    console.log(
      `✅ Medium Scale (${SCALE_THRESHOLDS.medium.count}): Render ${renderTime.toFixed(2)}ms, Sample Hover ${hoverMetrics.averageTime.toFixed(2)}ms`
    )
    console.log(`📈 Profiler Report:`, profiler.getReport())
  })

  it('should handle 500 publications at large scale', async () => {
    const publications = createMockPublications(SCALE_THRESHOLDS.large.count)
    const memoryBefore = measureMemoryUsage()

    const profiler = new PerformanceProfiler('large-scale-render')
    profiler.start()

    const { result: wrappers, renderTime } = measureRenderTime(createMountWrapper(publications))

    profiler.mark('components-created').end()
    const memoryAfter = measureMemoryUsage()

    expect(renderTime).toBeLessThan(SCALE_THRESHOLDS.large.renderTimeMs)

    if (memoryBefore && memoryAfter) {
      const memoryUsedMB = (memoryAfter.used - memoryBefore.used) / 1024 / 1024
      expect(memoryUsedMB).toBeLessThan(SCALE_THRESHOLDS.large.memoryMB)
      console.log(`📊 Memory usage: ${memoryUsedMB.toFixed(2)}MB`)
    }

    // Test very limited hover operations (every 50th component)
    const sampleWrappers = wrappers.filter((_, index) => index % 50 === 0)
    const hoverMetrics = await measureBatchOperations(
      sampleWrappers,
      'hover-large-sample',
      async (wrapper) => {
        const el = wrapper.find('.publication-component')
        await el.trigger('mouseenter')
      }
    )

    expect(hoverMetrics.averageTime).toBeLessThan(15) // 15ms per hover operation at large scale

    // Test reactive updates on sample
    const updateMetrics = await measureBatchOperations(
      sampleWrappers.slice(0, 5),
      'reactive-updates',
      async (wrapper) => {
        const publication = wrapper.props('publication')
        publication.isActive = !publication.isActive
        publication.score = Math.floor(Math.random() * 10) + 1
        await wrapper.vm.$nextTick()
      }
    )

    expect(updateMetrics.averageTime).toBeLessThan(20) // 20ms per reactive update

    // Cleanup
    wrappers.forEach((wrapper) => wrapper.unmount())

    console.log(
      `✅ Large Scale (${SCALE_THRESHOLDS.large.count}): Render ${renderTime.toFixed(2)}ms`
    )
    console.log(
      `📈 Hover Sample: ${hoverMetrics.averageTime.toFixed(2)}ms, Update Sample: ${updateMetrics.averageTime.toFixed(2)}ms`
    )
  })

  it('should handle 1000+ publications at extra large scale', async () => {
    const publications = createMockPublications(SCALE_THRESHOLDS.xlarge.count)
    const memoryBefore = measureMemoryUsage()

    const profiler = new PerformanceProfiler('xlarge-scale-render')
    profiler.start()

    const { result: wrappers, renderTime } = measureRenderTime(createMountWrapper(publications))

    profiler.mark('components-created').end()
    const memoryAfter = measureMemoryUsage()

    // At this scale, we expect performance degradation but should still be reasonable
    expect(renderTime).toBeLessThan(SCALE_THRESHOLDS.xlarge.renderTimeMs)

    if (memoryBefore && memoryAfter) {
      const memoryUsedMB = (memoryAfter.used - memoryBefore.used) / 1024 / 1024
      expect(memoryUsedMB).toBeLessThan(SCALE_THRESHOLDS.xlarge.memoryMB)
      console.log(`📊 Memory usage: ${memoryUsedMB.toFixed(2)}MB`)
    }

    // Very limited testing at this scale (every 100th component)
    const sampleWrappers = wrappers.filter((_, index) => index % 100 === 0)
    const hoverMetrics = await measureBatchOperations(
      sampleWrappers,
      'hover-xlarge-sample',
      async (wrapper) => {
        const el = wrapper.find('.publication-component')
        await el.trigger('mouseenter')
      }
    )

    expect(hoverMetrics.averageTime).toBeLessThan(25) // 25ms per hover at XL scale

    // Cleanup in batches to avoid memory issues
    const batchSize = 100
    for (let i = 0; i < wrappers.length; i += batchSize) {
      const batch = wrappers.slice(i, i + batchSize)
      batch.forEach((wrapper) => wrapper.unmount())

      // Allow event loop to process cleanup
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    console.log(
      `✅ XLarge Scale (${SCALE_THRESHOLDS.xlarge.count}): Render ${renderTime.toFixed(2)}ms`
    )
    console.log(`📈 Sample Metrics: Hover ${hoverMetrics.averageTime.toFixed(2)}ms`)
    console.log(`⚠️  At this scale, consider implementing virtualization`)
  })

  it('should identify performance regression patterns', async () => {
    const scales = [10, 50, 100, 200, 500]
    const results = []

    for (const scale of scales) {
      const publications = createMockPublications(scale)
      const memoryBefore = measureMemoryUsage()

      const { result: wrappers, renderTime } = measureRenderTime(createMountWrapper(publications))

      const memoryAfter = measureMemoryUsage()
      const memoryUsedMB =
        memoryBefore && memoryAfter ? (memoryAfter.used - memoryBefore.used) / 1024 / 1024 : 0

      results.push({
        scale,
        renderTime,
        memoryUsedMB,
        renderTimePerComponent: renderTime / scale,
        memoryPerComponent: memoryUsedMB / scale
      })

      // Cleanup
      wrappers.forEach((wrapper) => wrapper.unmount())

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
    }

    // Analyze scaling patterns
    console.log('\n📊 SCALING ANALYSIS:')
    console.log('Scale | Render(ms) | Memory(MB) | ms/comp | MB/comp')
    console.log('------|------------|------------|---------|--------')

    results.forEach((result) => {
      console.log(
        `${result.scale.toString().padStart(5)} | ` +
          `${result.renderTime.toFixed(1).padStart(10)} | ` +
          `${result.memoryUsedMB.toFixed(1).padStart(10)} | ` +
          `${result.renderTimePerComponent.toFixed(2).padStart(7)} | ` +
          `${result.memoryPerComponent.toFixed(3).padStart(7)}`
      )
    })

    // Check for concerning scaling patterns
    const renderTimeGrowth = results[results.length - 1].renderTime / results[0].renderTime
    const memoryGrowth = results[results.length - 1].memoryUsedMB / results[0].memoryUsedMB

    console.log(`\n📈 GROWTH PATTERNS:`)
    console.log(
      `Render Time Growth: ${renderTimeGrowth.toFixed(2)}x (${scales[0]} → ${scales[scales.length - 1]} components)`
    )
    console.log(`Memory Growth: ${memoryGrowth.toFixed(2)}x`)

    // Performance should scale roughly linearly, not exponentially
    // Allowing for realistic overhead - components don't scale perfectly linearly
    expect(renderTimeGrowth).toBeLessThan((scales[scales.length - 1] / scales[0]) * 3.5) // Allow 250% overhead

    if (renderTimeGrowth > 30) {
      console.log(
        `⚠️  RECOMMENDATION: Consider virtualization for ${scales[scales.length - 1]}+ components`
      )
    }
  })
})
