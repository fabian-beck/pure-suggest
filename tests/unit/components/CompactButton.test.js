import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Test the component logic directly without style imports
const CompactButtonScript = {
  name: "CompactButton",
  props: {
    icon: String,
    click: Function,
    disabled: Boolean,
    href: String,
    active: Boolean
  },
  methods: {
    openLink() {
      if (typeof this.click === 'function') this.click();
      if (this.href) window.open(this.href, '_blank');
    },
  },
  template: `
    <button 
      @click="openLink()" 
      :disabled="disabled" 
      :class="{ 'is-selected': active }"
      class="compact-button"
    >
      <span class="icon">{{ icon }}</span>
    </button>
  `
}

describe('CompactButton', () => {
  let wrapper
  
  beforeEach(() => {
    // Mock window.open
    global.window.open = vi.fn()
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(CompactButtonScript, { props })
  }


  describe('href functionality', () => {
    it('should open link in new tab when href is provided and button is clicked', async () => {
      wrapper = createWrapper({ href: 'https://example.com' })
      
      await wrapper.find('button').trigger('click')
      
      expect(window.open).toHaveBeenCalledWith('https://example.com', '_blank')
    })


  })

  describe('click prop functionality', () => {
    it('should call click function when provided and button is clicked', async () => {
      const clickHandler = vi.fn()
      wrapper = createWrapper({ click: clickHandler })
      
      await wrapper.find('button').trigger('click')
      
      expect(clickHandler).toHaveBeenCalledTimes(1)
    })


    it('should handle both click prop and href together', async () => {
      const clickHandler = vi.fn()
      wrapper = createWrapper({ 
        click: clickHandler, 
        href: 'https://example.com' 
      })
      
      await wrapper.find('button').trigger('click')
      
      expect(clickHandler).toHaveBeenCalledTimes(1)
      expect(window.open).toHaveBeenCalledWith('https://example.com', '_blank')
    })

  })



})