import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock IndexedDB for this test since PublicationDescription imports things that need it
global.indexedDB = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    result: {
      createObjectStore: vi.fn(() => ({})),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          add: vi.fn(() => ({})),
          get: vi.fn(() => ({})),
          getAll: vi.fn(() => ({})),
          delete: vi.fn(() => ({}))
        }))
      }))
    }
  }))
}

// Mock Cache to avoid IndexedDB issues
vi.mock('@/Cache.js', () => ({
  get: vi.fn(),
  set: vi.fn(),
  keys: vi.fn(() => Promise.resolve([])),
  clearCache: vi.fn()
}))

import PublicationComponentSearch from '@/components/PublicationComponentSearch.vue'

describe('PublicationComponentSearch', () => {
  const mockPublication = {
    doi: '10.1234/test-publication',
    title: 'Test Publication Title',
    author: 'John Doe',
    year: 2023,
    wasFetched: true
  }

  it('renders with correct structure', () => {
    const wrapper = mount(PublicationComponentSearch, {
      props: {
        publication: mockPublication,
        searchQuery: 'Test'
      },
      global: {
        stubs: {
          'PublicationDescription': true,
          'CompactButton': true
        }
      }
    })

    expect(wrapper.find('.publication-component').exists()).toBe(true)
    expect(wrapper.find('.media-content').exists()).toBe(true)
    expect(wrapper.find('.media-right').exists()).toBe(true)
  })

  it('passes correct props to PublicationDescription', () => {
    const wrapper = mount(PublicationComponentSearch, {
      props: {
        publication: mockPublication,
        searchQuery: 'Test Query'
      },
      global: {
        stubs: {
          'PublicationDescription': true,
          'CompactButton': true
        }
      }
    })

    const description = wrapper.getComponent({ name: 'PublicationDescription' })
    expect(description.props('publication')).toEqual(mockPublication)
    expect(description.props('highlighted')).toBe('Test Query')
    expect(description.props('alwaysShowDetails')).toBe(true)
  })

  it('has loaded data property', () => {
    const wrapper = mount(PublicationComponentSearch, {
      props: {
        publication: mockPublication,
        searchQuery: 'Test'
      },
      global: {
        stubs: {
          'PublicationDescription': true,
          'CompactButton': true
        }
      }
    })

    expect(wrapper.vm.loaded).toBe(false)
  })
})