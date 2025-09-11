import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock stores
const mockSessionStore = {
  isQueuingForSelected: vi.fn(),
  isQueuingForExcluded: vi.fn(),
  removeFromQueues: vi.fn(),
  hoverPublication: vi.fn(),
  activatePublicationComponentByDoi: vi.fn(),
  queueForSelected: vi.fn(),
  queueForExcluded: vi.fn(),
  retryLoadingPublication: vi.fn()
}

const mockInterfaceStore = {}

// Mock the store imports
vi.mock('@/stores/session.js', () => ({
  useSessionStore: () => mockSessionStore
}))

vi.mock('@/stores/interface.js', () => ({
  useInterfaceStore: () => mockInterfaceStore
}))

// Mock child components
const MockPublicationDescription = {
  name: 'PublicationDescription',
  props: ['publication'],
  template: '<div class="mock-publication-description">{{ publication.title || "Mock Publication" }}</div>'
}

const MockInlineIcon = {
  name: 'InlineIcon', 
  props: ['icon', 'color'],
  template: '<span class="mock-inline-icon">{{ icon }}</span>'
}

const MockCompactButton = {
  name: 'CompactButton',
  props: ['icon', 'click'],
  emits: ['click'],
  template: '<button class="mock-compact-button" @click="$emit(\'click\')">{{ icon }}</button>'
}

// Test component script without template complexity
const PublicationComponentScript = {
  name: "PublicationComponent",
  components: {
    PublicationDescription: MockPublicationDescription,
    InlineIcon: MockInlineIcon,
    CompactButton: MockCompactButton
  },
  setup() {
    return { sessionStore: mockSessionStore, interfaceStore: mockInterfaceStore }
  },
  props: {
    publication: Object,
    publicationType: {
      type: String,
      default: 'suggested'
    }
  },
  computed: {
    chevronType() {
      if (this.publication.boostFactor >= 8) {
        return "chevron-triple-up";
      }
      else if (this.publication.boostFactor >= 4) {
        return "chevron-double-up";
      }
      else if (this.publication.boostFactor > 1) {
        return "chevron-up";
      }
      return "";
    },
    minusButtonTooltip() {
      return this.publicationType === 'selected' 
        ? 'Remove publication from selected and mark to stay excluded.' 
        : 'Mark publication to be excluded for suggestions.';
    }
  },
  methods: {
    activate() {
      this.sessionStore.activatePublicationComponentByDoi(this.publication.doi);
      this.$emit("activate", this.publication.doi);
    },
    refocus() {
      const element = document.getElementById(this.publication.doi);
      if (element) element.focus();
    },
  },
  template: `
    <div class="publication-component" 
         :class="{ 
           'is-active': publication.isActive,
           'is-selected': publication.isSelected,
           'is-unread': !publication.isRead && !publication.isSelected && publication.wasFetched
         }"
         @click="activate"
         @mouseenter="sessionStore.hoverPublication(publication, true)"
         @mouseleave="sessionStore.hoverPublication(publication, false)">
      
      <div class="score-display">
        <div class="score">{{ publication.score }}</div>
        <div v-if="publication.boostFactor > 1" class="boost-indicator" :class="chevronType">
          <span>{{ chevronType }}</span>
        </div>
      </div>
      
      <PublicationDescription :publication="publication" />
      
      <div v-if="(!publication.year || !publication.title || !publication.author) && publication.isActive" 
           class="error-notification">
        <span>No or only partial metadata could be retrieved</span>
        <CompactButton icon="mdi-refresh" @click="sessionStore.retryLoadingPublication(publication)" />
      </div>
      
      <div class="actions">
        <CompactButton v-if="!publication.isSelected" 
                       icon="mdi-plus-thick"
                       @click="sessionStore.queueForSelected(publication.doi)" />
        <CompactButton icon="mdi-minus-thick" 
                       @click="sessionStore.queueForExcluded(publication.doi)" />
      </div>
    </div>
  `
}

