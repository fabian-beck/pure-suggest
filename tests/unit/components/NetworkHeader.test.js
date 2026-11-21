import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'

import NetworkHeader from '@/components/NetworkHeader.vue'
import { useInterfaceStore } from '@/stores/interface.js'

vi.mock('@/composables/useAppState.js', () => ({
  useAppState: () => ({ isEmpty: false })
}))

describe('NetworkHeader', () => {
  it('keeps the mode switch when the auto layout shows the collapsed network again', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const interfaceStore = useInterfaceStore()
    interfaceStore.isMobile = false
    interfaceStore.isNetworkCollapsed = true
    const wrapper = mount(NetworkHeader, {
      attachTo: document.body,
      global: {
        plugins: [pinia],
        stubs: { CompactButton: true, CompactSwitch: true, 'v-icon': true },
        directives: { tippy: {} }
      }
    })
    const modeSwitch = wrapper.find('compact-switch-stub')

    expect(modeSwitch.isVisible()).toBe(false)

    interfaceStore.isShortScreen = true // auto layout moves the network to the right
    await nextTick()
    expect(modeSwitch.isVisible()).toBe(true)
    wrapper.unmount()
  })
})
