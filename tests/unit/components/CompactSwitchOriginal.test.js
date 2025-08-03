import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

// Test the ORIGINAL component logic to spot the bug
const CompactSwitchOriginal = {
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

describe('CompactSwitchOriginal - Bug Detection', () => {
  let wrapper

  const createWrapper = (props = {}) => {
    return mount(CompactSwitchOriginal, { props })
  }

  describe('potential v-model bug', () => {
    it('should emit the NEW value, not the negation of current value', async () => {
      // This test reveals the potential issue with the original emit logic
      wrapper = createWrapper({ modelValue: false })
      
      // When user clicks to turn switch ON
      await wrapper.find('input').trigger('change')
      
      // The emit should send the NEW desired state (true)
      // But the original code sends !modelValue (which would be !false = true)
      // This works by accident when modelValue matches reality
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([true])
    })

    it('reveals the bug when modelValue is out of sync', async () => {
      // Scenario: Parent component has modelValue=false but hasn't updated yet
      // User clicks switch (wants to turn it ON)
      wrapper = createWrapper({ modelValue: false })
      
      await wrapper.find('input').trigger('change')
      
      // Original code emits !modelValue = !false = true ✓ (correct by accident)
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([true])
      
      // But if the parent is slow to update and user clicks again quickly:
      // modelValue is still false, user clicks again (wants to turn it OFF)
      await wrapper.find('input').trigger('change')
      
      // Original code emits !modelValue = !false = true ✗ (wrong! should be false)
      expect(wrapper.emitted('update:modelValue')[1]).toEqual([true]) // This is the bug!
      
      // The user clicked twice but both emits sent 'true'
      // Correct behavior would alternate: true, then false
    })

    it('shows how v-model should really work', async () => {
      // Better implementation would emit the checkbox's actual checked state
      // Not the negation of a potentially stale prop
      
      // This test documents the expected behavior, not necessarily what the original does
      wrapper = createWrapper({ modelValue: false })
      
      // First click: OFF -> ON
      await wrapper.find('input').trigger('change')
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([true])
      
      // Parent updates the prop
      await wrapper.setProps({ modelValue: true })
      
      // Second click: ON -> OFF  
      await wrapper.find('input').trigger('change')
      expect(wrapper.emitted('update:modelValue')[1]).toEqual([false])
      
      // This works with the current implementation only when parent updates are fast
    })
  })

  describe('edge case that might break', () => {
    it('should handle rapid clicks correctly', async () => {
      wrapper = createWrapper({ modelValue: false })
      
      // Rapid double click before parent can update
      await wrapper.find('input').trigger('change')
      await wrapper.find('input').trigger('change')
      
      // With original logic: both emit !false = true
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([true])
      expect(wrapper.emitted('update:modelValue')[1]).toEqual([true]) // Problem!
      
      // Expected behavior would be: true, then false
      // But original implementation can't handle rapid clicks properly
    })
  })
})