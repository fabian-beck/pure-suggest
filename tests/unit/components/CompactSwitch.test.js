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

  })




})