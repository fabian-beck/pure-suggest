import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import PublicationTag from '@/components/PublicationTag.vue'

describe('PublicationTag', () => {
  const createWrapper = (props = {}) => {
    return mount(PublicationTag, {
      props,
      slots: {
        default: 'Test Tag'
      },
      global: {
        stubs: {
          'v-chip': {
            template: '<div class="v-chip" :class="$attrs.class"><slot></slot></div>',
            props: ['color', 'size', 'prependIcon']
          }
        }
      }
    })
  }

  describe('Styling', () => {
    it('applies light theme (white bg, black text) when inactive', () => {
      const wrapper = createWrapper({ active: false })
      
      expect(wrapper.find('.v-chip').classes()).toContain('has-background-white')
      expect(wrapper.find('.v-chip').classes()).toContain('has-text-black')
      expect(wrapper.find('.v-chip').classes()).not.toContain('has-background-dark')
      expect(wrapper.find('.v-chip').classes()).not.toContain('has-text-white')
    })

    it('applies dark theme (dark bg, white text) when active', () => {
      const wrapper = createWrapper({ active: true })
      
      expect(wrapper.find('.v-chip').classes()).toContain('has-background-dark')
      expect(wrapper.find('.v-chip').classes()).toContain('has-text-white')
      expect(wrapper.find('.v-chip').classes()).not.toContain('has-background-white')
      expect(wrapper.find('.v-chip').classes()).not.toContain('has-text-black')
    })

    it('applies clickable class when clickable prop is true', () => {
      const wrapper = createWrapper({ clickable: true })
      
      expect(wrapper.find('.v-chip').classes()).toContain('tag-clickable')
    })

    it('does not apply clickable class when clickable prop is false', () => {
      const wrapper = createWrapper({ clickable: false })
      
      expect(wrapper.find('.v-chip').classes()).not.toContain('tag-clickable')
    })
  })

  describe('Click Handling', () => {
    it('emits click event when clickable and clicked', async () => {
      const wrapper = createWrapper({ clickable: true })
      
      await wrapper.find('.v-chip').trigger('click')
      
      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')).toHaveLength(1)
    })

    it('does not emit click event when not clickable and clicked', async () => {
      const wrapper = createWrapper({ clickable: false })
      
      await wrapper.find('.v-chip').trigger('click')
      
      expect(wrapper.emitted('click')).toBeFalsy()
    })
  })

  describe('Icon Support', () => {
    it('renders with icon when icon prop is provided', () => {
      const wrapper = createWrapper({ icon: 'mdi-star' })
      
      expect(wrapper.props('icon')).toBe('mdi-star')
    })

    it('renders without icon when icon prop is not provided', () => {
      const wrapper = createWrapper()
      
      expect(wrapper.props('icon')).toBe('')
    })
  })

  describe('Content Rendering', () => {
    it('renders slot content correctly', () => {
      const wrapper = createWrapper()
      
      expect(wrapper.text()).toContain('Test Tag')
    })
  })
})
