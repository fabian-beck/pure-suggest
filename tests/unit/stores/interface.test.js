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
