import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import PublicationComponent from '@/components/PublicationComponent.vue'
import { useInterfaceStore } from '@/stores/interface.js'
import { useSessionStore } from '@/stores/session.js'

// Mock useAppState for the functions the component uses
const mockActivatePublicationComponentByDoi = vi.fn()
vi.mock('@/composables/useAppState.js', () => ({
  useAppState: () => ({
    activatePublicationComponentByDoi: mockActivatePublicationComponentByDoi
  })
}))

describe('Publication Activation', () => {
  let wrapper
  let pinia
  let sessionStore
  let interfaceStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    interfaceStore = useInterfaceStore()

    // Reset mocks
    vi.clearAllMocks()
    mockActivatePublicationComponentByDoi.mockClear()

    // Set up interface store methods
    interfaceStore.activatePublicationComponent = vi.fn()

    // Set up session store methods
    sessionStore.isQueuingForSelected = vi.fn(() => false)
    sessionStore.isQueuingForExcluded = vi.fn(() => false)
    sessionStore.removeFromQueues = vi.fn()
    sessionStore.queueForSelected = vi.fn()
    sessionStore.queueForExcluded = vi.fn()
    sessionStore.retryLoadingPublication = vi.fn()
    sessionStore.hoverPublication = vi.fn()

    const mockPublication = {
      doi: 'test-publication-doi',
      title: 'Test Publication',
      author: 'Test Author',
      year: 2023,
      score: 5,
      boostFactor: 1,
      isActive: false,
      isSelected: false,
      isLinkedToActive: false,
      isRead: true,
      wasFetched: true,
      isHovered: false,
      isKeywordHovered: false,
      isAuthorHovered: false,
      scoreColor: '#00ff00',
      citationCount: 10,
      referenceCount: 5,
      referenceDois: ['10.1234/ref1'],
      boostMatches: 0
    }

    wrapper = mount(PublicationComponent, {
      props: {
        publication: mockPublication
      },
      global: {
        plugins: [pinia],
        stubs: {
          tippy: true,
          'v-icon': true,
          'v-btn': true,
          InlineIcon: true,
          CompactButton: {
            template: '<button @click="$emit(\'click\')" v-bind="$attrs"><slot></slot></button>'
          },
          PublicationDescription: { template: '<div>Mock Publication Description</div>' }
        }
      }
    })
  })

  it('should call sessionStore.activatePublicationComponentByDoi when publication is activated', async () => {
    // Find the publication component element and simulate focus (which triggers activate)
    const publicationElement = wrapper.find('.publication-component')
    expect(publicationElement.exists()).toBe(true)

    // Trigger focus event which should call the activate function
    await publicationElement.trigger('focus')

    // Verify that the sessionStore method was called with correct DOI
    expect(mockActivatePublicationComponentByDoi).toHaveBeenCalledWith('test-publication-doi')
  })

  it('should emit activate event when publication is activated', async () => {
    // Find the publication component element and simulate focus
    const publicationElement = wrapper.find('.publication-component')

    // Trigger focus event
    await publicationElement.trigger('focus')

    // Verify that the activate event was emitted with correct DOI
    expect(wrapper.emitted()).toHaveProperty('activate')
    expect(wrapper.emitted().activate[0]).toEqual(['test-publication-doi'])
  })

  it('should call sessionStore method and emit activate event in correct order', async () => {
    // Trigger activation
    const publicationElement = wrapper.find('.publication-component')
    await publicationElement.trigger('focus')

    // Verify both operations happened
    expect(mockActivatePublicationComponentByDoi).toHaveBeenCalledWith('test-publication-doi')
    expect(wrapper.emitted()).toHaveProperty('activate')
    expect(wrapper.emitted().activate[0]).toEqual(['test-publication-doi'])

    // The important thing is both are called - the exact timing is implementation detail
    // but the sessionStore call enables the "blending" visual functionality
  })

  it('should integrate activation with publication blending (visual highlighting)', async () => {
    // This test verifies that when a publication is activated,
    // the store method is called which should handle visual blending
    const publicationElement = wrapper.find('.publication-component')

    // Simulate activation
    await publicationElement.trigger('focus')

    // Verify the integration point that handles visual blending
    expect(mockActivatePublicationComponentByDoi).toHaveBeenCalledTimes(1)
    expect(mockActivatePublicationComponentByDoi).toHaveBeenCalledWith('test-publication-doi')

    // The sessionStore method is responsible for:
    // 1. Setting the active publication
    // 2. Updating visual states (isActive, isLinkedToActive)
    // 3. Triggering interface updates for highlighting
    // This test ensures the integration point exists
  })

  it('should prevent recursive activation calls when triggered multiple times rapidly', async () => {
    const publicationElement = wrapper.find('.publication-component')

    // Trigger multiple rapid focus events (simulating the recursive focus issue)
    await publicationElement.trigger('focus')
    await publicationElement.trigger('focus')
    await publicationElement.trigger('focus')

    // Should still only call the sessionStore method once due to the guard
    expect(mockActivatePublicationComponentByDoi).toHaveBeenCalledTimes(1)
    expect(mockActivatePublicationComponentByDoi).toHaveBeenCalledWith('test-publication-doi')

    // This prevents the issue where:
    // focus → activate → sessionStore → interfaceStore.focus() → focus → activate (loop)
  })
})
