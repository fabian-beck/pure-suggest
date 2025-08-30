import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { onKey } from '@/Keys.js'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'

// Mock useAppState
const mockIsEmpty = { value: false }
vi.mock('@/composables/useAppState.js', () => ({
  useAppState: () => ({
    clearSession: vi.fn(),
    updateQueued: vi.fn(),
    isEmpty: mockIsEmpty
  })
}))

describe('Keys - Boost keyword functionality', () => {
  let pinia
  let sessionStore
  let interfaceStore
  let mockElement
  let mockInput

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    interfaceStore = useInterfaceStore()

    // Set up non-empty session to allow 'b' key handler to work
    sessionStore.selectedPublications = [{ doi: '10.1000/test' }]

    // Mock DOM elements
    mockInput = {
      focus: vi.fn()
    }
    mockElement = {
      getElementsByTagName: vi.fn().mockReturnValue([mockInput])
    }

    // Mock getElementsByClassName to return our mock element
    global.document = {
      activeElement: { 
        nodeName: 'BODY',
        className: '',
        blur: vi.fn()
      },
      getElementsByClassName: vi.fn().mockReturnValue([mockElement]),
      getElementsByTagName: vi.fn(),
      getElementById: vi.fn()
    }

    // Mock window.addEventListener and removeEventListener
    global.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      open: vi.fn()
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should open boost menu and focus on input when "b" key is pressed', () => {
    // Mock boost button
    const mockBoostButton = { click: vi.fn() }
    global.document.querySelector = vi.fn().mockReturnValue(mockBoostButton)

    const mockEvent = {
      key: 'b',
      preventDefault: vi.fn(),
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
      repeat: false
    }

    // Mock setTimeout to execute immediately
    vi.spyOn(global, 'setTimeout').mockImplementation((fn) => fn())

    onKey(mockEvent)

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(global.document.querySelector).toHaveBeenCalledWith('.boost-button')
    expect(mockBoostButton.click).toHaveBeenCalled()
    expect(global.document.getElementsByClassName).toHaveBeenCalledWith('boost')
    expect(mockElement.getElementsByTagName).toHaveBeenCalledWith('input')
    expect(mockInput.focus).toHaveBeenCalled()
  })

  it('should not focus boost input when session is empty', () => {
    // Set isEmpty to true
    mockIsEmpty.value = true

    const mockEvent = {
      key: 'b',
      preventDefault: vi.fn(),
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
      repeat: false
    }

    onKey(mockEvent)

    expect(mockEvent.preventDefault).not.toHaveBeenCalled()
    expect(global.document.getElementsByClassName).not.toHaveBeenCalled()
    expect(mockInput.focus).not.toHaveBeenCalled()
    
    // Reset for other tests
    mockIsEmpty.value = false
  })

  it('should handle case when boost button is not found', () => {
    // Mock querySelector to return null (boost button not found)
    global.document.querySelector = vi.fn().mockReturnValue(null)

    const mockEvent = {
      key: 'b',
      preventDefault: vi.fn(),
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
      repeat: false
    }

    // Should not throw error when boost button is not found
    expect(() => onKey(mockEvent)).not.toThrow()
    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(global.document.querySelector).toHaveBeenCalledWith('.boost-button')
  })

  it('should handle case when input element is not found within boost element', () => {
    // Mock boost button to exist
    const mockBoostButton = { click: vi.fn() }
    global.document.querySelector = vi.fn().mockReturnValue(mockBoostButton)
    
    // Mock getElementsByTagName to return empty array (input not found)
    mockElement.getElementsByTagName = vi.fn().mockReturnValue([])
    
    // Mock setTimeout to execute immediately
    vi.spyOn(global, 'setTimeout').mockImplementation((fn) => fn())

    const mockEvent = {
      key: 'b',
      preventDefault: vi.fn(),
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
      repeat: false
    }

    // Should not throw error when input element is not found
    expect(() => onKey(mockEvent)).not.toThrow()
    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockBoostButton.click).toHaveBeenCalled()
  })
})