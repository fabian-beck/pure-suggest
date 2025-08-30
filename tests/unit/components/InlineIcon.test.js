import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

const InlineIconScript = {
  name: "InlineIcon",
  props: {
    icon: String,
    color: String,
  },
  template: `
    <span :class="color ? 'has-text-' + color.replace(/\\s+/g, '-') : ''" class="inline-icon">
      {{ icon }}
    </span>
  `
}

describe('InlineIcon', () => {
  let wrapper

  const createWrapper = (props = {}) => {
    return mount(InlineIconScript, { props })
  }

  describe('rendering', () => {
    it('should render with icon text', () => {
      wrapper = createWrapper({ icon: 'mdi-home' })
      expect(wrapper.text()).toBe('mdi-home')
    })

    it('should apply color class when color prop is provided', () => {
      wrapper = createWrapper({ color: 'primary' })
      expect(wrapper.classes()).toContain('has-text-primary')
    })

    it('should handle both icon and color props', () => {
      wrapper = createWrapper({ icon: 'mdi-star', color: 'warning' })
      expect(wrapper.text()).toBe('mdi-star')
      expect(wrapper.classes()).toContain('has-text-warning')
    })
  })

})