import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import SeedBar from '@/components/SeedBar.vue'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'

const mockQueueForExcluded = vi.fn()
const mockUpdateQueued = vi.fn()
const mockActivate = vi.fn()
vi.mock('@/composables/useAppState.js', () => ({
  useAppState: () => ({
    activatePublicationComponentByDoi: mockActivate,
    queueForExcluded: mockQueueForExcluded,
    updateQueued: mockUpdateQueued
  })
}))

const mockOpenSearchModal = vi.fn()
const mockOpenAuthorModal = vi.fn()
const mockOpenQueueModal = vi.fn()
vi.mock('@/composables/useModalManager.js', () => ({
  useModalManager: () => ({
    openSearchModal: mockOpenSearchModal,
    openAuthorModal: mockOpenAuthorModal,
    openQueueModal: mockOpenQueueModal
  })
}))

const stubs = {
  'v-icon': { template: '<i><slot /></i>' },
  'v-spacer': { template: '<span />' },
  'v-btn': {
    template: '<button class="v-btn" @click="$emit(\'click\')"><slot /></button>',
    emits: ['click']
  },
  'v-chip': {
    template:
      '<div class="seed-chip" @click="$emit(\'click\', $event)"><slot /><button class="chip-close" @click.stop="$emit(\'click:close\')" /></div>',
    emits: ['click', 'click:close']
  },
  CompactButton: {
    template: '<button class="compact-button" @click="$emit(\'click\')"><slot /></button>',
    emits: ['click']
  },
  InlineIcon: { template: '<i class="inline-icon" />' }
}

function makePublication(doi, title, year) {
  return { doi, title, year, authorShort: title, isActive: false }
}

describe('SeedBar', () => {
  let pinia
  let sessionStore
  let queueStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    queueStore = useQueueStore()
    vi.clearAllMocks()
    sessionStore.selectedPublications = []
    queueStore.selectedQueue = []
    queueStore.excludedQueue = []
  })

  function mountSeedBar() {
    return mount(SeedBar, { global: { plugins: [pinia], stubs } })
  }

  it('renders a chip per selected publication with the count', () => {
    sessionStore.selectedPublications = [
      makePublication('10.1/a', 'Paper A', 2020),
      makePublication('10.1/b', 'Paper B', 2021)
    ]

    const wrapper = mountSeedBar()

    expect(wrapper.text()).toContain('Seeds')
    expect(wrapper.findAll('.seed-chip')).toHaveLength(2)
  })

  it('queues a publication for exclusion when its chip close is clicked', async () => {
    sessionStore.selectedPublications = [makePublication('10.1/a', 'Paper A', 2020)]
    const wrapper = mountSeedBar()

    await wrapper.find('.chip-close').trigger('click')

    expect(mockQueueForExcluded).toHaveBeenCalledWith('10.1/a')
  })

  it('shows the Update action only when the queue is updatable', async () => {
    const wrapper = mountSeedBar()
    expect(wrapper.text()).not.toContain('Update')

    queueStore.selectedQueue = ['10.1/c']
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Update')
  })

  it('opens the search modal when Add is clicked', async () => {
    const wrapper = mountSeedBar()
    const addButton = wrapper.findAll('.v-btn').at(-1)

    await addButton.trigger('click')

    expect(mockOpenSearchModal).toHaveBeenCalled()
  })
})
