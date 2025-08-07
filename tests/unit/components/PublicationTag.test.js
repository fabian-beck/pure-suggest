import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PublicationTag from '@/components/PublicationTag.vue'

describe('PublicationTag', () => {
  it('renders slot content correctly', () => {
    const wrapper = mount(PublicationTag, {
      slots: {
        default: 'Test Tag Content'
      },
      global: {
        stubs: {
          'v-chip': { template: '<div class="v-chip"><slot></slot></div>' }
        }
      }
    })

    expect(wrapper.text()).toBe('Test Tag Content')
  })

  it('passes correct props to v-chip component', () => {
    const wrapper = mount(PublicationTag, {
      props: {
        icon: 'mdi-star'
      },
      slots: {
        default: 'Starred'
      },
      global: {
        stubs: {
          'v-chip': true
        }
      }
    })

    const chip = wrapper.getComponent({ name: 'v-chip' })
    // Check the actual attributes passed to v-chip
    expect(chip.attributes('prepend-icon')).toBe('mdi-star')
    expect(chip.attributes('color')).toBe('black')
    expect(chip.attributes('size')).toBe('small')
  })

  it('renders without icon when no icon prop provided', () => {
    const wrapper = mount(PublicationTag, {
      slots: {
        default: 'No Icon'
      },
      global: {
        stubs: {
          'v-chip': true
        }
      }
    })

    const chip = wrapper.getComponent({ name: 'v-chip' })
    expect(chip.props('prependIcon')).toBeUndefined()
  })
})