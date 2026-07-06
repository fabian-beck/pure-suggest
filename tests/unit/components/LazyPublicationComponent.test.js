import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import LazyPublicationComponent from '@/components/LazyPublicationComponent.vue'

const mockActivatePublicationComponentByDoi = vi.fn()

vi.mock('@/composables/useAppState.js', () => ({
  useAppState: () => ({
    activatePublicationComponentByDoi: mockActivatePublicationComponentByDoi
  })
}))

vi.mock('@/components/PublicationComponent.vue', () => ({
  default: {
    name: 'PublicationComponent',
    props: ['publication', 'publicationType'],
    emits: ['activate'],
    template:
      '<div class="publication-component" tabindex="0" :id="publication.doi" @focus="$emit(\'activate\', publication.doi)">{{ publication.title }}</div>'
  }
}))

function createPublication(overrides = {}) {
  return {
    doi: '10.1234/lazy-publication',
    title: 'Lazy Publication',
    isActive: false,
    isSelected: false,
    isLinkedToActive: false,
    ...overrides
  }
}

describe('LazyPublicationComponent', () => {
  let OriginalIntersectionObserver

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    OriginalIntersectionObserver = window.IntersectionObserver
    window.IntersectionObserver = vi.fn(function () {
      this.observe = vi.fn()
      this.unobserve = vi.fn()
      this.disconnect = vi.fn()
    })
  })

  afterEach(() => {
    window.IntersectionObserver = OriginalIntersectionObserver
    vi.useRealTimers()
  })

  it('activates through the app state path when the unloaded skeleton receives focus', async () => {
    const publication = createPublication()
    const wrapper = mount(LazyPublicationComponent, {
      props: { publication }
    })

    await wrapper.find('.publication-skeleton').trigger('focus')

    expect(mockActivatePublicationComponentByDoi).toHaveBeenCalledTimes(1)
    expect(mockActivatePublicationComponentByDoi).toHaveBeenCalledWith(publication.doi)
    expect(wrapper.emitted('activate')).toEqual([[publication.doi]])
  })

  it('activates through the app state path when the unloaded skeleton is clicked', async () => {
    const publication = createPublication()
    const wrapper = mount(LazyPublicationComponent, {
      props: { publication }
    })

    await wrapper.find('.publication-skeleton').trigger('click')

    expect(mockActivatePublicationComponentByDoi).toHaveBeenCalledTimes(1)
    expect(mockActivatePublicationComponentByDoi).toHaveBeenCalledWith(publication.doi)
    expect(wrapper.emitted('activate')).toEqual([[publication.doi]])
  })
})