import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useModalManager } from '@/composables/useModalManager.js'
import { useAuthorStore } from '@/stores/author.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'

// Mock external dependencies
vi.mock('@/lib/Keys.js')

describe('Author Details On Demand Feature', () => {
  let modalStore, authorStore, sessionStore, modalManager
  let mockAuthors

  beforeEach(() => {
    setActivePinia(createPinia())
    modalStore = useModalStore()
    authorStore = useAuthorStore()
    sessionStore = useSessionStore()
    modalManager = useModalManager()

    // Mock author data
    mockAuthors = [
      {
        id: 'john-doe',
        name: 'John Doe',
        score: 25,
        count: 3,
        alternativeNames: ['John Doe', 'J. Doe'],
        keywords: { 'machine learning': 2, AI: 1 },
        coauthors: { 'jane-smith': 2 },
        yearMin: 2020,
        yearMax: 2023,
        newPublication: false
      },
      {
        id: 'jane-smith',
        name: 'Jane Smith',
        score: 18,
        count: 2,
        alternativeNames: ['Jane Smith'],
        keywords: { 'deep learning': 1 },
        coauthors: { 'john-doe': 2 },
        yearMin: 2021,
        yearMax: 2022,
        newPublication: true
      }
    ]

    authorStore.selectedPublicationsAuthors = mockAuthors
    sessionStore.boostKeywordString = 'machine learning, AI, deep learning'
  })

  describe('Author Store - Active Author State', () => {
    it('should have activeAuthorId state to track which author is activated', () => {
      expect(authorStore).toHaveProperty('activeAuthorId')
      expect(authorStore.activeAuthorId).toBeNull()
    })

    it('should have setActiveAuthor action to activate specific author', () => {
      expect(authorStore.setActiveAuthor).toBeTypeOf('function')

      authorStore.setActiveAuthor('john-doe')
      expect(authorStore.activeAuthorId).toBe('john-doe')
    })

    it('should have clearActiveAuthor action to deactivate author', () => {
      expect(authorStore.clearActiveAuthor).toBeTypeOf('function')

      authorStore.setActiveAuthor('john-doe')
      authorStore.clearActiveAuthor()
      expect(authorStore.activeAuthorId).toBeNull()
    })

    it('should have activeAuthor getter to get currently active author object', () => {
      expect(authorStore.activeAuthor).toBeNull()

      authorStore.setActiveAuthor('john-doe')
      expect(authorStore.activeAuthor).toEqual(mockAuthors[0])

      authorStore.setActiveAuthor('jane-smith')
      expect(authorStore.activeAuthor).toEqual(mockAuthors[1])

      authorStore.setActiveAuthor('nonexistent')
      expect(authorStore.activeAuthor).toBeNull()
    })
  })

  describe('Interface Store - Author Modal State Management', () => {
    it('should have openAuthorModal accept authorId parameter to activate specific author', () => {
      vi.spyOn(authorStore, 'setActiveAuthor')

      modalManager.openAuthorModal('john-doe')

      expect(authorStore.setActiveAuthor).toHaveBeenCalledWith('john-doe')
      expect(modalStore.isAuthorModalDialogShown).toBe(true)
    })
  })

  // Note: AuthorModalDialog UI behavior (including clearing active author when modal closes)
  // is tested in tests/unit/components/AuthorModalDialog.test.js

  describe('Publication Component - Author Click Integration', () => {
    it('should render clickable authors in selected publications but not in suggested ones', async () => {
      // Import the actual component
      const { mount } = await import('@vue/test-utils')
      const PublicationDescription = await import('@/components/PublicationDescription.vue')

      const mockPublication = {
        doi: '10.1000/test',
        title: 'Test Publication',
        author: 'John Doe; Jane Smith',
        authorOrcidHtml: 'John Doe; Jane Smith',
        year: 2023,
        wasFetched: true,
        isActive: true,
        referenceDois: new Set(['10.1000/ref1', '10.1000/ref2']),
        citationDois: new Set(['10.1000/cit1']),
        tooManyCitations: false,
        citationsPerYear: 2.5
      }

      // Test selected publication - should have clickable authors
      const selectedWrapper = mount(PublicationDescription.default, {
        props: {
          publication: mockPublication,
          publicationType: 'selected'
        }
      })

      await selectedWrapper.vm.$nextTick()
      const selectedClickableAuthors = selectedWrapper.findAll('.clickable-author')
      expect(selectedClickableAuthors.length).toBeGreaterThan(0)

      // Test suggested publication - should NOT have clickable authors
      const suggestedWrapper = mount(PublicationDescription.default, {
        props: {
          publication: mockPublication,
          publicationType: 'suggested'
        }
      })

      await suggestedWrapper.vm.$nextTick()
      const suggestedClickableAuthors = suggestedWrapper.findAll('.clickable-author')
      expect(suggestedClickableAuthors).toHaveLength(0)

      // Verify that the author names are still displayed (just not clickable)
      expect(suggestedWrapper.text()).toContain('John Doe')
      expect(suggestedWrapper.text()).toContain('Jane Smith')
    })

    it('should open the author details by pressing Enter on a focused author name', async () => {
      const { mount } = await import('@vue/test-utils')
      const PublicationDescription = await import('@/components/PublicationDescription.vue')
      const wrapper = mount(PublicationDescription.default, {
        props: {
          publication: {
            doi: '10.1000/test',
            title: 'Test Publication',
            author: 'John Doe; Jane Smith',
            authorOrcidHtml: 'John Doe; Jane Smith',
            year: 2023,
            wasFetched: true,
            isActive: true,
            referenceDois: new Set(),
            citationDois: new Set()
          },
          publicationType: 'selected'
        },
        global: { plugins: [getActivePinia()] }
      })

      const author = wrapper.find('.clickable-author')
      expect(author.attributes()).toMatchObject({ role: 'button', tabindex: '0' })
      await author.trigger('keydown', { key: 'Enter' })

      expect(modalStore.isAuthorModalDialogShown).toBe(true)
      expect(authorStore.activeAuthorId).toBe('john doe')
    })

    it('should have proper CSS classes for clickable authors in selected publications', async () => {
      // Import the actual component
      const { mount } = await import('@vue/test-utils')
      const PublicationDescription = await import('@/components/PublicationDescription.vue')

      const mockPublication = {
        doi: '10.1000/test',
        title: 'Test Publication',
        author: 'John Doe; Jane Smith',
        authorOrcidHtml: 'John Doe; Jane Smith',
        year: 2023,
        wasFetched: true,
        isActive: true,
        referenceDois: new Set(['10.1000/ref1', '10.1000/ref2']),
        citationDois: new Set(['10.1000/cit1']),
        tooManyCitations: false,
        citationsPerYear: 2.5
      }

      // Mount selected publication (should have clickable authors with hover effects)
      const wrapper = mount(PublicationDescription.default, {
        props: {
          publication: mockPublication,
          publicationType: 'selected'
        }
      })

      await wrapper.vm.$nextTick()

      // Find clickable authors
      const clickableAuthors = wrapper.findAll('.clickable-author')
      expect(clickableAuthors.length).toBeGreaterThan(0)

      // Verify each clickable author has the correct CSS class
      clickableAuthors.forEach((authorElement) => {
        // Should have the clickable-author class which includes cursor: pointer and hover effects
        expect(authorElement.classes()).toContain('clickable-author')

        // Verify it has the data-author attribute for click handling
        expect(authorElement.attributes('data-author')).toBeDefined()
      })
    })
  })

  describe('ORCID Author Click Integration', () => {
    it('should correctly handle ORCID authors with clean data-author attribute', async () => {
      const { mount } = await import('@vue/test-utils')
      const PublicationDescription = await import('@/components/PublicationDescription.vue')

      const mockPublication = {
        doi: '10.1000/test-orcid-fixed',
        title: 'Test Publication with ORCID',
        author: 'John Smith; Jane Doe',
        authorOrcidHtml: `John Smith <a href='https://orcid.org/0000-0000-0000-0001'><img alt='ORCID logo' src='orcid-icon.png' width='14' height='14' /></a>; Jane Doe`,
        authorOrcidData: [
          {
            index: 0,
            orcidId: '0000-0000-0000-0001',
            authorName: 'John Smith'
          }
        ],
        year: 2023,
        wasFetched: true,
        isActive: true,
        referenceDois: new Set(['10.1000/ref1']),
        citationDois: new Set(['10.1000/cit1']),
        tooManyCitations: false,
        citationsPerYear: 1.5
      }

      const wrapper = mount(PublicationDescription.default, {
        props: {
          publication: mockPublication,
          publicationType: 'selected'
        }
      })

      await wrapper.vm.$nextTick()

      const clickableAuthors = wrapper.findAll('.clickable-author')
      expect(clickableAuthors.length).toBeGreaterThan(0)

      const firstAuthor = clickableAuthors[0]
      const dataAuthor = firstAuthor.attributes('data-author')

      expect(dataAuthor).toBe('John Smith')
      expect(dataAuthor).not.toContain('<a href=')
      expect(firstAuthor.html()).not.toContain('<a href=')

      const authorSection = wrapper.find('[data-author="John Smith"]').element.parentElement
      expect(authorSection.innerHTML).toContain('href="https://orcid.org/')
    })
  })
})
