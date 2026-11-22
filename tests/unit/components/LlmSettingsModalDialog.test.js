import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LlmSettingsModalDialog from '@/components/modal/LlmSettingsModalDialog.vue'
import { useLlmStore } from '@/stores/llm.js'

describe('LlmSettingsModalDialog', () => {
  let llmStore
  let wrapper

  const findMode = (title) =>
    wrapper.findAll('.mode').find((button) => button.text().includes(title))

  beforeEach(() => {
    localStorage.clear()
    const pinia = createPinia()
    setActivePinia(pinia)
    llmStore = useLlmStore()
    vi.spyOn(llmStore, 'refreshModels').mockResolvedValue()
    vi.spyOn(llmStore, 'detectServers').mockResolvedValue()
    wrapper = mount(LlmSettingsModalDialog, {
      global: {
        plugins: [pinia],
        stubs: {
          ModalDialog: { template: '<div><slot></slot><slot name="footer"></slot></div>' },
          LlmBrowserSettings: { template: '<div class="browser-settings"></div>' },
          LlmNativeSettings: { template: '<div class="native-settings"></div>' },
          LlmCloudSettings: { template: '<div class="cloud-settings"></div>' },
          LlmEngineChip: true,
          'v-alert': {
            template: '<div class="v-alert"><slot></slot><slot name="append"></slot></div>'
          },
          'v-expansion-panels': true
        }
      }
    })
  })

  it('offers the three ways of running models without preselecting one', () => {
    expect(wrapper.findAll('.mode').map((button) => button.text())).toEqual([
      expect.stringContaining('Local — Browser'),
      expect.stringContaining('Local — Native'),
      expect.stringContaining('Cloud')
    ])
    expect(wrapper.findAll('.mode[aria-checked="true"]')).toHaveLength(0)
    expect(findMode('Cloud').text()).toContain('data leaves this device')
  })

  it('switches the mode and loads its models', async () => {
    await findMode('Local — Browser').trigger('click')
    expect(llmStore.settings.mode).toBe('browser')
    expect(llmStore.refreshModels).toHaveBeenCalled()
    expect(wrapper.find('.browser-settings').exists()).toBe(true)

    await findMode('Local — Native').trigger('click')
    expect(llmStore.detectServers).toHaveBeenCalled()
    expect(wrapper.find('.native-settings').exists()).toBe(true)

    await findMode('Cloud').trigger('click')
    expect(wrapper.find('.cloud-settings').exists()).toBe(true)
    expect(wrapper.text()).toContain('Enter your OpenAI API key.')
  })

  it('suggests a setup for the device and applies it on request', async () => {
    llmStore.device = { hasWebGpu: true, supportsShaderF16: true, tier: 'standard' }
    await flushPromises()

    expect(wrapper.find('.v-alert').text()).toContain('Local — Browser · Gemma 4 E4B')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Use')
      .trigger('click')

    expect(llmStore.settings.mode).toBe('browser')
    expect(llmStore.modelId).toBe('onnx-community/gemma-4-E4B-it-ONNX')
    expect(wrapper.find('.v-alert').exists()).toBe(false)
  })

  it('tests the chosen model and shows its measured speed', async () => {
    llmStore.settings.mode = 'browser'
    llmStore.modelId = 'onnx-community/gemma-4-E2B-it-ONNX'
    llmStore.models = [
      {
        id: llmStore.modelId,
        name: 'Gemma 4 E2B',
        capabilities: { structuredOutput: 'none', toolCalling: false }
      }
    ]
    vi.spyOn(llmStore, 'generate').mockResolvedValue({
      text: 'A survey reviews literature.',
      tokensPerSecond: 31.26
    })
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Test'))
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('A survey reviews literature.')
    expect(wrapper.text()).toContain('31.3 tokens per second')
    expect(wrapper.text()).toContain('answers are not guaranteed to follow the requested format')
  })
})
