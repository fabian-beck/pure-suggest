import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'

import ModalDialog from '@/components/modal/ModalDialog.vue'

describe('ModalDialog keyboard support', () => {
  let wrapper, items, input, dialogKeys

  const mountDialog = ({ withInput = false } = {}) => {
    dialogKeys = []
    const entries = ref(['a', 'b', 'c'])
    wrapper = mount(
      {
        components: { ModalDialog },
        setup: () => ({ entries, dialogKeys }),
        template: `
          <ModalDialog :model-value="true" @dialog-key="(event, index) => {
            dialogKeys.push([event.key, index])
            if (event.key === 'Delete') { entries.splice(index, 1); event.preventDefault() }
          }">
            <template #sticky>
              <input v-if="${withInput}" class="dialog-initial-focus" type="text" />
            </template>
            <ul>
              <li v-for="entry in entries" :key="entry" class="dialog-item" tabindex="0">
                {{ entry }}<button>action</button>
              </li>
            </ul>
          </ModalDialog>`
      },
      { attachTo: document.body, global: { stubs: { CompactButton: true } } }
    )
    items = () => wrapper.findAll('.dialog-item').map((item) => item.element)
    input = wrapper.find('input')
  }

  const press = async (element, key, options = {}) => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options })
    )
    await nextTick()
    await nextTick()
  }

  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => wrapper.unmount())

  it('is shown when opened from the start', () => {
    mountDialog()
    expect(wrapper.findComponent(ModalDialog).vm.isDialogShown).toBe(true)
  })

  it('passes on scrolling of its content', async () => {
    mountDialog()
    await wrapper.find('v-card-text').trigger('scroll')
    expect(wrapper.findComponent(ModalDialog).emitted('scroll')).toHaveLength(1)
  })

  it('focuses the first entry when opening, or the marked element', () => {
    mountDialog()
    wrapper.findComponent(ModalDialog).vm.focusInitialElement()
    expect(document.activeElement).toBe(items()[0])

    wrapper.unmount()
    mountDialog({ withInput: true })
    wrapper.findComponent(ModalDialog).vm.focusInitialElement()
    expect(document.activeElement).toBe(input.element)
  })

  it('moves between entries with arrow keys, Home, and End', async () => {
    mountDialog()
    items()[0].focus()

    await press(items()[0], 'ArrowDown')
    expect(document.activeElement).toBe(items()[1])
    await press(items()[1].querySelector('button'), 'ArrowDown')
    expect(document.activeElement).toBe(items()[2])
    await press(items()[2], 'Home')
    expect(document.activeElement).toBe(items()[0])
    await press(items()[0], 'End')
    expect(document.activeElement).toBe(items()[2])
    await press(items()[2], 'ArrowUp')
    expect(document.activeElement).toBe(items()[1])
  })

  it('moves from a text field to the entries and back', async () => {
    mountDialog({ withInput: true })
    input.element.focus()

    await press(input.element, 'ArrowDown')
    expect(document.activeElement).toBe(items()[0])
    await press(items()[0], 'ArrowUp')
    expect(document.activeElement).toBe(input.element)
  })

  it('passes other keys with the entry index, but not keys typed into a text field', async () => {
    mountDialog({ withInput: true })

    await press(items()[1], 'g')
    await press(input.element, 'g')

    expect(dialogKeys).toEqual([['g', 1]])
  })

  it('focuses the next entry when a handled key removed the focused one', async () => {
    mountDialog()
    items()[1].focus()

    await press(items()[1], 'Delete')

    expect(items()).toHaveLength(2)
    expect(document.activeElement).toBe(items()[1])
    expect(document.activeElement.textContent).toContain('c')
  })
})
