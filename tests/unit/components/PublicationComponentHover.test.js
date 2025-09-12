import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { createMockSessionStore, createMockInterfaceStore } from '../../helpers/testUtils.js'

import PublicationComponent from '@/components/PublicationComponent.vue'


// Simplified store mocks using testUtils
const mockQueueStore = {
  isQueuingForSelected: vi.fn(() => false),
  isQueuingForExcluded: vi.fn(() => false),
  removeFromQueues: vi.fn()
}

const mockSessionStore = createMockSessionStore()
const mockInterfaceStore = createMockInterfaceStore({
  setHoveredPublication: vi.fn(),
  hoveredPublication: null
})

const mockAppState = {
  retryLoadingPublication: vi.fn(),
  activatePublicationComponentByDoi: vi.fn(),
  queueForSelected: vi.fn(),
  queueForExcluded: vi.fn()
}

// Mock store and composable imports
vi.mock('@/stores/queue.js', () => ({ useQueueStore: () => mockQueueStore }))
vi.mock('@/stores/session.js', () => ({ useSessionStore: () => mockSessionStore }))
vi.mock('@/stores/interface.js', () => ({ useInterfaceStore: () => mockInterfaceStore }))
vi.mock('@/composables/useAppState.js', () => ({ useAppState: () => mockAppState }))

// Mock child components to avoid complex dependencies
vi.mock('@/components/PublicationDescription.vue', () => ({
  default: {
    name: 'PublicationDescription',
    props: ['publication'],
    template:
      '<div class="mock-publication-description">{{ publication.title || "Mock Publication" }}</div>'
  }
}))

// Mock other components used in the template
const MockInlineIcon = {
  name: 'InlineIcon',
  props: ['icon', 'color'],
  template: '<span class="mock-inline-icon">{{ icon }}</span>'
}

const MockCompactButton = {
  name: 'CompactButton',
  props: ['icon'],
  emits: ['click'],
  template: '<button class="mock-compact-button" @click="$emit(\'click\')">{{ icon }}</button>'
}

// Mock tippy component
const MockTippy = {
  name: 'Tippy',
  props: ['class', 'placement'],
  template: '<div class="mock-tippy"><slot /></div>'
}

// Mock vuetify components
const MockVBtn = {
  name: 'v-btn',
  template: '<button class="mock-v-btn"><slot /></button>'
}

const MockVIcon = {
  name: 'v-icon',
  props: ['left', 'size'],
  template: '<span class="mock-v-icon"><slot /></span>'
}

describe('PublicationComponent Hover Bug', () => {
  let wrapper
  let mockPublication

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    mockPublication = {
      doi: 'test-doi',
      title: 'Test Publication',
      author: 'Test Author',
      year: 2023,
      score: 5,
      boostFactor: 1,
      scoreColor: '#ffffff',
      isActive: false,
      isSelected: false,
      isLinkedToActive: false,
      isRead: true,
      wasFetched: true,
      isHovered: false,
      isKeywordHovered: false,
      isAuthorHovered: false,
      citationCount: 0,
      referenceCount: 0,
      referenceDois: []
    }
  })

  it('should call interfaceStore.setHoveredPublication on mouseenter', async () => {
    wrapper = mount(PublicationComponent, {
      props: { publication: mockPublication },
      global: {
        components: {
          InlineIcon: MockInlineIcon,
          CompactButton: MockCompactButton,
          tippy: MockTippy,
          'v-btn': MockVBtn,
          'v-icon': MockVIcon
        }
      }
    })

    const publicationDiv = wrapper.find('.publication-component')
    await publicationDiv.trigger('mouseenter')

    expect(mockInterfaceStore.setHoveredPublication).toHaveBeenCalledWith(mockPublication)
  })

  it('should call interfaceStore.setHoveredPublication on mouseleave', async () => {
    wrapper = mount(PublicationComponent, {
      props: { publication: mockPublication },
      global: {
        components: {
          InlineIcon: MockInlineIcon,
          CompactButton: MockCompactButton,
          tippy: MockTippy,
          'v-btn': MockVBtn,
          'v-icon': MockVIcon
        }
      }
    })

    const publicationDiv = wrapper.find('.publication-component')
    await publicationDiv.trigger('mouseleave')

    expect(mockInterfaceStore.setHoveredPublication).toHaveBeenCalledWith(null)
  })
})
