import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import AiActivityPanel from '@/components/llm/AiActivityPanel.vue'
import AiRunLog from '@/components/llm/AiRunLog.vue'
import { useInterfaceStore } from '@/stores/interface.js'

const RUN = {
  isAutoSelect: true,
  range: [4, 7],
  publications: [{ doi: '10.1/a' }],
  log: [
    {
      considered: 'Reading 100 suggestions and 2 selected publications',
      thinking: '',
      reasoning: 'I look for papers linking both seeds.',
      picks: [{ doi: '10.1/a', title: 'Paper A', authorShort: 'Doe et al.', year: 2021, explanation: 'Cites both.' }],
      action: 'Adding 1 publication to the selection, then recomputing the suggestions'
    },
    {
      considered: 'Reading 104 suggestions and 3 selected publications',
      thinking: 'The user wants surveys…',
      reasoning: 'Now surveys',
      picks: [],
      action: ''
    }
  ]
}

describe('AiActivityPanel', () => {
  let interfaceStore
  let wrapper

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    interfaceStore = useInterfaceStore()
    interfaceStore.aiRun = structuredClone(RUN)
    interfaceStore.startLoading()
    interfaceStore.loadingMessage = 'Gemma (on this device) is answering...'
    wrapper = mount(AiActivityPanel, {
      global: {
        plugins: [pinia],
        components: { AiRunLog },
        stubs: { LlmEngineChip: true, 'v-progress-linear': true, 'v-progress-circular': true }
      }
    })
  })

  it('states that the AI model controls the selection and how far it got', () => {
    expect(wrapper.text()).toContain('AI at work')
    expect(wrapper.text()).toContain(
      'The AI model is in control: it adds publications to your selection (4–7 expected, 1 so far)'
    )
    expect(wrapper.find('[role="status"]').text()).toBe('Gemma (on this device) is answering...')
  })

  it('shows reasoning, choices, and actions of each step, and the step in progress', () => {
    const steps = wrapper.findAll('.step')

    expect(steps[0].text()).toContain('Step 1')
    expect(steps[0].text()).toContain('Reading 100 suggestions and 2 selected publications')
    expect(steps[0].text()).toContain('I look for papers linking both seeds.')
    expect(steps[0].text()).toContain('Paper A (Doe et al., 2021)')
    expect(steps[0].text()).toContain('Cites both.')
    expect(steps[0].text()).toContain('Adding 1 publication to the selection')
    expect(steps[1].text()).toContain('The user wants surveys…')
    expect(steps[1].text()).toContain('Now surveys')
    expect(steps[1].text()).toContain('Working on this step…')
  })

  it('describes a tagging run as leaving the selection untouched', async () => {
    interfaceStore.aiRun = { ...structuredClone(RUN), isAutoSelect: false }
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('your selection stays as it is')
  })

  it('stops the AI model on request, once that is possible', async () => {
    const stopButton = wrapper.find('button')
    expect(stopButton.attributes('disabled')).toBeDefined()

    interfaceStore.setLoadingCancelable(true)
    await wrapper.vm.$nextTick()
    await stopButton.trigger('click')

    expect(interfaceStore.loadingCancelToken.isCancelled).toBe(true)
  })
})
