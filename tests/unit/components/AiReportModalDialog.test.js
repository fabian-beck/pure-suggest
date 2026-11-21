import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import AiReportModalDialog from '@/components/modal/AiReportModalDialog.vue'
import { useModalStore } from '@/stores/modal.js'

const REPORT = {
  isAutoSelect: true,
  text: 'The added papers all study <b>citation</b> networks.',
  publications: [
    { doi: '10.1/a', title: 'Paper A', authorShort: 'Doe et al.', year: 2021, explanation: 'Cites both seeds.' },
    { doi: '10.1/b', title: '', explanation: 'Surveys the topic.' }
  ],
  steps: 2,
  loadCount: 1,
  contextNote: '',
  failure: '',
  isCancelled: false,
  suggestionCount: 200
}

describe('AiReportModalDialog', () => {
  let pinia
  let modalStore

  const mountDialog = (report) => {
    modalStore.aiReport = report
    modalStore.isAiReportModalDialogShown = true
    return mount(AiReportModalDialog, {
      global: {
        plugins: [pinia],
        stubs: { ModalDialog: { template: '<div><slot></slot><slot name="footer"></slot></div>' } }
      }
    })
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    modalStore = useModalStore()
  })

  it('presents the report of the model with what an auto-select run did', () => {
    const wrapper = mountDialog(REPORT)

    // Text written by the model is shown as text, not interpreted as markup
    expect(wrapper.find('.report-text').text()).toBe(REPORT.text)
    expect(wrapper.text()).toContain(
      'Added 2 publications to the selection in 2 steps. More suggestions were loaded once.'
    )
    const items = wrapper.findAll('.publications li')
    expect(items[0].text()).toContain('Paper A (Doe et al., 2021)')
    expect(items[0].text()).toContain('Cites both seeds.')
    expect(items[1].text()).toContain('10.1/b')
  })

  it('reports tagged suggestions, problems, and empty results', () => {
    let wrapper = mountDialog({
      ...REPORT,
      isAutoSelect: false,
      steps: 1,
      loadCount: 0,
      contextNote: 'Only the top 50 of 200 suggestions fit.',
      failure: 'Server unavailable.',
      isCancelled: true
    })
    expect(wrapper.text()).toContain('Tagged 2 of 200 suggestions as recommended.')
    expect(wrapper.text()).toContain('Only the top 50 of 200 suggestions fit.')
    expect(wrapper.text()).toContain('The run was cancelled before it finished.')
    expect(wrapper.find('[role="alert"]').text()).toContain('Server unavailable.')

    wrapper = mountDialog({ ...REPORT, publications: [] })
    expect(wrapper.text()).toContain('No publication was added to the selection.')
    expect(wrapper.find('.publications').exists()).toBe(false)
  })

  it('closes on request', async () => {
    const wrapper = mountDialog(REPORT)

    await wrapper.find('button').trigger('click')

    expect(modalStore.isAiReportModalDialogShown).toBe(false)
  })
})
