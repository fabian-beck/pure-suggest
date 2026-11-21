import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AiRecommendationModalDialog from '@/components/modal/AiRecommendationModalDialog.vue'
import { useInterfaceStore } from '@/stores/interface.js'
import { useLlmStore } from '@/stores/llm.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'

describe('AiRecommendationModalDialog', () => {
  let sessionStore
  let llmStore
  let modalStore
  let interfaceStore
  let wrapper

  const findButton = (text) =>
    wrapper.findAll('button').find((button) => button.text().includes(text))

  beforeEach(() => {
    localStorage.clear()
    const pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    llmStore = useLlmStore()
    modalStore = useModalStore()
    interfaceStore = useInterfaceStore()
    vi.spyOn(llmStore, 'refreshModels').mockResolvedValue()
    sessionStore.suggestion = {
      totalSuggestions: 2,
      publications: [
        { doi: '10.1/a', title: 'Paper A', referenceDois: [], citationDois: [] },
        { doi: '10.1/b', title: 'Paper B', referenceDois: [], citationDois: [] }
      ]
    }
    wrapper = mount(AiRecommendationModalDialog, {
      global: {
        plugins: [pinia],
        stubs: {
          ModalDialog: { template: '<div><slot></slot></div>' },
          LlmEngineChip: true
        }
      }
    })
  })

  it('leads to the model settings as long as no model is set up', async () => {
    expect(findButton('Recommend').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Choose where the AI model should run.')

    await findButton('Choose model').trigger('click')

    expect(modalStore.isLlmSettingsModalDialogShown).toBe(true)
  })

  it('asks the chosen model and tags the recommended suggestions', async () => {
    llmStore.settings.mode = 'browser'
    llmStore.modelId = 'onnx-community/gemma-4-E2B-it-ONNX'
    sessionStore.aiRecommendationComment = 'Prefer surveys'
    modalStore.isAiRecommendationModalDialogShown = true
    vi.spyOn(llmStore, 'generate').mockResolvedValue({
      text: '{"recommendations":[{"id":2,"explanation":"It is a survey."}]}'
    })
    await flushPromises()

    await findButton('Recommend').trigger('click')
    await flushPromises()

    const [request] = llmStore.generate.mock.calls[0]
    expect(JSON.parse(request.messages[1].content).userSteeringComment).toBe('Prefer surveys')
    expect(request.signal).toBeInstanceOf(AbortSignal)
    expect(modalStore.isAiRecommendationModalDialogShown).toBe(false)
    expect(sessionStore.suggestion.publications.map((publication) => publication.isAiRecommended)).toEqual([
      false,
      'It is a survey.'
    ])
    expect(sessionStore.filter.tags).toContain('isAiRecommended')
    expect(interfaceStore.isLoading).toBe(false)
  })

  it('lets the user cancel a running request without an error message', async () => {
    llmStore.settings.mode = 'browser'
    llmStore.modelId = 'onnx-community/gemma-4-E2B-it-ONNX'
    vi.spyOn(llmStore, 'generate').mockImplementation(
      ({ signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('cancelled'), { code: 'aborted' }))
          )
        })
    )
    await flushPromises()

    await findButton('Recommend').trigger('click')
    expect(interfaceStore.isLoadingCancelable).toBe(true)
    interfaceStore.cancelLoading()
    await flushPromises()

    expect(interfaceStore.isLoading).toBe(false)
    expect(interfaceStore.errorToast.isShown).toBeFalsy()
    expect(sessionStore.filter.tags).not.toContain('isAiRecommended')
  })

  it('shows failures of the model as error message', async () => {
    llmStore.settings.mode = 'browser'
    llmStore.modelId = 'onnx-community/gemma-4-E2B-it-ONNX'
    vi.spyOn(llmStore, 'generate').mockResolvedValue({ text: 'I cannot answer that.' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await flushPromises()

    await findButton('Recommend').trigger('click')
    await flushPromises()

    expect(interfaceStore.errorToast.message).toContain('valid JSON')
  })
})
