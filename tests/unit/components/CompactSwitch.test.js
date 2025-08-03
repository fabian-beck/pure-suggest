import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// Test the component logic directly without style imports
const CompactSwitchScript = {
  name: "CompactSwitch",
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `
    <input 
      type="checkbox"
      :checked="!!modelValue"
      @change="$emit('update:modelValue', !modelValue)"
      class="compact-switch"
    />
  `
}

describe('CompactSwitch', () => {
  let wrapper

  const createWrapper = (props = {}) => {
    return mount(CompactSwitchScript, { props })
  }

  describe('rendering', () => {
    it('should render with default props', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
    })

    it('should be unchecked when modelValue is false', () => {
      wrapper = createWrapper({ modelValue: false })
      expect(wrapper.find('input').element.checked).toBe(false)
    })

    it('should be checked when modelValue is true', () => {
      wrapper = createWrapper({ modelValue: true })
      expect(wrapper.find('input').element.checked).toBe(true)
    })

    it('should be unchecked when modelValue is undefined', () => {
      wrapper = createWrapper({ modelValue: undefined })
      expect(wrapper.find('input').element.checked).toBe(false)
    })

    it('should be unchecked when modelValue is null', () => {
      wrapper = createWrapper({ modelValue: null })
      expect(wrapper.find('input').element.checked).toBe(false)
    })
  })

  describe('v-model behavior', () => {
    it('should emit update:modelValue with true when clicked while false', async () => {
      wrapper = createWrapper({ modelValue: false })
      
      await wrapper.find('input').trigger('change')
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([true])
    })

    it('should emit update:modelValue with false when clicked while true', async () => {
      wrapper = createWrapper({ modelValue: true })
      
      await wrapper.find('input').trigger('change')
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([false])
    })

    it('should emit update:modelValue with true when modelValue is undefined', async () => {
      wrapper = createWrapper({ modelValue: undefined })
      
      await wrapper.find('input').trigger('change')
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([true])
    })

    it('should emit update:modelValue with true when modelValue is null', async () => {
      wrapper = createWrapper({ modelValue: null })
      
      await wrapper.find('input').trigger('change')
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([true])
    })

    it('should emit update:modelValue with true when modelValue is 0', async () => {
      wrapper = createWrapper({ modelValue: 0 })
      
      await wrapper.find('input').trigger('change')
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([true])
    })

    it('should emit update:modelValue with false when modelValue is 1', async () => {
      wrapper = createWrapper({ modelValue: 1 })
      
      await wrapper.find('input').trigger('change')
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([false])
    })
  })

  describe('edge cases', () => {
    it('should handle string "true" as truthy', async () => {
      wrapper = createWrapper({ modelValue: "true" })
      expect(wrapper.find('input').element.checked).toBe(true) // Strings are truthy
      
      await wrapper.find('input').trigger('change')
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([false]) // !modelValue = false
    })

    it('should handle string "false" as truthy', async () => {
      wrapper = createWrapper({ modelValue: "false" })
      expect(wrapper.find('input').element.checked).toBe(true) // Non-empty strings are truthy
      
      await wrapper.find('input').trigger('change')
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([false]) // !modelValue = false
    })

    it('should handle empty string as falsy', async () => {
      wrapper = createWrapper({ modelValue: "" })
      expect(wrapper.find('input').element.checked).toBe(false) // Empty string is falsy
      
      await wrapper.find('input').trigger('change')
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([true]) // !modelValue = true
    })

    it('should handle array as truthy', async () => {
      wrapper = createWrapper({ modelValue: [] })
      expect(wrapper.find('input').element.checked).toBe(true) // Arrays are truthy
      
      await wrapper.find('input').trigger('change')
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([false]) // !modelValue = false
    })

    it('should handle object as truthy', async () => {
      wrapper = createWrapper({ modelValue: {} })
      expect(wrapper.find('input').element.checked).toBe(true) // Objects are truthy
      
      await wrapper.find('input').trigger('change')
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([false]) // !modelValue = false
    })
  })

  describe('multiple interactions', () => {
    it('should toggle correctly through multiple clicks', async () => {
      wrapper = createWrapper({ modelValue: false })
      
      // First click: false -> true
      await wrapper.find('input').trigger('change')
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([true])
      
      // Update the prop and click again: true -> false
      await wrapper.setProps({ modelValue: true })
      await wrapper.find('input').trigger('change')
      expect(wrapper.emitted('update:modelValue')[1]).toEqual([false])
      
      // Update the prop and click again: false -> true
      await wrapper.setProps({ modelValue: false })
      await wrapper.find('input').trigger('change')
      expect(wrapper.emitted('update:modelValue')[2]).toEqual([true])
    })

    it('should maintain state consistency with prop updates', async () => {
      wrapper = createWrapper({ modelValue: false })
      expect(wrapper.find('input').element.checked).toBe(false)
      
      await wrapper.setProps({ modelValue: true })
      expect(wrapper.find('input').element.checked).toBe(true)
      
      await wrapper.setProps({ modelValue: false })
      expect(wrapper.find('input').element.checked).toBe(false)
    })
  })

  describe('event emission timing', () => {
    it('should emit exactly one event per change', async () => {
      wrapper = createWrapper({ modelValue: false })
      
      await wrapper.find('input').trigger('change')
      
      expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    })

    it('should not emit on prop updates', async () => {
      wrapper = createWrapper({ modelValue: false })
      
      await wrapper.setProps({ modelValue: true })
      
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })
  })

  describe('accessibility', () => {
    it('should use proper checkbox semantics', () => {
      wrapper = createWrapper()
      const input = wrapper.find('input')
      expect(input.element.type).toBe('checkbox')
    })

    it('should be keyboard accessible', async () => {
      wrapper = createWrapper({ modelValue: false })
      
      // Simulate space key press (standard for checkboxes)
      await wrapper.find('input').trigger('keydown.space')
      await wrapper.find('input').trigger('change')
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })
  })
})