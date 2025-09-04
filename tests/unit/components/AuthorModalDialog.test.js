import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import AuthorModalDialog from '@/components/modal/AuthorModalDialog.vue'
import { useAuthorStore } from '@/stores/author.js'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'

const vuetify = createVuetify()

describe('AuthorModalDialog', () => {
  let pinia
  let authorStore
  let sessionStore
  let interfaceStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    authorStore = useAuthorStore()
    sessionStore = useSessionStore()
    interfaceStore = useInterfaceStore()
    
    // Mock the stores
    vi.spyOn(authorStore, 'computeSelectedPublicationsAuthors').mockReturnValue()
  })

  const createWrapper = () => {
    return mount(AuthorModalDialog, {
      global: {
        plugins: [vuetify, pinia],
        stubs: {
          ModalDialog: {
            template: `
              <div class="modal-dialog">
                <slot name="header-menu"></slot>
                <slot></slot>
              </div>
            `
          },
          CompactButton: {
            template: '<button><slot></slot></button>'
          },
          AuthorGlyph: {
            template: '<div class="author-glyph"></div>'
          },
          InlineIcon: {
            template: '<span class="inline-icon"></span>'
          }
        }
      }
    })
  }

  it('should show "Co-author of" label when author is activated and has co-authors', async () => {
    // Setup: author with co-authors and the co-author also in the list
    const authors = [
      {
        id: 'author1',
        name: 'John Doe',
        count: 2,
        yearMin: 2020,
        yearMax: 2023,
        alternativeNames: ['John Doe'],
        keywords: {},
        coauthors: {
          'jane-smith': 3
        },
        orcid: undefined,
        newPublication: false
      },
      {
        id: 'jane-smith',
        name: 'Jane Smith',
        count: 1,
        yearMin: 2021,
        yearMax: 2021,
        alternativeNames: ['Jane Smith'],
        keywords: {},
        coauthors: {
          'author1': 3
        },
        orcid: undefined,
        newPublication: false
      }
    ]

    authorStore.selectedPublicationsAuthors = authors
    
    // Activate an author to show co-author details
    authorStore.setActiveAuthor('author1')

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const text = wrapper.text()

    expect(text).toContain('Co-author of')
    expect(text).toContain('Jane Smith (3)')
  })

  it('should NOT show "Co-author of" label when author has no co-authors', () => {
    // Setup: author with no co-authors (empty coauthors object)
    authorStore.selectedPublicationsAuthors = [
      {
        id: 'lonely-author',
        name: 'Lonely Author',
        count: 1,
        yearMin: 2023,
        yearMax: 2023,
        alternativeNames: ['Lonely Author'],
        keywords: {},
        coauthors: {}, // Empty - no co-authors
        orcid: undefined,
        newPublication: false
      }
    ]

    sessionStore.uniqueBoostKeywords = []
    interfaceStore.isAuthorModalDialogShown = true

    const wrapper = createWrapper()
    const text = wrapper.text()

    // This test should FAIL initially, demonstrating the bug
    expect(text).not.toContain('Co-author of')
  })

  it('should show "Co-author of" label when author coauthors object has entries', () => {
    // Setup: author with co-authors object containing entries
    const authors = [
      {
        id: 'author-with-coauthors',
        name: 'Social Author',
        count: 3,
        yearMin: 2020,
        yearMax: 2023,
        alternativeNames: ['Social Author'],
        keywords: {},
        coauthors: {
          'collaborator-one': 2,
          'collaborator-two': 1
        },
        orcid: undefined,
        newPublication: false
      },
      {
        id: 'collaborator-one',
        name: 'Collaborator One',
        count: 1,
        yearMin: 2021,
        yearMax: 2021,
        alternativeNames: ['Collaborator One'],
        keywords: {},
        coauthors: {
          'author-with-coauthors': 2
        },
        orcid: undefined,
        newPublication: false
      },
      {
        id: 'collaborator-two',
        name: 'Collaborator Two',
        count: 1,
        yearMin: 2022,
        yearMax: 2022,
        alternativeNames: ['Collaborator Two'],
        keywords: {},
        coauthors: {
          'author-with-coauthors': 1
        },
        orcid: undefined,
        newPublication: false
      }
    ]

    authorStore.selectedPublicationsAuthors = authors
    
    // Activate an author to show co-author details
    authorStore.setActiveAuthor('author-with-coauthors')

    const wrapper = createWrapper()
    const text = wrapper.text()

    expect(text).toContain('Co-author of')
    expect(text).toContain('Collaborator One (2)')
  })

  it('should apply score-based coloring to co-author chips instead of count-based gray coloring', () => {
    // Setup: author with co-authors that have different scores
    const authors = [
      {
        id: 'main-author',
        name: 'Main Author',
        score: 15, // Higher score
        count: 3,
        yearMin: 2020,
        yearMax: 2023,
        alternativeNames: ['Main Author'],
        keywords: {},
        coauthors: {
          'high-score-coauthor': 2,
          'low-score-coauthor': 1
        },
        orcid: undefined,
        newPublication: false
      },
      {
        id: 'high-score-coauthor',
        name: 'High Score Coauthor',
        score: 20, // Very high score - should be darker
        count: 2,
        yearMin: 2021,
        yearMax: 2022,
        alternativeNames: ['High Score Coauthor'],
        keywords: {},
        coauthors: {
          'main-author': 2
        },
        orcid: undefined,
        newPublication: false
      },
      {
        id: 'low-score-coauthor',
        name: 'Low Score Coauthor',
        score: 5, // Lower score - should be lighter
        count: 1,
        yearMin: 2022,
        yearMax: 2022,
        alternativeNames: ['Low Score Coauthor'],
        keywords: {},
        coauthors: {
          'main-author': 1
        },
        orcid: undefined,
        newPublication: false
      }
    ]

    authorStore.selectedPublicationsAuthors = authors
    authorStore.setActiveAuthor('main-author')

    const wrapper = createWrapper()
    
    // Get the coauthor style for both authors
    const highScoreStyle = wrapper.vm.coauthorStyle('high-score-coauthor')
    const lowScoreStyle = wrapper.vm.coauthorStyle('low-score-coauthor')
    
    // Both should have backgroundColor property
    expect(highScoreStyle).toHaveProperty('backgroundColor')
    expect(lowScoreStyle).toHaveProperty('backgroundColor')
    
    // Higher score author should have a darker color (lower lightness percentage)
    // Extract lightness values from hsla colors
    const highScoreLightness = parseInt(highScoreStyle.backgroundColor.match(/hsla\(0, 0%, (\d+)%/)[1])
    const lowScoreLightness = parseInt(lowScoreStyle.backgroundColor.match(/hsla\(0, 0%, (\d+)%/)[1])
    
    // Higher score should result in lower lightness (darker color)
    expect(highScoreLightness).toBeLessThan(lowScoreLightness)
  })
})