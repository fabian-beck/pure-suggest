import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PublicationListComponent from '@/components/PublicationListComponent.vue'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'

// Mock scrollIntoView to test our fix
const mockScrollIntoView = vi.fn()

// Helper to create test publications
function createTestPublication(doi, title = '[test title]') {
  return {
    doi,
    title,
    author: ['Test Author'],
    year: 2023,
    isActive: false,
    isSelected: false,
    score: 1,
    wasFetched: true
  }
}

describe('Keyboard Navigation Scrolling Fix', () => {
  let sessionStore
  let interfaceStore
  
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStore = useSessionStore()
    interfaceStore = useInterfaceStore()
    
    // Mock scrollIntoView on Element prototype
    Element.prototype.scrollIntoView = mockScrollIntoView
    
    // Clear mock calls before each test
    mockScrollIntoView.mockClear()
  })
  
  it('should use block: "start" by default and "end" for UP navigation', async () => {
    const publications = [
      createTestPublication('10.1000/test1', 'First Publication'),
      createTestPublication('10.1000/test2', 'Second Publication'),
      createTestPublication('10.1000/test3', 'Third Publication')
    ]
    
    // Set up store with test data
    sessionStore.selectedPublications = publications
    
    const wrapper = mount(PublicationListComponent, {
      props: {
        publications,
        publicationType: 'selected'
      },
      global: {
        stubs: {
          LazyPublicationComponent: {
            template: '<li class="publication-component" :class="{ \'is-active\': publication.isActive }" :id="publication.doi">{{ publication.title }}</li>',
            props: ['publication', 'publicationType', 'isMobile']
          }
        }
      }
    })
    
    // Mock the DOM query that finds active publications
    const mockActiveElement = {
      scrollIntoView: mockScrollIntoView,
      getBoundingClientRect: vi.fn().mockReturnValue({
        top: -50,  // Partially above viewport - triggers scrolling
        bottom: 600
      })
    }
    
    // Mock getElementsByClassName to return our mock element
    const originalGetElementsByClassName = document.getElementsByClassName
    document.getElementsByClassName = vi.fn(() => [mockActiveElement])
    
    // Set window width to desktop size to trigger desktop scrolling behavior
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200
    })
    
    // Set window height for viewport calculations
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800
    })
    
    // Test default behavior (DOWN navigation or no direction)
    wrapper.vm.interfaceStore.lastNavigationDirection = 'down'
    await wrapper.vm.scrollToActivated()
    await new Promise(resolve => setTimeout(resolve, 200))
    
    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",  // DOWN navigation uses "start"
      inline: "nearest"
    })
    
    // Clear mock calls for next test
    mockScrollIntoView.mockClear()
    
    // Test UP navigation behavior
    wrapper.vm.interfaceStore.lastNavigationDirection = 'up'
    await wrapper.vm.scrollToActivated()
    await new Promise(resolve => setTimeout(resolve, 200))
    
    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "end",  // UP navigation uses "end" to prevent title cutoff
      inline: "nearest"
    })
    
    // Restore original method
    document.getElementsByClassName = originalGetElementsByClassName
  })
  
  it('should use scrollToTargetAdjusted for mobile devices', async () => {
    const publications = [
      createTestPublication('10.1000/test1', 'First Publication')
    ]
    
    sessionStore.selectedPublications = publications
    
    const wrapper = mount(PublicationListComponent, {
      props: {
        publications,
        publicationType: 'selected'
      },
      global: {
        stubs: {
          LazyPublicationComponent: {
            template: '<li class="publication-component" :class="{ \'is-active\': publication.isActive }" :id="publication.doi">{{ publication.title }}</li>',
            props: ['publication', 'publicationType', 'isMobile']
          }
        }
      }
    })
    
    // Mock mobile window width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800 // Mobile size
    })
    
    const mockActiveElement = {
      getBoundingClientRect: vi.fn().mockReturnValue({ top: 100 }),
      scrollIntoView: mockScrollIntoView
    }
    
    const originalGetElementsByClassName = document.getElementsByClassName
    document.getElementsByClassName = vi.fn(() => [mockActiveElement])
    
    // Mock window.scrollTo for mobile scrolling
    const mockScrollTo = vi.fn()
    Object.defineProperty(window, 'scrollTo', {
      writable: true,
      configurable: true,
      value: mockScrollTo
    })
    Object.defineProperty(window, 'pageYOffset', {
      writable: true,
      configurable: true,
      value: 0
    })
    
    await wrapper.vm.scrollToActivated()
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // For mobile, it should use scrollToTargetAdjusted, not scrollIntoView
    expect(mockScrollTo).toHaveBeenCalledWith({
      top: 35, // 100 (element position) - 65 (offset) = 35
      behavior: "smooth"
    })
    
    // scrollIntoView should not be called for mobile
    expect(mockScrollIntoView).not.toHaveBeenCalled()
    
    // Restore
    document.getElementsByClassName = originalGetElementsByClassName
  })
  
  it('should not scroll when publication is already fully visible', async () => {
    const publications = [
      createTestPublication('10.1000/test1', 'First Publication')
    ]
    
    sessionStore.selectedPublications = publications
    
    const wrapper = mount(PublicationListComponent, {
      props: {
        publications,
        publicationType: 'selected'
      },
      global: {
        stubs: {
          LazyPublicationComponent: {
            template: '<li class="publication-component" :class="{ \'is-active\': publication.isActive }" :id="publication.doi">{{ publication.title }}</li>',
            props: ['publication', 'publicationType', 'isMobile']
          }
        }
      }
    })
    
    // Mock the DOM query that finds active publications with fully visible element
    const mockActiveElement = {
      scrollIntoView: mockScrollIntoView,
      getBoundingClientRect: vi.fn().mockReturnValue({
        top: 100,  // Fully within viewport
        bottom: 300
      })
    }
    
    const originalGetElementsByClassName = document.getElementsByClassName
    document.getElementsByClassName = vi.fn(() => [mockActiveElement])
    
    // Set window properties for desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800
    })
    
    await wrapper.vm.scrollToActivated()
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Should not call scrollIntoView when publication is fully visible
    expect(mockScrollIntoView).not.toHaveBeenCalled()
    
    // Restore
    document.getElementsByClassName = originalGetElementsByClassName
  })
})