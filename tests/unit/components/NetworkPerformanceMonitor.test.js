import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'

import NetworkPerformanceMonitor from '@/components/NetworkPerformanceMonitor.vue'

describe('NetworkPerformanceMonitor', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(NetworkPerformanceMonitor, {
      props: {
        show: true,
        isEmpty: false,
        nodeCount: 10,
        linkCount: 15,
        shouldSkipEarlyTicks: false,
        skipEarlyTicks: 10
      }
    })
  })

  it('renders performance metrics when show is true and not empty', () => {
    expect(wrapper.find('.fps-display').exists()).toBe(true)
    expect(wrapper.text()).toContain('FPS:')
    expect(wrapper.text()).toContain('Nodes: 10')
    expect(wrapper.text()).toContain('Links: 15')
    expect(wrapper.text()).toContain('DOM Updates:')
    expect(wrapper.text()).toContain('Skipped:')
  })

  it('shows empty state message when isEmpty is true', async () => {
    await wrapper.setProps({ isEmpty: true })

    expect(wrapper.text()).toContain('SIMULATION SKIPPED')
    expect(wrapper.text()).toContain('(Empty State)')
    expect(wrapper.text()).toContain('Network Cleared')
  })

  it('does not render when show is false', async () => {
    await wrapper.setProps({ show: false })

    expect(wrapper.find('.fps-display').exists()).toBe(false)
  })

  it('shows skipping indicator during early tick skip period', async () => {
    // Increment tick counter and set props
    wrapper.vm.incrementTick()
    wrapper.vm.incrementTick()
    wrapper.vm.incrementTick()
    wrapper.vm.incrementTick()
    wrapper.vm.incrementTick() // tickCount = 5
    await wrapper.setProps({ shouldSkipEarlyTicks: true, skipEarlyTicks: 10 })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Tick: 5 (skipping)')
  })

  it('tracks FPS correctly', () => {
    wrapper.vm.trackFps()

    // FPS tracker should be working (exact value depends on timing)
    expect(wrapper.vm.fpsTracker).toBeDefined()
  })

  it('increments tick counter', () => {
    const initialTick = wrapper.vm.tickCount
    wrapper.vm.incrementTick()

    expect(wrapper.vm.tickCount).toBe(initialTick + 1)
  })

  it('records DOM update metrics', () => {
    wrapper.vm.recordDomUpdate(5, 8)

    expect(wrapper.vm.domUpdateCount).toBe(1)
    expect(wrapper.vm.lastNodeUpdateCount).toBe(5)
    expect(wrapper.vm.lastLinkUpdateCount).toBe(8)
  })

  it('records skipped updates', () => {
    wrapper.vm.recordSkippedUpdate()

    expect(wrapper.vm.skippedUpdateCount).toBe(1)
    expect(wrapper.vm.lastNodeUpdateCount).toBe(0)
    expect(wrapper.vm.lastLinkUpdateCount).toBe(0)
  })

  it('resets all metrics', () => {
    // Set some values first by calling methods
    wrapper.vm.incrementTick()
    wrapper.vm.incrementTick()
    wrapper.vm.incrementTick()
    wrapper.vm.incrementTick()
    wrapper.vm.incrementTick() // tickCount = 5
    wrapper.vm.recordDomUpdate(4, 6) // domUpdateCount = 1, lastNodeUpdateCount = 4, lastLinkUpdateCount = 6
    wrapper.vm.recordSkippedUpdate() // skippedUpdateCount = 1
    wrapper.vm.recordSkippedUpdate() // skippedUpdateCount = 2

    wrapper.vm.resetMetrics()

    expect(wrapper.vm.tickCount).toBe(0)
    expect(wrapper.vm.domUpdateCount).toBe(0)
    expect(wrapper.vm.skippedUpdateCount).toBe(0)
    expect(wrapper.vm.lastNodeUpdateCount).toBe(0)
    expect(wrapper.vm.lastLinkUpdateCount).toBe(0)
  })
})
