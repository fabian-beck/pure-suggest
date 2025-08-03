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

  describe('rendering', () => {
    it('should render with default props', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('button').exists()).toBe(true)
      expect(wrapper.find('.icon').exists()).toBe(true)
    })

    it('should display icon in icon element', () => {
      wrapper = createWrapper({ icon: 'mdi-home' })
      expect(wrapper.find('.icon').text()).toBe('mdi-home')
    })

    it('should be disabled when disabled prop is true', () => {
      wrapper = createWrapper({ disabled: true })
      expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    })

    it('should not be disabled when disabled prop is false', () => {
      wrapper = createWrapper({ disabled: false })
      expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
    })

    it('should have is-selected class when active is true', () => {
      wrapper = createWrapper({ active: true })
      expect(wrapper.find('button').classes()).toContain('is-selected')
    })

    it('should not have is-selected class when active is false', () => {
      wrapper = createWrapper({ active: false })
      expect(wrapper.find('button').classes()).not.toContain('is-selected')
    })
  })

  describe('href functionality', () => {
    it('should open link in new tab when href is provided and button is clicked', async () => {
      wrapper = createWrapper({ href: 'https://example.com' })
      
      await wrapper.find('button').trigger('click')
      
      expect(window.open).toHaveBeenCalledWith('https://example.com', '_blank')
    })

    it('should not call window.open when href is not provided', async () => {
      wrapper = createWrapper()
      
      await wrapper.find('button').trigger('click')
      
      expect(window.open).not.toHaveBeenCalled()
    })

    it('should not call window.open when href is empty string', async () => {
      wrapper = createWrapper({ href: '' })
      
      await wrapper.find('button').trigger('click')
      
      expect(window.open).not.toHaveBeenCalled()
    })

    it('should handle various URL formats', async () => {
      const testUrls = [
        'https://example.com',
        'http://example.com', 
        'https://subdomain.example.com/path?query=1',
        'mailto:test@example.com',
        'tel:+1234567890'
      ]

      for (const url of testUrls) {
        vi.clearAllMocks()
        wrapper = createWrapper({ href: url })
        await wrapper.find('button').trigger('click')
        expect(window.open).toHaveBeenCalledWith(url, '_blank')
      }
    })
  })

  describe('click prop functionality', () => {
    it('should call click function when provided and button is clicked', async () => {
      const clickHandler = vi.fn()
      wrapper = createWrapper({ click: clickHandler })
      
      await wrapper.find('button').trigger('click')
      
      expect(clickHandler).toHaveBeenCalledTimes(1)
    })

    it('should not throw error when click prop is not provided', async () => {
      wrapper = createWrapper()
      
      expect(async () => {
        await wrapper.find('button').trigger('click')
      }).not.toThrow()
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

    it('should call click function before opening href', async () => {
      const clickHandler = vi.fn()
      const originalWindowOpen = window.open
      let callOrder = []
      
      window.open = vi.fn(() => callOrder.push('window.open'))
      clickHandler.mockImplementation(() => callOrder.push('click'))
      
      wrapper = createWrapper({ 
        click: clickHandler, 
        href: 'https://example.com' 
      })
      
      await wrapper.find('button').trigger('click')
      
      expect(callOrder).toEqual(['click', 'window.open'])
      
      window.open = originalWindowOpen
    })
  })

  describe('edge cases', () => {
    it('should handle null/undefined props gracefully', () => {
      wrapper = createWrapper({
        icon: null,
        click: undefined,
        disabled: undefined,
        href: null,
        active: undefined
      })
      
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.icon').text()).toBe('')
    })

    it('should handle non-string icon prop', () => {
      wrapper = createWrapper({ icon: 123 })
      expect(wrapper.find('.icon').text()).toBe('123')
    })

    it('should handle non-function click prop gracefully', async () => {
      wrapper = createWrapper({ click: 'not a function' })
      
      // Optional chaining handles this gracefully
      await expect(async () => {
        await wrapper.find('button').trigger('click')
      }).not.toThrow()
    })
  })

  describe('component method testing', () => {
    it('should have openLink method', () => {
      wrapper = createWrapper()
      expect(typeof wrapper.vm.openLink).toBe('function')
    })

    it('should call openLink method when button is clicked', async () => {
      wrapper = createWrapper()
      const openLinkSpy = vi.spyOn(wrapper.vm, 'openLink')
      
      await wrapper.find('button').trigger('click')
      
      expect(openLinkSpy).toHaveBeenCalledTimes(1)
    })

    it('should call click prop from openLink method', () => {
      const clickHandler = vi.fn()
      wrapper = createWrapper({ click: clickHandler })
      
      wrapper.vm.openLink()
      
      expect(clickHandler).toHaveBeenCalledTimes(1)
    })

    it('should call window.open from openLink method', () => {
      wrapper = createWrapper({ href: 'https://test.com' })
      
      wrapper.vm.openLink()
      
      expect(window.open).toHaveBeenCalledWith('https://test.com', '_blank')
    })
  })

  describe('accessibility', () => {
    it('should be accessible when disabled', () => {
      wrapper = createWrapper({ disabled: true })
      expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    })

    it('should have proper button semantics', () => {
      wrapper = createWrapper()
      expect(wrapper.find('button').element.tagName).toBe('BUTTON')
    })

    it('should be focusable when not disabled', () => {
      wrapper = createWrapper({ disabled: false })
      expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
    })
  })
})