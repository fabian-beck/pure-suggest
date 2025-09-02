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

  it('should show "Co-author of" label when author has co-authors', () => {
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

    const wrapper = createWrapper()
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

    const wrapper = createWrapper()
    const text = wrapper.text()

    expect(text).toContain('Co-author of')
    expect(text).toContain('Collaborator One (2)')
  })
})