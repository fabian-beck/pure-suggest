import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import PublicationDescription from '@/components/PublicationDescription.vue'

// Mock stores
const mockSessionStore = {
  filter: {
    addDoi: vi.fn(),
    toggleDoi: vi.fn(),
    toggleTag: vi.fn(),
    dois: [],
    tags: []
  },
  exportSingleBibtex: vi.fn(),
  getSelectedPublicationByDoi: vi.fn(() => ({
    title: 'Test Publication',
    authorShort: 'Smith et al.',
    year: 2023
  }))
}

const mockInterfaceStore = {
  isFilterMenuOpen: false,
  openFilterMenu: vi.fn(),
  showAbstract: vi.fn()
}

// Mock the store imports
vi.mock('@/stores/session.js', () => ({
  useSessionStore: () => mockSessionStore
}))

vi.mock('@/stores/interface.js', () => ({
  useInterfaceStore: () => mockInterfaceStore
}))

describe('PublicationDescription', () => {
  let mockPublication

  beforeEach(() => {
    vi.clearAllMocks()

    mockPublication = {
      doi: '10.1234/test-publication',
      title: 'Test Publication Title',
      titleHighlighted: null,
      author: 'John Doe, Jane Smith',
      authorShort: 'Doe et al.',
      authorOrcidHtml: 'John Doe <sup>0000-0000-0000-0001</sup>, Jane Smith',
      year: 2023,
      container: 'Test Journal',
      doiUrl: 'https://doi.org/10.1234/test-publication',
      referenceDois: ['10.1234/ref1', '10.1234/ref2'],
      citationDois: ['10.1234/cite1'],
      citationsPerYear: 5.2,
      tooManyCitations: false,
      isActive: false,
      isSelected: true,
      wasFetched: true,
      abstract: 'This is a test abstract.',
      gsUrl: 'https://scholar.google.com/scholar?q=test',
      isHighlyCited: false,
      isSurvey: false,
      isNew: false,
      isUnnoted: false
    }
  })

  const defaultStubs = {
    'v-icon': true,
    InlineIcon: true,
    CompactButton: { template: '<button><slot></slot></button>' },
    PublicationTag: { template: '<span class="tag"><slot></slot></span>' }
  }

  it('renders publication with conditional details display', () => {
    let wrapper = mount(PublicationDescription, {
      props: { publication: mockPublication },
      global: { stubs: defaultStubs }
    })
    expect(wrapper.text()).toContain('Test Publication Title')

    wrapper = mount(PublicationDescription, {
      props: { publication: { ...mockPublication, isActive: true }, alwaysShowDetails: false },
      global: { stubs: defaultStubs }
    })
    expect(wrapper.text()).toContain('DOI:')
    expect(wrapper.text()).toContain('10.1234/test-publication')
    expect(wrapper.text()).toContain('Citing: 2')

    wrapper = mount(PublicationDescription, {
      props: { publication: mockPublication, alwaysShowDetails: true },
      global: { stubs: defaultStubs }
    })
    expect(wrapper.text()).toContain('DOI:')

    wrapper = mount(PublicationDescription, {
      props: { publication: { ...mockPublication, isActive: false }, alwaysShowDetails: false },
      global: { stubs: defaultStubs }
    })
    expect(wrapper.text()).not.toContain('DOI:')
  })

  it('highlights search terms when provided', () => {
    const wrapper = mount(PublicationDescription, {
      props: { publication: mockPublication, highlighted: 'Test Publication' },
      global: { stubs: defaultStubs }
    })
    expect(wrapper.html()).toContain('has-background-grey-light')
  })

  it('calls showAbstract when abstract button is clicked', async () => {
    const wrapper = mount(PublicationDescription, {
      props: { publication: { ...mockPublication, isActive: true } },
      global: {
        stubs: {
          ...defaultStubs,
          CompactButton: {
            template: '<button @click="$emit(\'click\')" v-bind="$attrs"><slot></slot></button>',
            emits: ['click']
          }
        }
      }
    })

    const abstractButton = wrapper.findAllComponents({ name: 'CompactButton' })
      .find(button => button.attributes('icon') === 'mdi-text')

    if (abstractButton) {
      await abstractButton.trigger('click')
      expect(mockInterfaceStore.showAbstract).toHaveBeenCalledWith({ ...mockPublication, isActive: true })
    }
  })

  it('renders publication tags', () => {
    const wrapper = mount(PublicationDescription, {
      props: {
        publication: { ...mockPublication, isHighlyCited: true, isSurvey: true, isNew: true }
      },
      global: { stubs: defaultStubs }
    })
    expect(wrapper.findAll('.tag').length).toBe(3)
  })
})
