import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AuthorGlyph from '@/components/AuthorGlyph.vue'

// Mock stores
const mockAuthorStore = {
  isAuthorScoreEnabled: true,
  isFirstAuthorBoostEnabled: true,
  isAuthorNewBoostEnabled: true
}

// Mock the store imports
vi.mock('@/stores/author.js', () => ({
  useAuthorStore: () => mockAuthorStore
}))

describe('AuthorGlyph', () => {
  let mockAuthor

  beforeEach(() => {
    mockAuthor = {
      score: 15,
      initials: 'JD',
      firstAuthorCount: 2,
      count: 3,
      newPublication: false,
      yearMin: 2020,
      yearMax: 2023
    }
  })

  it('renders author information correctly', () => {
    const wrapper = mount(AuthorGlyph, {
      props: {
        author: mockAuthor
      },
      global: {
        stubs: {
          'tippy': { template: '<div><slot></slot><div class="tooltip-content"><slot name="content"></slot></div></div>' },
          'v-avatar': { template: '<div class="v-avatar"><slot></slot></div>' },
          'InlineIcon': { template: '<span class="inline-icon"></span>' }
        }
      }
    })

    expect(wrapper.text()).toContain('15') // score
    expect(wrapper.text()).toContain('JD') // initials
    expect(wrapper.text()).toContain('2 : 3') // firstAuthorCount : count
  })


  it('shows new publication indicator when author has new publications', () => {
    const authorWithNew = { ...mockAuthor, newPublication: true }

    const wrapper = mount(AuthorGlyph, {
      props: {
        author: authorWithNew
      },
      global: {
        stubs: {
          'tippy': { template: '<div><slot></slot><div class="tooltip-content"><slot name="content"></slot></div></div>' },
          'v-avatar': { template: '<div><slot></slot></div>' },
          'InlineIcon': { template: '<span class="inline-icon"></span>' }
        }
      }
    })

    const icons = wrapper.findAll('.inline-icon')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('displays correct tooltip information', () => {
    const wrapper = mount(AuthorGlyph, {
      props: {
        author: mockAuthor
      },
      global: {
        stubs: {
          'tippy': { template: '<div><slot></slot><div class="tooltip-content"><slot name="content"></slot></div></div>' },
          'v-avatar': { template: '<div><slot></slot></div>' },
          'InlineIcon': { template: '<span></span>' }
        }
      }
    })

    const tooltipContent = wrapper.find('.tooltip-content')
    expect(tooltipContent.text()).toContain('Aggregated score of 15')
    expect(tooltipContent.text()).toContain('through 3 selected publications')
    expect(tooltipContent.text()).toContain('published between 2020 and 2023')
  })

})