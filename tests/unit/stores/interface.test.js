import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'

import { useInterfaceStore } from '@/stores/interface.js'

describe('Interface Store - Loading Cancellation', () => {
  let interfaceStore

  beforeEach(() => {
    setActivePinia(createPinia())
    interfaceStore = useInterfaceStore()
  })

  it('should create a cancellation token when loading starts', () => {
    interfaceStore.startLoading()

    expect(interfaceStore.isLoading).toBe(true)
    expect(interfaceStore.loadingCancelToken).not.toBeNull()
    expect(interfaceStore.loadingCancelToken.isCancelled).toBe(false)
  })

  it('should clear the cancellation token when loading ends', () => {
    interfaceStore.startLoading()
    interfaceStore.endLoading()

    expect(interfaceStore.isLoading).toBe(false)
    expect(interfaceStore.loadingCancelToken).toBeNull()
  })

  it('should mark the token as cancelled and resolve its promise when cancelLoading is called while cancelable', async () => {
    interfaceStore.startLoading()
    interfaceStore.setLoadingCancelable(true)
    const token = interfaceStore.loadingCancelToken

    interfaceStore.cancelLoading()

    expect(token.isCancelled).toBe(true)
    await expect(token.promise).resolves.toBeUndefined()
  })

  it('should do nothing when cancelLoading is called while not loading', () => {
    expect(() => interfaceStore.cancelLoading()).not.toThrow()
    expect(interfaceStore.loadingCancelToken).toBeNull()
  })

  it('should not cancel the token when cancelLoading is called while loading but not cancelable', () => {
    interfaceStore.startLoading()
    const token = interfaceStore.loadingCancelToken

    interfaceStore.cancelLoading()

    expect(token.isCancelled).toBe(false)
  })
})

describe('Interface Store - Layout', () => {
  let interfaceStore

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    interfaceStore = useInterfaceStore()
    interfaceStore.isMobile = false
    interfaceStore.isWideScreen = false
  })

  it('chooses the layout from the window size in auto mode', () => {
    expect(interfaceStore.layoutMode).toBe('auto')
    expect(interfaceStore.effectiveLayout).toBe('networkBottom')

    interfaceStore.isShortScreen = true
    expect(interfaceStore.effectiveLayout).toBe('networkRight')

    interfaceStore.isWideScreen = true
    expect(interfaceStore.effectiveLayout).toBe('threeColumns')
  })

  it('switches to the mobile view below the desktop breakpoint, showing the lists again', () => {
    interfaceStore.isNetworkExpanded = true

    window.innerWidth = 1024
    interfaceStore.checkMobile()
    expect(interfaceStore.isMobile).toBe(false)
    expect(interfaceStore.isNetworkExpanded).toBe(true)

    window.innerWidth = 1023
    interfaceStore.checkMobile()
    expect(interfaceStore.isMobile).toBe(true)
    expect(interfaceStore.isNetworkExpanded).toBe(false)
  })

  it('uses a manually chosen layout independent of the window size', () => {
    interfaceStore.isWideScreen = true
    interfaceStore.setLayoutMode('networkRight')

    expect(interfaceStore.effectiveLayout).toBe('networkRight')
  })

  it('allows collapsing the network only when it is placed at the bottom on desktop', () => {
    expect(interfaceStore.isNetworkCollapsible).toBe(true)

    interfaceStore.setLayoutMode('threeColumns')
    expect(interfaceStore.isNetworkCollapsible).toBe(false)

    interfaceStore.setLayoutMode('networkBottom')
    interfaceStore.isMobile = true
    expect(interfaceStore.isNetworkCollapsible).toBe(false)
  })

  it('shows the network collapsed only where it can be collapsed', () => {
    interfaceStore.isNetworkCollapsed = true
    expect(interfaceStore.isNetworkShownCollapsed).toBe(true)

    interfaceStore.isMobile = true
    expect(interfaceStore.isNetworkShownCollapsed).toBe(false)
  })

  it('shows the network in normal size when switching the layout', () => {
    interfaceStore.collapseNetwork()
    interfaceStore.setLayoutMode('networkRight')

    expect(interfaceStore.isNetworkCollapsed).toBe(false)
    expect(interfaceStore.isNetworkExpanded).toBe(false)
  })

  it('restores layout mode and panel sizes from a previous visit', () => {
    interfaceStore.setLayoutMode('threeColumns')
    interfaceStore.panelSizes.threeColumns.columns = [20, 30, 50]
    interfaceStore.saveLayoutSettings()

    setActivePinia(createPinia())
    const restoredStore = useInterfaceStore()

    expect(restoredStore.layoutMode).toBe('threeColumns')
    expect(restoredStore.panelSizes.threeColumns.columns).toEqual([20, 30, 50])
    expect(restoredStore.panelSizes.networkBottom.rows).toEqual([55, 45])
  })

  it('ignores invalid stored layout settings', () => {
    localStorage.setItem('layoutSettings', '{"mode":"unknown","panelSizes":{"threeColumns":{"columns":[1]}}}')
    setActivePinia(createPinia())
    const restoredStore = useInterfaceStore()

    expect(restoredStore.layoutMode).toBe('auto')
    expect(restoredStore.panelSizes.threeColumns.columns).toEqual([50, 50, 75])
  })

  it('resets the panel sizes of one layout dimension to the defaults', () => {
    interfaceStore.panelSizes.networkRight.columns = [10, 90]
    interfaceStore.panelSizes.networkRight.rows = [30, 70]

    interfaceStore.resetPanelSizes('networkRight', 'columns')

    expect(interfaceStore.panelSizes.networkRight.columns).toEqual([45, 55])
    expect(interfaceStore.panelSizes.networkRight.rows).toEqual([30, 70])
  })
})
