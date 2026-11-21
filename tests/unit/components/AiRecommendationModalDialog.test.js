import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import AiRecommendationModalDialog from '@/components/modal/AiRecommendationModalDialog.vue'
import { useLlmStore } from '@/stores/llm.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'

const requestAiRecommendations = vi.hoisted(() => vi.fn())

vi.mock('@/composables/useAiRecommendations.js', () => ({
  useAiRecommendations: () => ({ requestAiRecommendations })
}))

describe('AiRecommendationModalDialog', () => {
  let sessionStore
  let llmStore
  let modalStore
  let wrapper

  const findButton = (text) =>
    wrapper.findAll('button').find((button) => button.text().includes(text))

  beforeEach(() => {
    localStorage.clear()
    requestAiRecommendations.mockReset()
    const pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    llmStore = useLlmStore()
    modalStore = useModalStore()
    wrapper = mount(AiRecommendationModalDialog, {
      global: {
        plugins: [pinia],
        stubs: {
          ModalDialog: { template: '<div><slot></slot><slot name="footer"></slot></div>' },
          LlmEngineChip: true,
          'v-range-slider': {
            props: ['modelValue', 'min', 'max'],
            template: '<div class="range" :data-range="`${min}-${max}`">{{ modelValue }}</div>'
          },
          'v-text-field': {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<input class="comment" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
          }
        }
      }
    })
  })

  it('leads to the model settings as long as no model is set up', async () => {
    expect(findButton('Recommend').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Choose where the AI model should run.')

    await findButton('Choose model').trigger('click')

    expect(modalStore.isLlmSettingsModalDialogShown).toBe(true)
    expect(requestAiRecommendations).not.toHaveBeenCalled()
  })

  it('offers an expected range of papers and starts the recommendations', async () => {
    llmStore.settings.mode = 'browser'
    llmStore.modelId = 'onnx-community/gemma-4-E2B-it-ONNX'
    modalStore.isAiRecommendationModalDialogShown = true
    await nextTick()

    expect(wrapper.text()).toContain('Expected number of papers to recommend: 5–15')
    expect(wrapper.find('.range').attributes('data-range')).toBe('1-50')
    sessionStore.aiRecommendationRange = [8, 8]
    await wrapper.find('.comment').setValue(' Prefer surveys ')
    expect(wrapper.text()).toContain('Expected number of papers to recommend: 8')

    await findButton('Recommend').trigger('click')

    expect(sessionStore.aiRecommendationComment).toBe('Prefer surveys')
    expect(modalStore.isAiRecommendationModalDialogShown).toBe(false)
    expect(requestAiRecommendations).toHaveBeenCalledOnce()
  })

  it('explains auto-select and names the action accordingly', async () => {
    llmStore.settings.mode = 'browser'
    llmStore.modelId = 'onnx-community/gemma-4-E2B-it-ONNX'
    sessionStore.isAiAutoSelect = true
    await nextTick()

    expect(wrapper.text()).toContain('Expected number of papers to select: 5–15')
    expect(wrapper.text()).toContain('after each step, the suggestions are recomputed')
    expect(findButton('Auto-select')).toBeDefined()
  })
})