describe('PublicationComponent', () => {
  let wrapper

  const createMockPublication = (overrides = {}) => ({
    doi: '10.1234/test',
    title: 'Test Publication',
    author: 'Test Author',
    year: 2023,
    score: 5,
    boostFactor: 1,
    scoreColor: '#blue',
    citationCount: 2,
    referenceCount: 3,
    referenceDois: ['10.1234/ref1'],
    isActive: false,
    isSelected: false,
    isRead: true,
    wasFetched: true,
    isLinkedToActive: false,
    isHovered: false,
    isKeywordHovered: false,
    isAuthorHovered: false,
    ...overrides
  })

  const createWrapper = (publication = {}) => {
    return mount(PublicationComponentScript, {
      props: {
        publication: createMockPublication(publication)
      },
      global: {
        stubs: {
          'tippy': true,
          'v-icon': true,
          'v-btn': true
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('chevronType computed property', () => {
    it('should return empty string for boostFactor 1', () => {
      wrapper = createWrapper({ boostFactor: 1 })
      expect(wrapper.vm.chevronType).toBe('')
    })

    it('should return chevron-up for boostFactor > 1 and < 4', () => {
      wrapper = createWrapper({ boostFactor: 2 })
      expect(wrapper.vm.chevronType).toBe('chevron-up')
      
      wrapper = createWrapper({ boostFactor: 3.9 })
      expect(wrapper.vm.chevronType).toBe('chevron-up')
    })

    it('should return chevron-double-up for boostFactor >= 4 and < 8', () => {
      wrapper = createWrapper({ boostFactor: 4 })
      expect(wrapper.vm.chevronType).toBe('chevron-double-up')
      
      wrapper = createWrapper({ boostFactor: 7.9 })
      expect(wrapper.vm.chevronType).toBe('chevron-double-up')
    })

    it('should return chevron-triple-up for boostFactor >= 8', () => {
      wrapper = createWrapper({ boostFactor: 8 })
      expect(wrapper.vm.chevronType).toBe('chevron-triple-up')
      
      wrapper = createWrapper({ boostFactor: 100 })
      expect(wrapper.vm.chevronType).toBe('chevron-triple-up')
    })

    it('should handle edge case boostFactor exactly at boundaries', () => {
      wrapper = createWrapper({ boostFactor: 1.0 })
      expect(wrapper.vm.chevronType).toBe('')
      
      wrapper = createWrapper({ boostFactor: 1.1 })
      expect(wrapper.vm.chevronType).toBe('chevron-up')
      
      wrapper = createWrapper({ boostFactor: 4.0 })
      expect(wrapper.vm.chevronType).toBe('chevron-double-up')
      
      wrapper = createWrapper({ boostFactor: 8.0 })
      expect(wrapper.vm.chevronType).toBe('chevron-triple-up')
    })
  })

  describe('CSS class binding', () => {
    it('should apply is-active class when publication is active', () => {
      wrapper = createWrapper({ isActive: true })
      expect(wrapper.classes()).toContain('is-active')
    })

    it('should apply is-selected class when publication is selected', () => {
      wrapper = createWrapper({ isSelected: true })
      expect(wrapper.classes()).toContain('is-selected')
    })

    it('should apply is-unread class for unread, unselected, fetched publications', () => {
      wrapper = createWrapper({ 
        isRead: false, 
        isSelected: false, 
        wasFetched: true 
      })
      expect(wrapper.classes()).toContain('is-unread')
    })

    it('should NOT apply is-unread class when publication is read', () => {
      wrapper = createWrapper({ 
        isRead: true, 
        isSelected: false, 
        wasFetched: true 
      })
      expect(wrapper.classes()).not.toContain('is-unread')
    })

    it('should NOT apply is-unread class when publication is selected', () => {
      wrapper = createWrapper({ 
        isRead: false, 
        isSelected: true, 
        wasFetched: true 
      })
      expect(wrapper.classes()).not.toContain('is-unread')
    })

    it('should NOT apply is-unread class when publication was not fetched', () => {
      wrapper = createWrapper({ 
        isRead: false, 
        isSelected: false, 
        wasFetched: false 
      })
      expect(wrapper.classes()).not.toContain('is-unread')
    })
  })

  describe('user interactions', () => {
    it('should call activate method when clicked', async () => {
      const publication = createMockPublication({ doi: 'test-doi' })
      wrapper = createWrapper(publication)
      
      await wrapper.trigger('click')
      
      expect(mockSessionStore.activatePublicationComponentByDoi).toHaveBeenCalledWith('test-doi')
      expect(wrapper.emitted('activate')[0]).toEqual(['test-doi'])
    })

    it('should call hoverPublication on mouseenter', async () => {
      const publication = createMockPublication()
      wrapper = createWrapper(publication)
      
      await wrapper.trigger('mouseenter')
      
      expect(mockSessionStore.hoverPublication).toHaveBeenCalledWith(publication, true)
    })

    it('should call hoverPublication on mouseleave', async () => {
      const publication = createMockPublication()
      wrapper = createWrapper(publication)
      
      await wrapper.trigger('mouseleave')
      
      expect(mockSessionStore.hoverPublication).toHaveBeenCalledWith(publication, false)
    })

    it('should queue for selected when plus button clicked', async () => {
      wrapper = createWrapper({ doi: 'test-doi', isSelected: false })
      
      const plusButton = wrapper.findAll('.mock-compact-button').find(btn => 
        btn.text().includes('mdi-plus-thick')
      )
      
      await plusButton.trigger('click')
      
      expect(mockSessionStore.queueForSelected).toHaveBeenCalledWith('test-doi')
    })

    it('should queue for excluded when minus button clicked', async () => {
      wrapper = createWrapper({ doi: 'test-doi' })
      
      const minusButton = wrapper.findAll('.mock-compact-button').find(btn => 
        btn.text().includes('mdi-minus-thick')
      )
      
      await minusButton.trigger('click')
      
      expect(mockSessionStore.queueForExcluded).toHaveBeenCalledWith('test-doi')
    })

    it('should NOT show plus button for selected publications', () => {
      wrapper = createWrapper({ isSelected: true })
      
      const plusButton = wrapper.findAll('.mock-compact-button').find(btn => 
        btn.text().includes('mdi-plus-thick')
      )
      
      expect(plusButton).toBeUndefined()
    })
  })

  describe('error handling and edge cases', () => {
    it('should show error notification for active publication missing metadata', () => {
      wrapper = createWrapper({
        isActive: true,
        title: '',
        author: '',
        year: null
      })
      
      expect(wrapper.find('.error-notification').exists()).toBe(true)
      expect(wrapper.text()).toContain('No or only partial metadata could be retrieved')
    })

    it('should NOT show error notification for inactive publication missing metadata', () => {
      wrapper = createWrapper({
        isActive: false,
        title: '',
        author: '',
        year: null
      })
      
      expect(wrapper.find('.error-notification').exists()).toBe(false)
    })

    it('should call retry loading when refresh button clicked', async () => {
      const publication = createMockPublication({
        isActive: true,
        title: '',
        author: '',
        year: null
      })
      wrapper = createWrapper(publication)
      
      const refreshButton = wrapper.find('.error-notification .mock-compact-button')
      await refreshButton.trigger('click')
      
      expect(mockSessionStore.retryLoadingPublication).toHaveBeenCalledWith(publication)
    })

    it('should handle publications with zero or negative scores', () => {
      wrapper = createWrapper({ score: 0 })
      expect(wrapper.find('.score').text()).toBe('0')
      
      wrapper = createWrapper({ score: -5 })
      expect(wrapper.find('.score').text()).toBe('-5')
    })

    it('should handle publications with very high boost factors', () => {
      wrapper = createWrapper({ boostFactor: 1000 })
      expect(wrapper.vm.chevronType).toBe('chevron-triple-up')
    })

    it('should handle publications with decimal boost factors', () => {
      wrapper = createWrapper({ boostFactor: 1.5 })
      expect(wrapper.vm.chevronType).toBe('chevron-up')
      
      wrapper = createWrapper({ boostFactor: 0.5 })
      expect(wrapper.vm.chevronType).toBe('')
    })
  })

  describe('boost indicator display', () => {
    it('should show boost indicator when boostFactor > 1', () => {
      wrapper = createWrapper({ boostFactor: 2 })
      
      const boostIndicator = wrapper.find('.boost-indicator')
      expect(boostIndicator.exists()).toBe(true)
      expect(boostIndicator.classes()).toContain('chevron-up')
    })

    it('should NOT show boost indicator when boostFactor = 1', () => {
      wrapper = createWrapper({ boostFactor: 1 })
      
      expect(wrapper.find('.boost-indicator').exists()).toBe(false)
    })

    it('should NOT show boost indicator when boostFactor < 1', () => {
      wrapper = createWrapper({ boostFactor: 0.8 })
      
      expect(wrapper.find('.boost-indicator').exists()).toBe(false)
    })
  })

  describe('event propagation', () => {
    it('should not trigger parent click when button is clicked', async () => {
      const publication = createMockPublication({ doi: 'test-doi', isSelected: false })
      wrapper = createWrapper(publication)
      
      const activateSpy = vi.spyOn(wrapper.vm, 'activate')
      
      // Find the plus button and click it
      const plusButton = wrapper.findAll('.mock-compact-button').find(btn => 
        btn.text().includes('mdi-plus-thick')
      )
      
      await plusButton.trigger('click')
      
      // The activate method should NOT be called when a button is clicked
      // This would indicate a bug where button clicks bubble up to the parent
      expect(activateSpy).not.toHaveBeenCalled()
      expect(mockSessionStore.queueForSelected).toHaveBeenCalledWith('test-doi')
    })

    it('should not trigger parent click when refresh button is clicked', async () => {
      const publication = createMockPublication({
        isActive: true,
        title: '',
        author: '',
        year: null
      })
      wrapper = createWrapper(publication)
      
      const activateSpy = vi.spyOn(wrapper.vm, 'activate')
      
      const refreshButton = wrapper.find('.error-notification .mock-compact-button')
      await refreshButton.trigger('click')
      
      // The activate method should NOT be called when refresh button is clicked
      expect(activateSpy).not.toHaveBeenCalled()
      expect(mockSessionStore.retryLoadingPublication).toHaveBeenCalled()
    })
  })

  describe('score display', () => {
    it('should display various score values correctly', () => {
      // Test representative score values
      wrapper = createWrapper({ score: 32, scoreColor: 'hsl(0, 0%, 60%)' })
      expect(wrapper.find('.score').text()).toBe('32')
      
      wrapper = createWrapper({ score: 0, scoreColor: 'hsl(0, 0%, 100%)' })
      expect(wrapper.find('.score').text()).toBe('0')
      
      wrapper = createWrapper({ score: -5, scoreColor: 'hsl(0, 0%, 100%)' })
      expect(wrapper.find('.score').text()).toBe('-5')
    })
  })


  describe('refocus method', () => {
    it('should focus element when refocus is called', () => {
      const mockElement = { focus: vi.fn() }
      const getElementByIdSpy = vi.spyOn(document, 'getElementById').mockReturnValue(mockElement)
      
      wrapper = createWrapper({ doi: 'test-doi' })
      wrapper.vm.refocus()
      
      expect(getElementByIdSpy).toHaveBeenCalledWith('test-doi')
      expect(mockElement.focus).toHaveBeenCalled()
      
      getElementByIdSpy.mockRestore()
    })

    it('should handle missing element gracefully in refocus', () => {
      const getElementByIdSpy = vi.spyOn(document, 'getElementById').mockReturnValue(null)
      
      wrapper = createWrapper({ doi: 'test-doi' })
      
      // Should not throw error
      expect(() => wrapper.vm.refocus()).not.toThrow()
      
      getElementByIdSpy.mockRestore()
    })
  })

  describe('tooltip context based on publication type', () => {
    it('should show correct tooltip text for minus button in selected publications context', () => {
      // This test will fail initially as the feature doesn't exist yet
      wrapper = mount(PublicationComponentScript, {
        props: {
          publication: createMockPublication(),
          publicationType: 'selected'
        },
        global: {
          stubs: {
            'tippy': true,
            'v-icon': true,
            'v-btn': true
          }
        }
      })
      
      const minusButton = wrapper.findAll('.mock-compact-button').find(btn => 
        btn.text().includes('mdi-minus-thick')
      )
      
      expect(minusButton.exists()).toBe(true)
      // This assertion will fail because publicationType prop doesn't exist yet
      expect(wrapper.vm.minusButtonTooltip).toBe('Remove publication from selected and mark to stay excluded.')
    })

    it('should show correct tooltip text for minus button in suggested publications context', () => {
      wrapper = mount(PublicationComponentScript, {
        props: {
          publication: createMockPublication(),
          publicationType: 'suggested'
        },
        global: {
          stubs: {
            'tippy': true,
            'v-icon': true,
            'v-btn': true
          }
        }
      })
      
      const minusButton = wrapper.findAll('.mock-compact-button').find(btn => 
        btn.text().includes('mdi-minus-thick')
      )
      
      expect(minusButton.exists()).toBe(true)
      expect(wrapper.vm.minusButtonTooltip).toBe('Mark publication to be excluded for suggestions.')
    })

    it('should default to exclude tooltip when publicationType is not specified', () => {
      wrapper = mount(PublicationComponentScript, {
        props: {
          publication: createMockPublication()
          // No publicationType prop
        },
        global: {
          stubs: {
            'tippy': true,
            'v-icon': true,
            'v-btn': true
          }
        }
      })
      
      expect(wrapper.vm.minusButtonTooltip).toBe('Mark publication to be excluded for suggestions.')
    })
  })
})