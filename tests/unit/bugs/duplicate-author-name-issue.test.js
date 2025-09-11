import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import AuthorModalDialog from '@/components/modal/AuthorModalDialog.vue'
import { useAuthorStore } from '@/stores/author.js'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'

const vuetify = createVuetify()

describe('Author Alternative Names Issue #540', () => {
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
          },
          PublicationComponent: {
            template: '<div class="publication-component"></div>'
          }
        }
      }
    })
  }

  it('should not show primary name in "also listed as" section when it appears in alternativeNames', () => {
    // Setup author with primary name included in alternative names
    // This reproduces the issue: "Klaus Müller - also listed as [Klaus Müller] [Klaus Muller]"
    const authors = [
      {
        id: 'klaus-muller', // normalized ID
        name: 'Klaus Müller', // primary display name
        count: 2,
        yearMin: 2020,
        yearMax: 2023,
        alternativeNames: ['Klaus Müller', 'Klaus Muller'], // Contains primary name + alternative
        keywords: {},
        coauthors: {},
        orcid: undefined,
        newPublication: false
      }
    ]

    authorStore.selectedPublicationsAuthors = authors
    sessionStore.boostKeywordString = ''
    interfaceStore.isAuthorModalDialogShown = true

    const wrapper = createWrapper()
    const text = wrapper.text()

    // Should show "also listed as" section since there are alternative names
    expect(text).toContain('also listed as')

    // Should NOT show the primary name "Klaus Müller" in the alternative names section
    // We check this by looking for the v-chip containing the primary name
    const chips = wrapper.findAll('.alternative-name')
    const chipTexts = chips.map((chip) => chip.text().trim())

    // Should only show "Klaus Muller" (without umlaut), not "Klaus Müller" (primary name)
    expect(chipTexts).toContain('Klaus Muller')
    expect(chipTexts).not.toContain('Klaus Müller') // This should NOT appear in chips
    expect(chipTexts).toHaveLength(1) // Only one alternative name should be shown
  })

  it('should handle case where author has multiple alternative names but primary name should be excluded', () => {
    // More complex case with multiple alternatives
    const authors = [
      {
        id: 'john-doe',
        name: 'John Doe',
        count: 3,
        yearMin: 2018,
        yearMax: 2023,
        alternativeNames: ['John Doe', 'J. Doe', 'John A. Doe', 'Doe, John'], // Primary + 3 alternatives
        keywords: {},
        coauthors: {},
        orcid: undefined,
        newPublication: false
      }
    ]

    authorStore.selectedPublicationsAuthors = authors
    sessionStore.boostKeywordString = ''
    interfaceStore.isAuthorModalDialogShown = true

    const wrapper = createWrapper()
    const text = wrapper.text()

    expect(text).toContain('also listed as')

    const chips = wrapper.findAll('.alternative-name')
    const chipTexts = chips.map((chip) => chip.text().trim())

    // Should show 3 alternatives but NOT the primary name
    expect(chipTexts).not.toContain('John Doe') // Primary name should not appear
    expect(chipTexts).toContain('J. Doe')
    expect(chipTexts).toContain('John A. Doe')
    expect(chipTexts).toContain('Doe, John')
    expect(chipTexts).toHaveLength(3) // Should show exactly 3 alternatives
  })

  it('should not show "also listed as" section if only primary name exists in alternativeNames', () => {
    // Edge case: only the primary name in alternativeNames
    const authors = [
      {
        id: 'simple-author',
        name: 'Simple Author',
        count: 1,
        yearMin: 2023,
        yearMax: 2023,
        alternativeNames: ['Simple Author'], // Only primary name
        keywords: {},
        coauthors: {},
        orcid: undefined,
        newPublication: false
      }
    ]

    authorStore.selectedPublicationsAuthors = authors
    sessionStore.boostKeywordString = ''
    interfaceStore.isAuthorModalDialogShown = true

    const wrapper = createWrapper()
    const text = wrapper.text()

    // Should NOT show "also listed as" section since no alternatives after filtering
    expect(text).not.toContain('also listed as')
  })
})
