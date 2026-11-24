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

  const createWrapper = (props = {}) =>
    mount(LayoutMenuComponent, {
      props,
      global: {
        plugins: [pinia],
        stubs: {
          'v-btn-toggle': {
            name: 'VBtnToggle',
            props: ['modelValue'],
            template: '<div class="v-btn-toggle"><slot></slot></div>'
          },
          'v-menu': {
            template:
              '<div class="v-menu"><slot name="activator" :props="{}"></slot><slot></slot></div>'
          },
          'v-list-item': {
            props: ['title', 'active'],
            template:
              '<div class="v-list-item" :class="{ active }" @click="$emit(\'click\')"><slot name="prepend"></slot>{{ title }}</div>'
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

  it('collapses into a menu showing the shown layout and offering all layouts', async () => {
    const wrapper = createWrapper({ collapsed: true })

    expect(wrapper.find('.v-btn-toggle').exists()).toBe(false)
    expect(wrapper.findAll('.layout-menu-button svg')).toHaveLength(1)
    const items = wrapper.findAll('.v-list-item').filter((item) => item.text())
    expect(items.map((item) => item.text())).toEqual([
      'AutoAutomatic layout',
      'Network at the bottom',
      'Network on the right',
      'Three columns'
    ])
    expect(items[0].classes()).toContain('active')

    await items[3].trigger('click')

    expect(interfaceStore.layoutMode).toBe('threeColumns')
    expect(wrapper.find('.active').text()).toBe('Three columns')
  })
})
