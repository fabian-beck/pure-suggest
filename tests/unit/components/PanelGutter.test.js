import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import PanelGutter from '@/components/PanelGutter.vue'
import { useInterfaceStore } from '@/stores/interface.js'

describe('PanelGutter', () => {
  let interfaceStore
  let pinia

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    interfaceStore = useInterfaceStore()
    interfaceStore.isMobile = false
    interfaceStore.setLayoutMode('threeColumns')
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      gridTemplateColumns: '300px 10px 300px 10px 400px'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function dragGutter(index, fromX, toX) {
    const wrapper = mount(PanelGutter, {
      props: { axis: 'columns', index },
      global: { plugins: [pinia] }
    })
    const gutter = wrapper.element
    gutter.dispatchEvent(new MouseEvent('pointerdown', { clientX: fromX }))
    gutter.dispatchEvent(new MouseEvent('pointermove', { clientX: toX }))
    gutter.dispatchEvent(new MouseEvent('pointerup'))
    wrapper.unmount()
  }

  it('moves space between the two neighboring panels of the dragged gutter', () => {
    dragGutter(1, 620, 520)

    expect(interfaceStore.panelSizes.threeColumns.columns).toEqual([30, 20, 50])
  })

  it('keeps a minimum size for the panels', () => {
    dragGutter(0, 300, 0)

    expect(interfaceStore.panelSizes.threeColumns.columns).toEqual([15, 45, 40])
  })

  it('stores the new sizes after dragging', () => {
    dragGutter(1, 620, 520)

    const stored = JSON.parse(localStorage.getItem('layoutSettings'))
    expect(stored.panelSizes.threeColumns.columns).toEqual([30, 20, 50])
  })

  it('resets the panel sizes on double-click', async () => {
    interfaceStore.panelSizes.threeColumns.columns = [10, 10, 80]
    const wrapper = mount(PanelGutter, {
      props: { axis: 'columns', index: 0 },
      global: { plugins: [pinia] }
    })

    await wrapper.trigger('dblclick')

    expect(interfaceStore.panelSizes.threeColumns.columns).toEqual([50, 50, 75])
  })
})
