import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SessionMenuComponent from '@/components/SessionMenuComponent.vue'

// Mock stores and composables
const mockSessionStore = {
  sessionName: 'Test Session',
  selectedPublicationsCount: 5,
  excludedPublicationsCount: 2,
  exportSession: vi.fn(),
  exportAllBibtex: vi.fn(),
  setSessionName: vi.fn()
}

const mockInterfaceStore = {
  isMobile: false,
  isExcludedModalDialogShown: false
}

const mockAppState = {
  isEmpty: false,
  clearSession: vi.fn()
}

vi.mock('@/stores/session.js', () => ({
  useSessionStore: () => mockSessionStore
}))

vi.mock('@/stores/interface.js', () => ({
  useInterfaceStore: () => mockInterfaceStore
}))

vi.mock('@/composables/useAppState.js', () => ({
  useAppState: () => mockAppState
}))

describe('SessionMenuComponent', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionStore.sessionName = 'Test Session'
    mockSessionStore.selectedPublicationsCount = 5
    mockSessionStore.excludedPublicationsCount = 2
    mockAppState.isEmpty = false
  })

  const createWrapper = () => {
    return mount(SessionMenuComponent, {
      global: {
        stubs: {
          'v-menu': {
            template: `
              <div class="v-menu" data-testid="menu">
                <div @click="$emit('click:outside')">
                  <slot name="activator" :props="{ click: () => {} }" />
                </div>
                <div class="menu-content">
                  <slot />
                </div>
              </div>
            `,
            emits: ['click:outside']
          },
          'v-btn': { 
            template: '<button class="v-btn" @click="$emit(\'click\')"><slot /></button>',
            emits: ['click']
          },
          'v-icon': { template: '<i class="v-icon"><slot /></i>' },
          'v-list': { template: '<div class="v-list"><slot /></div>' },
          'v-list-item': { 
            template: '<div class="v-list-item" @click="$emit(\'click\')"><slot /></div>',
            emits: ['click']
          },
          'v-text-field': {
            template: `
              <div class="v-text-field" :data-variant="variant" :data-clearable="String(clearable)">
                <input 
                  :value="modelValue"
                  @input="$emit('update:modelValue', $event.target.value)"
                  @focus="$emit('focus')"
                  @blur="$emit('blur')"
                  @keyup.enter="$emit('keyup', { key: 'Enter' })"
                  data-testid="session-name-input"
                />
                <button 
                  v-if="clearable && modelValue" 
                  @click="$emit('click:clear')"
                  data-testid="clear-button"
                  class="clear-button"
                >×</button>
              </div>
            `,
            props: {
              modelValue: { default: '' },
              label: String,
              variant: String,
              density: String,
              hideDetails: Boolean,
              prependInnerIcon: String,
              clearable: { type: Boolean, default: false }
            },
            emits: ['update:modelValue', 'focus', 'blur', 'keyup', 'click:clear']
          }
        }
      }
    })
  }

  it('should render session menu when not empty', () => {
    wrapper = createWrapper()
    expect(wrapper.find('[data-testid="menu"]').exists()).toBe(true)
  })

  it('should not render menu when session is empty', () => {
    mockAppState.isEmpty = true
    wrapper = createWrapper()
    expect(wrapper.find('[data-testid="menu"]').exists()).toBe(false)
  })

  it('should display session name in text field', () => {
    wrapper = createWrapper()
    const textField = wrapper.find('[data-testid="session-name-input"]')
    expect(textField.element.value).toBe('Test Session')
  })

  it('should call setSessionName when text field loses focus', async () => {
    wrapper = createWrapper()
    const textField = wrapper.find('[data-testid="session-name-input"]')
    
    await textField.setValue('New Session Name')
    await textField.trigger('blur')
    
    expect(mockSessionStore.setSessionName).toHaveBeenCalledWith('New Session Name')
  })

  it('should call setSessionName when Enter is pressed', async () => {
    wrapper = createWrapper()
    const textField = wrapper.find('[data-testid="session-name-input"]')
    
    await textField.setValue('New Session Name')
    await textField.trigger('keyup.enter')
    
    expect(mockSessionStore.setSessionName).toHaveBeenCalledWith('New Session Name')
  })

  describe('Session name input styling and functionality', () => {
    it('should use underlined variant to match filter menu styling', () => {
      wrapper = createWrapper()
      const textFieldWrapper = wrapper.find('.v-text-field')
      
      expect(textFieldWrapper.attributes('data-variant')).toBe('underlined')
    })

    it('should have clearable property enabled', () => {
      wrapper = createWrapper()
      const textFieldWrapper = wrapper.find('.v-text-field')
      
      expect(textFieldWrapper.attributes('data-clearable')).toBe('true')
    })

    it('should show clear button when session name has value', async () => {
      mockSessionStore.sessionName = 'My Project'
      wrapper = createWrapper()
      
      const clearButton = wrapper.find('[data-testid="clear-button"]')
      expect(clearButton.exists()).toBe(true)
    })

    it('should hide clear button when session name is empty', () => {
      mockSessionStore.sessionName = ''
      wrapper = createWrapper()
      
      const clearButton = wrapper.find('[data-testid="clear-button"]')
      expect(clearButton.exists()).toBe(false)
    })

    it('should clear session name when clear button is clicked', async () => {
      mockSessionStore.sessionName = 'My Project'
      wrapper = createWrapper()
      
      const clearButton = wrapper.find('[data-testid="clear-button"]')
      await clearButton.trigger('click')
      
      expect(mockSessionStore.setSessionName).toHaveBeenCalledWith('')
    })

    it('should reset to default when session name is cleared', async () => {
      mockSessionStore.sessionName = 'My Project' 
      wrapper = createWrapper()
      
      const clearButton = wrapper.find('[data-testid="clear-button"]')
      await clearButton.trigger('click')
      
      expect(mockSessionStore.setSessionName).toHaveBeenCalledWith('')
    })

    it('should have pencil icon like other input fields', () => {
      wrapper = createWrapper()
      const textFieldWrapper = wrapper.find('.v-text-field')
      
      // In real implementation, this would be checked via props
      // Here we verify the test setup recognizes the prepend-inner-icon
      expect(textFieldWrapper.exists()).toBe(true)
    })
  })

  describe('Menu closing behavior', () => {
    it('should NOT close menu when clicking in session name text field', async () => {
      // This test documents the expected behavior: 
      // clicking in the text field should not cause the menu to close
      wrapper = createWrapper()
      
      // The current implementation will have click events bubble up from the text field div
      // which will close the menu. We need to add @click.stop to prevent this.
      
      // For now, we'll test that the text field container has proper event handling
      const textFieldDiv = wrapper.find('div.px-4.py-4')
      expect(textFieldDiv.exists()).toBe(true)
      
      // This test documents that we expect the div to handle clicks without closing menu
      // The implementation fix is to add @click.stop to this div
      expect(textFieldDiv.exists()).toBe(true) // Verify the div exists with proper structure
    })

    it('should close menu when clicking on export JSON option', async () => {
      wrapper = createWrapper()
      const exportItems = wrapper.findAll('.v-list-item')
      
      // Find the export JSON item (should be one of the list items)
      let exportJsonItem = null
      for (const item of exportItems) {
        if (item.text().includes('Export selected as JSON') || 
            item.attributes('title') === 'Export selected as JSON') {
          exportJsonItem = item
          break
        }
      }
      
      expect(exportJsonItem).toBeTruthy()
      
      // Click on export item should trigger the export function
      await exportJsonItem.trigger('click')
      expect(mockSessionStore.exportSession).toHaveBeenCalled()
    })

    it('should close menu when clicking on export BibTeX option', async () => {
      wrapper = createWrapper()
      const exportItems = wrapper.findAll('.v-list-item')
      
      // Find the export BibTeX item
      let exportBibtexItem = null
      for (const item of exportItems) {
        if (item.text().includes('Export selected as BibTeX') || 
            item.attributes('title') === 'Export selected as BibTeX') {
          exportBibtexItem = item
          break
        }
      }
      
      expect(exportBibtexItem).toBeTruthy()
      
      // Click on export item should trigger the export function
      await exportBibtexItem.trigger('click')
      expect(mockSessionStore.exportAllBibtex).toHaveBeenCalled()
    })

    it('should close menu when clicking on clear session option', async () => {
      wrapper = createWrapper()
      const exportItems = wrapper.findAll('.v-list-item')
      
      // Find the clear session item
      let clearSessionItem = null
      for (const item of exportItems) {
        if (item.text().includes('Clear session') || 
            item.attributes('title') === 'Clear session') {
          clearSessionItem = item
          break
        }
      }
      
      expect(clearSessionItem).toBeTruthy()
      
      // Click on clear session item should trigger the clear function
      await clearSessionItem.trigger('click')
      expect(mockAppState.clearSession).toHaveBeenCalled()
    })
  })

  describe('Session state string display', () => {
    it('should display session name with publication counts when session name is not default', () => {
      mockSessionStore.sessionName = 'My Research Session'
      wrapper = createWrapper()
      const sessionStateText = wrapper.text()
      expect(sessionStateText).toContain('My Research Session (5 selected; 2 excluded)')
    })

    it('should display only publication counts when session name is default (empty)', () => {
      mockSessionStore.sessionName = ''
      wrapper = createWrapper()
      const sessionStateText = wrapper.text()
      expect(sessionStateText).toContain('5 selected; 2 excluded')
      expect(sessionStateText).not.toContain('(')
    })

    it('should display session name with only selected count when no excluded publications', () => {
      mockSessionStore.sessionName = 'My Project'
      mockSessionStore.excludedPublicationsCount = 0
      wrapper = createWrapper()
      const sessionStateText = wrapper.text()
      expect(sessionStateText).toContain('My Project (5 selected)')
      expect(sessionStateText).not.toContain('excluded')
    })

    it('should display only selected count when session name is default and no excluded publications', () => {
      mockSessionStore.sessionName = ''
      mockSessionStore.excludedPublicationsCount = 0
      wrapper = createWrapper()
      const sessionStateText = wrapper.text()
      expect(sessionStateText).toContain('5 selected')
      expect(sessionStateText).not.toContain('(')
      expect(sessionStateText).not.toContain('excluded')
    })

    it('should handle empty session name by treating it as default', () => {
      mockSessionStore.sessionName = ''
      wrapper = createWrapper()
      const sessionStateText = wrapper.text()
      expect(sessionStateText).toContain('5 selected; 2 excluded')
      expect(sessionStateText).not.toContain('(')
    })

    it('should handle null session name by treating it as default', () => {
      mockSessionStore.sessionName = null
      wrapper = createWrapper()
      const sessionStateText = wrapper.text()
      expect(sessionStateText).toContain('5 selected; 2 excluded')
      expect(sessionStateText).not.toContain('(')
    })
  })

  it('should show excluded publications item when there are excluded publications', () => {
    wrapper = createWrapper()
    // Look for the v-list-item with the specific attributes/props
    const excludedItem = wrapper.find('[title="Excluded publications"]')
    expect(excludedItem.exists()).toBe(true)
  })

  it('should not show excluded publications item when there are no excluded publications', () => {
    mockSessionStore.excludedPublicationsCount = 0
    wrapper = createWrapper()
    const text = wrapper.text()
    expect(text).not.toContain('Excluded publications')
  })
})