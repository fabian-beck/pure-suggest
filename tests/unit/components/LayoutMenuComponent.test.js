import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'

import LayoutMenuComponent from '@/components/LayoutMenuComponent.vue'
import { useInterfaceStore } from '@/stores/interface.js'

describe('LayoutMenuComponent', () => {
  let interfaceStore
  let pinia

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    interfaceStore = useInterfaceStore()
    interfaceStore.isMobile = false
    interfaceStore.isWideScreen = false
  })

  const createWrapper = () =>
    mount(LayoutMenuComponent, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-btn-toggle': {
            name: 'VBtnToggle',
            props: ['modelValue'],
            template: '<div class="v-btn-toggle"><slot></slot></div>'
          }
        }
      }
    })

  it('offers the auto mode and an icon for each layout, highlighting the shown layout', () => {
    const wrapper = createWrapper()

    const buttons = wrapper.findAll('.layout-button')
    expect(buttons).toHaveLength(4)
    expect(buttons[0].text()).toBe('Auto')
    expect(wrapper.findAll('.layout-button svg')).toHaveLength(3)
    expect(wrapper.find('.is-effective').attributes('aria-label')).toBe('Network at the bottom')
  })

  it('switches the layout when a layout is chosen', async () => {
    const wrapper = createWrapper()

    wrapper.findComponent({ name: 'VBtnToggle' }).vm.$emit('update:modelValue', 'networkRight')
    await wrapper.vm.$nextTick()

    expect(interfaceStore.layoutMode).toBe('networkRight')
    expect(wrapper.find('.is-effective').attributes('aria-label')).toBe('Network on the right')
  })
})
