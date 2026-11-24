import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import AiChatModalDialog from '@/components/modal/AiChatModalDialog.vue'
import { useLlmStore } from '@/stores/llm.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'

const chat = vi.hoisted(() => ({
  sendChatMessage: vi.fn(),
  stopAnswer: vi.fn(),
  undoActions: vi.fn()
}))

vi.mock('@/composables/useAiChat.js', () => ({ useAiChat: () => chat }))

describe('AiChatModalDialog', () => {
  let sessionStore
  let llmStore
  let modalStore
  let wrapper

  const findButton = (text) =>
    wrapper.findAll('button').find((button) => button.text().includes(text))

  beforeEach(() => {
    localStorage.clear()
    Object.values(chat).forEach((mock) => mock.mockReset())
    const pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    llmStore = useLlmStore()
    modalStore = useModalStore()
    vi.spyOn(llmStore, 'warmUp').mockResolvedValue()
    llmStore.settings.mode = 'browser'
    llmStore.modelId = 'onnx-community/gemma-4-E2B-it-ONNX'
    wrapper = mount(AiChatModalDialog, {
      global: {
        plugins: [pinia],
        stubs: {
          ModalDialog: {
            template:
              '<div><slot name="header-menu"></slot><slot></slot><slot name="footer"></slot></div>'
          },
          LlmEngineChip: true,
          CompactButton: {
            props: ['disabled'],
            template: '<button class="clear" :disabled="disabled"></button>'
          },
          'v-chip': { template: '<button class="example"><slot></slot></button>' },
          'v-progress-circular': true,
          'v-textarea': {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<div><textarea class="draft" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea><slot name="append-inner"></slot></div>'
          }
        }
      }
    })
  })

  it('introduces the chat and sends an example question on click', async () => {
    expect(wrapper.text()).toContain('can set keywords and filters for you')

    await wrapper.find('.example').trigger('click')

    expect(chat.sendChatMessage).toHaveBeenCalledWith(
      'What are the main themes of my selected publications?'
    )
  })

  it('sends the typed message on Enter and empties the input', async () => {
    const input = wrapper.find('.draft')
    await input.setValue('  Which papers are surveys? ')
    await input.trigger('keydown', { key: 'Enter' })

    expect(chat.sendChatMessage).toHaveBeenCalledExactlyOnceWith('Which papers are surveys?')
    expect(input.element.value).toBe('')
  })

  it('keeps Shift+Enter for line breaks, which are sent along', async () => {
    const input = wrapper.find('.draft')
    await input.setValue('Compare these two:\nTimeline Trees')
    const shiftEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      cancelable: true
    })
    input.element.dispatchEvent(shiftEnter)

    expect(shiftEnter.defaultPrevented).toBe(false)
    expect(chat.sendChatMessage).not.toHaveBeenCalled()

    await input.trigger('keydown', { key: 'Enter' })
    expect(chat.sendChatMessage).toHaveBeenCalledWith('Compare these two:\nTimeline Trees')
  })

  it('shows the conversation with the changes the model made, which can be undone', async () => {
    sessionStore.aiChatMessages = [
      { role: 'user', text: 'Only surveys, please.' },
      {
        role: 'assistant',
        text: 'I filtered for <b>surveys</b>.',
        papers: [
          {
            doi: '10.1/a',
            title: 'Paper A',
            authorShort: 'Doe et al.',
            year: 2021,
            explanation: 'A survey.'
          }
        ],
        actions: [
          { type: 'setFilterTags', value: 'isSurvey', label: 'Filter set: literature survey' }
        ],
        undo: { boostKeywordString: '', filter: {} }
      }
    ]
    await nextTick()

    const [question, answer] = wrapper.findAll('.message')
    expect(question.classes()).toContain('is-user')
    expect(question.text()).toBe('Only surveys, please.')
    // Text written by the model is shown as text, not interpreted as markup
    expect(answer.find('.text').text()).toBe('I filtered for <b>surveys</b>.')
    expect(answer.find('.action').text()).toContain('Filter set: literature survey')
    expect(answer.find('.marked').text()).toContain('Marked 1 publication as AI recommended')
    expect(answer.find('.marked').text()).toContain('Paper A (Doe et al., 2021)')
    expect(answer.find('.marked').text()).toContain('A survey.')

    await findButton('Undo changes').trigger('click')
    expect(chat.undoActions).toHaveBeenCalledWith(sessionStore.aiChatMessages[1])

    await wrapper.find('.clear').trigger('click')
    expect(sessionStore.aiChatMessages).toEqual([])
  })

  it('turns links in answers into links that open in a new tab', async () => {
    sessionStore.aiChatMessages = [
      {
        role: 'assistant',
        text: 'Burch et al. (2008). Timeline Trees. https://doi.org/10.1145/1385569.1385584.',
        papers: [],
        actions: []
      }
    ]
    await nextTick()

    const link = wrapper.find('.message .text a')
    expect(link.attributes()).toMatchObject({
      href: 'https://doi.org/10.1145/1385569.1385584',
      target: '_blank',
      rel: 'noopener'
    })
    expect(wrapper.find('.message .text').text()).toBe(
      'Burch et al. (2008). Timeline Trees. https://doi.org/10.1145/1385569.1385584.'
    )
  })

  it('lets the user stop an answer that is being written, without sending in between', async () => {
    sessionStore.aiChatMessages = [
      { role: 'user', text: 'Hi' },
      { role: 'assistant', text: '', papers: [], actions: [], isWriting: true }
    ]
    await nextTick()

    expect(wrapper.text()).toContain('Reading your session…')
    expect(wrapper.find('.clear').attributes('disabled')).toBeDefined()
    await wrapper.find('.draft').setValue('Another question')
    await wrapper.find('.draft').trigger('keydown', { key: 'Enter' })
    expect(chat.sendChatMessage).not.toHaveBeenCalled()

    await findButton('Stop').trigger('click')
    expect(chat.stopAnswer).toHaveBeenCalled()
  })

  it('leads to the model settings as long as no model is set up', async () => {
    llmStore.settings.mode = null
    await nextTick()

    expect(wrapper.find('.draft').exists()).toBe(false)
    expect(wrapper.text()).toContain('Choose where the AI model should run.')
    await findButton('Choose model').trigger('click')

    expect(modalStore.isLlmSettingsModalDialogShown).toBe(true)
  })

  it('puts a downloaded browser model back into memory when the chat opens', async () => {
    modalStore.isAiChatModalDialogShown = true
    await nextTick()

    expect(llmStore.warmUp).toHaveBeenCalledOnce()
  })
})
