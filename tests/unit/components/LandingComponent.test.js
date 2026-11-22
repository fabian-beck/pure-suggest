import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import LandingComponent from '@/components/LandingComponent.vue'

const mockOpenSearchModal = vi.fn()
vi.mock('@/composables/useModalManager.js', () => ({
  useModalManager: () => ({
    openSearchModal: mockOpenSearchModal
  })
}))

const mockLoadExample = vi.fn()
const mockImportSessionWithConfirmation = vi.fn()
const mockImportBibtexWithConfirmation = vi.fn()
const mockLoadSession = vi.fn()
vi.mock('@/composables/useAppState.js', () => ({
  useAppState: () => ({
    loadExample: mockLoadExample,
    loadSession: mockLoadSession,
    importSessionWithConfirmation: mockImportSessionWithConfirmation,
    importBibtexWithConfirmation: mockImportBibtexWithConfirmation
  })
}))

const mockLoadRecentSessions = vi.fn(() => [])
const mockRemoveRecentSession = vi.fn()
vi.mock('@/lib/RecentSessions.js', () => ({
  loadRecentSessions: () => mockLoadRecentSessions(),
  removeRecentSession: (id) => mockRemoveRecentSession(id)
}))

describe('LandingComponent', () => {
  const appMeta = {
    nameHtml: '<span>PUREsuggest</span>',
    subtitle: 'Citation-based literature search'
  }

  const createWrapper = () =>
    mount(LandingComponent, {
      global: {
        provide: { appMeta },
        directives: { tippy: {} },
        stubs: {
          'v-icon': { template: '<i class="v-icon"><slot></slot></i>' },
          'v-list': { template: '<div class="v-list"><slot></slot></div>' },
          'v-list-item': {
            template:
              '<div class="v-list-item" @click="$emit(\'click\')"><span class="title">{{ title }}</span><slot name="append"></slot></div>',
            props: ['title'],
            emits: ['click']
          },
          'v-btn': {
            template: '<button class="v-btn" @click="$emit(\'click\', $event)"><slot></slot></button>',
            emits: ['click']
          },
          'v-text-field': {
            template:
              '<input class="search-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue'],
            emits: ['update:modelValue']
          }
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title, subtitle, and start hint', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('PUREsuggest')
    expect(wrapper.text()).toContain('Citation-based literature search')
    expect(wrapper.text()).toContain('To start, add publications as seeds')
  })

  it('opens search modal with trimmed query on submit', async () => {
    const wrapper = createWrapper()
    await wrapper.find('.search-input').setValue('  visualization survey ')
    await wrapper.find('form').trigger('submit')
    expect(mockOpenSearchModal).toHaveBeenCalledWith('visualization survey')
  })

  it('opens search modal without query when input is empty', async () => {
    const wrapper = createWrapper()
    await wrapper.find('form').trigger('submit')
    expect(mockOpenSearchModal).toHaveBeenCalledWith('')
  })

  it('triggers import and example actions from buttons', async () => {
    const wrapper = createWrapper()
    const buttons = wrapper.findAll('.v-btn')
    expect(buttons).toHaveLength(3)
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')
    expect(mockImportSessionWithConfirmation).toHaveBeenCalled()
    expect(mockImportBibtexWithConfirmation).toHaveBeenCalledWith()
    expect(mockLoadExample).toHaveBeenCalled()
  })

  it('shows no recent sessions section when none are stored', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.landing-recent').exists()).toBe(false)
  })

  it('lists recent sessions and loads one on click', async () => {
    const recent = [
      { id: '1', name: 'My review', title: 'Paper A', selected: ['10.1/a'], timestamp: 0 },
      { id: '2', name: '', title: 'Paper B', selected: ['10.1/b', '10.1/c'], timestamp: 0 },
      { id: '3', name: '', boost: 'VIS, GRAPH', title: 'Paper C', selected: ['10.1/c'], timestamp: 0 }
    ]
    mockLoadRecentSessions.mockReturnValueOnce(recent)
    const wrapper = createWrapper()
    const items = wrapper.findAll('.v-list-item')
    expect(items.map((item) => item.find('.title').text())).toEqual([
      'My review',
      'Paper B',
      'VIS, GRAPH'
    ])
    await items[1].trigger('click')
    expect(mockLoadSession).toHaveBeenCalledWith(recent[1])
  })

  it('removes a recent session without loading it', async () => {
    mockLoadRecentSessions.mockReturnValueOnce([
      { id: '1', name: 'A', selected: ['10.1/a'], timestamp: 0 },
      { id: '2', name: 'B', selected: ['10.1/b'], timestamp: 0 }
    ])
    mockRemoveRecentSession.mockReturnValueOnce([
      { id: '2', name: 'B', selected: ['10.1/b'], timestamp: 0 }
    ])
    const wrapper = createWrapper()
    await wrapper.findAll('.v-list-item .v-btn')[0].trigger('click')
    expect(mockRemoveRecentSession).toHaveBeenCalledWith('1')
    expect(mockLoadSession).not.toHaveBeenCalled()
    expect(wrapper.findAll('.v-list-item .title').map((item) => item.text())).toEqual(['B'])
  })
})
