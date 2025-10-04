import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSessionStore, createMockInterfaceStore } from '../../helpers/testUtils.js'

import SessionMenuComponent from '@/components/SessionMenuComponent.vue'


// Simplified mock stores using testUtils
const mockSessionStore = createMockSessionStore({
  sessionName: 'Test Session',
  selectedPublicationsCount: 5,
  excludedPublicationsCount: 2,
  exportSession: vi.fn(),
  exportAllBibtex: vi.fn(),
  setSessionName: vi.fn()
})

const mockInterfaceStore = createMockInterfaceStore({
  isMobile: false,
  isExcludedModalDialogShown: false
})

const mockModalManager = {
  showConfirmDialog: vi.fn(),
  openShareSessionModal: vi.fn()
}

const mockAppState = {
  isEmpty: false,
  clearSession: vi.fn(),
  importSessionWithConfirmation: vi.fn(),
  loadSession: vi.fn()
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

vi.mock('@/composables/useModalManager.js', () => ({
  useModalManager: () => mockModalManager
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

  it('should render session menu with session name', () => {
    wrapper = createWrapper()
    expect(wrapper.find('[data-testid="menu"]').exists()).toBe(true)

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

  describe('Session name input functionality', () => {
    it('should handle clear button visibility and functionality', async () => {
      mockSessionStore.sessionName = 'My Project'
      wrapper = createWrapper()
      expect(wrapper.find('[data-testid="clear-button"]').exists()).toBe(true)

      const clearButton = wrapper.find('[data-testid="clear-button"]')
      await clearButton.trigger('click')
      expect(mockSessionStore.setSessionName).toHaveBeenCalledWith('')

      mockSessionStore.sessionName = ''
      wrapper = createWrapper()
      expect(wrapper.find('[data-testid="clear-button"]').exists()).toBe(false)
    })
  })

  describe('Menu actions', () => {
    it('should trigger export and clear actions', async () => {
      wrapper = createWrapper()
      const menuItems = wrapper.findAll('.v-list-item')

      const exportJsonItem = menuItems.find(item =>
        item.attributes('title')?.includes('Export') && !item.attributes('title')?.includes('BibTeX')
      )
      await exportJsonItem.trigger('click')
      expect(mockSessionStore.exportSession).toHaveBeenCalled()

      const exportBibtexItem = menuItems.find(item =>
        item.attributes('title')?.includes('BibTeX') && item.attributes('title')?.includes('Export')
      )
      await exportBibtexItem.trigger('click')
      expect(mockSessionStore.exportAllBibtex).toHaveBeenCalled()

      const clearSessionItem = menuItems.find(item =>
        item.text().includes('Clear session') || item.attributes('title') === 'Clear session'
      )
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

    it('should display only publication counts when session name is empty', () => {
      mockSessionStore.sessionName = ''
      wrapper = createWrapper()
      const sessionStateText = wrapper.text()
      expect(sessionStateText).toContain('5 selected; 2 excluded')
      expect(sessionStateText).not.toContain('(')
    })

    it('should display session name without excluded count when no excluded publications', () => {
      mockSessionStore.sessionName = 'My Project'
      mockSessionStore.excludedPublicationsCount = 0
      wrapper = createWrapper()
      const sessionStateText = wrapper.text()
      expect(sessionStateText).toContain('My Project (5 selected)')
      expect(sessionStateText).not.toContain('excluded')
    })
  })

  it('should conditionally show excluded publications item', () => {
    wrapper = createWrapper()
    expect(wrapper.find('[title="Excluded publications"]').exists()).toBe(true)

    mockSessionStore.excludedPublicationsCount = 0
    wrapper = createWrapper()
    expect(wrapper.text()).not.toContain('Excluded publications')
  })

  describe('Import session functionality', () => {
    it('should show import session menu item and trigger import action', async () => {
      wrapper = createWrapper()
      const importItem = wrapper
        .findAll('.v-list-item')
        .find(item =>
          item.attributes('title')?.includes('Import') &&
          item.attributes('title')?.includes('session')
        )

      expect(importItem).toBeTruthy()
      await importItem.trigger('click')
      expect(mockAppState.importSessionWithConfirmation).toHaveBeenCalled()
    })
  })

  describe('Share session functionality', () => {
    it('should open share session modal when clicking share session menu item', async () => {
      wrapper = createWrapper()
      const shareItem = wrapper
        .findAll('.v-list-item')
        .find(item => item.attributes('title') === 'Share session as link')

      expect(shareItem).toBeTruthy()
      await shareItem.trigger('click')
      expect(mockModalManager.openShareSessionModal).toHaveBeenCalled()
    })
  })
})
