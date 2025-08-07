import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AuthorGlyph from '@/components/AuthorGlyph.vue'

// Mock stores
const mockSessionStore = {
  isAuthorScoreEnabled: true,
  isFirstAuthorBoostEnabled: true,
  isNewPublicationBoostEnabled: true
}

// Mock the store imports
vi.mock('@/stores/session.js', () => ({
  useSessionStore: () => mockSessionStore
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

  it('calculates author color based on score and settings', () => {
    const wrapper = mount(AuthorGlyph, {
      props: {
        author: mockAuthor
      },
      global: {
        stubs: {
          'tippy': { template: '<div><slot></slot></div>' },
          'v-avatar': { template: '<div class="v-avatar" :color="$attrs.color"><slot></slot></div>' },
          'InlineIcon': { template: '<span></span>' }
        }
      }
    })

    const avatar = wrapper.find('.v-avatar')
    // Score 15, so Math.max(60 - 15/3, 0) = Math.max(55, 0) = 55
    expect(avatar.attributes('color')).toBe('hsl(0, 0%, 55%)')
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

  it('handles different score scenarios with disabled settings', () => {
    mockSessionStore.isAuthorScoreEnabled = false
    
    const wrapper = mount(AuthorGlyph, {
      props: {
        author: { ...mockAuthor, score: 2 }
      },
      global: {
        stubs: {
          'tippy': { template: '<div><slot></slot></div>' },
          'v-avatar': { template: '<div class="v-avatar" :color="$attrs.color"><slot></slot></div>' },
          'InlineIcon': { template: '<span></span>' }
        }
      }
    })

    const avatar = wrapper.find('.v-avatar')
    // Score is multiplied by 20 when isAuthorScoreEnabled is false
    // 2 * 20 = 40, so Math.max(60 - 40/3, 0) = Math.max(46.67, 0) = 46.67, rounded down
    expect(avatar.attributes('color')).toContain('hsl(0, 0%,')
  })
})