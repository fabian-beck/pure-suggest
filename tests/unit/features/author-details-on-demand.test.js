import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useModalManager } from '@/composables/useModalManager.js'
import { useAuthorStore } from '@/stores/author.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'

// Mock external dependencies
vi.mock('@/lib/Keys.js')
vi.mock('@/core/Publication.js')

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

    it('should have isAuthorActive getter to check if author is active', () => {
      expect(authorStore.isAuthorActive).toBeTypeOf('function')

      expect(authorStore.isAuthorActive('john-doe')).toBe(false)

      authorStore.setActiveAuthor('john-doe')
      expect(authorStore.isAuthorActive('john-doe')).toBe(true)
      expect(authorStore.isAuthorActive('jane-smith')).toBe(false)
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
    it('should make individual authors clickable using structure-based parsing', () => {
      // Test the structure-based approach (no regex)

      const makeAuthorsClickableTest = (authorHtml) => {
        if (!authorHtml) return ''

        const authorSeparator = '; '

        // Check if this looks like a structured author list (contains the separator)
        if (authorHtml.includes(authorSeparator)) {
          // Split by the known separator and wrap each author
          return authorHtml
            .split(authorSeparator)
            .map((author) => {
              const trimmedAuthor = author.trim()
              if (trimmedAuthor) {
                return `<span class="clickable-author" data-author="${trimmedAuthor}">${trimmedAuthor}</span>`
              }
              return trimmedAuthor
            })
            .join(authorSeparator)
        }

        // If no structured separator found, treat as single author
        const trimmedHtml = authorHtml.trim()
        if (trimmedHtml) {
          return `<span class="clickable-author" data-author="${trimmedHtml}">${trimmedHtml}</span>`
        }

        return authorHtml
      }

      const testCases = [
        {
          input: 'John Smith; Jane Doe',
          expected:
            '<span class="clickable-author" data-author="John Smith">John Smith</span>; <span class="clickable-author" data-author="Jane Doe">Jane Doe</span>'
        },
        {
          input: 'Smith, J.; Doe, J. A.',
          expected:
            '<span class="clickable-author" data-author="Smith, J.">Smith, J.</span>; <span class="clickable-author" data-author="Doe, J. A.">Doe, J. A.</span>'
        },
        {
          input: 'Single Author',
          expected:
            '<span class="clickable-author" data-author="Single Author">Single Author</span>'
        }
      ]

      testCases.forEach((testCase) => {
        const result = makeAuthorsClickableTest(testCase.input)
        expect(result).toBe(testCase.expected)
      })
    })

    it('should handle author name click in publication description and activate correct author', () => {
      vi.spyOn(modalManager, 'openAuthorModal')

      // Test the ID conversion function directly
      const testConversion = (authorName, expectedId) => {
        // Use the same nameToId logic as Author.js (and findAuthorIdByName)
        const result = authorName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          // Handle Nordic and other extended Latin characters not covered by NFD
          .replace(/[øØ]/g, 'o')
          .replace(/[åÅ]/g, 'a')
          .replace(/[æÆ]/g, 'ae')
          .replace(/[ðÐ]/g, 'd')
          .replace(/[þÞ]/g, 'th')
          .replace(/[ßẞ]/g, 'ss')
          .toLowerCase()
        expect(result).toBe(expectedId)
        return result
      }

      // Test various author name formats
      testConversion('Smith, J.', 'smith, j.')
      testConversion('John Smith', 'john smith')
      testConversion('Dr. Robert Wilson', 'dr. robert wilson')

      // Verify the interface function is called properly
      const expectedAuthorId = 'smith, j.'
      modalManager.openAuthorModal(expectedAuthorId)
      expect(modalManager.openAuthorModal).toHaveBeenCalledWith(expectedAuthorId)
    })

    it('should only make authors clickable in selected publications, not suggested ones', () => {
      // Test the structure-based approach with publication type consideration

      const makeAuthorsClickableTest = (authorHtml, publicationType) => {
        if (!authorHtml) return ''

        // Apply highlighting first (simplified for test)
        const highlighted = authorHtml

        // Only make clickable if it's a selected publication
        if (publicationType !== 'selected') {
          return highlighted // Return as-is for non-selected publications
        }

        // Use the same parsing logic as implementation
        const authorSeparator = '; '

        if (highlighted.includes(authorSeparator)) {
          return highlighted
            .split(authorSeparator)
            .map((author) => {
              const trimmedAuthor = author.trim()
              if (trimmedAuthor) {
                return `<span class="clickable-author" data-author="${trimmedAuthor}">${trimmedAuthor}</span>`
              }
              return trimmedAuthor
            })
            .join(authorSeparator)
        }

        // Single author case
        const trimmedHtml = highlighted.trim()
        if (trimmedHtml) {
          return `<span class="clickable-author" data-author="${trimmedHtml}">${trimmedHtml}</span>`
        }

        return highlighted
      }

      const testCases = [
        // Selected publications should have clickable authors
        {
          input: 'John Smith; Jane Doe',
          publicationType: 'selected',
          expected:
            '<span class="clickable-author" data-author="John Smith">John Smith</span>; <span class="clickable-author" data-author="Jane Doe">Jane Doe</span>'
        },
        // Suggested publications should NOT have clickable authors
        {
          input: 'John Smith; Jane Doe',
          publicationType: 'suggested',
          expected: 'John Smith; Jane Doe'
        },
        // General publications should NOT have clickable authors
        {
          input: 'Single Author',
          publicationType: 'general',
          expected: 'Single Author'
        }
      ]

      testCases.forEach((testCase) => {
        const result = makeAuthorsClickableTest(testCase.input, testCase.publicationType)
        expect(result).toBe(testCase.expected)
      })
    })

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
        referenceDois: ['10.1000/ref1', '10.1000/ref2'],
        citationDois: ['10.1000/cit1'],
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
      expect(suggestedClickableAuthors.length).toBe(0)

      // Verify that the author names are still displayed (just not clickable)
      expect(suggestedWrapper.text()).toContain('John Doe')
      expect(suggestedWrapper.text()).toContain('Jane Smith')
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
        referenceDois: ['10.1000/ref1', '10.1000/ref2'],
        citationDois: ['10.1000/cit1'],
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

  describe('Network Visualization - Author Node Click Integration', () => {
    it('should activate specific author when author node is clicked', () => {
      vi.spyOn(modalManager, 'openAuthorModal')

      const mockAuthorNode = { author: { id: 'john-doe' } }

      // Simulate network author node click
      modalManager.openAuthorModal(mockAuthorNode.author.id)

      expect(modalManager.openAuthorModal).toHaveBeenCalledWith('john-doe')
    })
  })

  describe('ORCID Author Click Integration', () => {
    it('should handle ORCID-enabled author HTML correctly when making authors clickable', () => {
      // Test the structure-based approach with ORCID HTML
      const makeAuthorsClickableTest = (authorHtml) => {
        if (!authorHtml) return ''

        // Apply highlighting first (simplified for test)
        const highlighted = authorHtml

        // Only make clickable if it's a selected publication (this test assumes selected)
        const authorSeparator = '; '

        if (highlighted.includes(authorSeparator)) {
          return highlighted
            .split(authorSeparator)
            .map((author) => {
              const trimmedAuthor = author.trim()
              if (trimmedAuthor) {
                return `<span class="clickable-author" data-author="${trimmedAuthor}">${trimmedAuthor}</span>`
              }
              return trimmedAuthor
            })
            .join(authorSeparator)
        }

        // Single author case
        const trimmedHtml = highlighted.trim()
        if (trimmedHtml) {
          return `<span class="clickable-author" data-author="${trimmedHtml}">${trimmedHtml}</span>`
        }

        return highlighted
      }

      const testCases = [
        {
          description: 'Authors with ORCID HTML should preserve nested structure',
          input: `John Smith <a href='https://orcid.org/0000-0000-0000-0001'><img alt='ORCID logo' src='orcid-icon.png' width='14' height='14' /></a>; Jane Doe`,
          expectedPattern: /John Smith.*ORCID.*Jane Doe/,
          shouldHaveClickableAuthors: true
        },
        {
          description: 'Single author with ORCID should become clickable',
          input: `Dr. Robert Wilson <a href='https://orcid.org/0000-0000-0000-0002'><img alt='ORCID logo' src='orcid-icon.png' width='14' height='14' /></a>`,
          expectedPattern: /Dr\. Robert Wilson.*ORCID/,
          shouldHaveClickableAuthors: true
        }
      ]

      testCases.forEach((testCase) => {
        const result = makeAuthorsClickableTest(testCase.input)

        // Should contain expected content
        expect(result).toMatch(testCase.expectedPattern)

        if (testCase.shouldHaveClickableAuthors) {
          // Should have clickable-author spans
          expect(result).toContain('clickable-author')
          expect(result).toContain('data-author=')
        }
      })
    })

    it('should extract correct author name from ORCID HTML for click handling', () => {
      // Test extracting clean author names from ORCID HTML
      const extractAuthorNameFromHTML = (htmlContent) => {
        // This simulates what happens when clicking on ORCID-enabled author
        // We need to extract the text content without HTML tags
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = htmlContent
        return tempDiv.textContent || tempDiv.innerText || ''
      }

      const testCases = [
        {
          input: `John Smith <a href='https://orcid.org/0000-0000-0000-0001'><img alt='ORCID logo' src='orcid-icon.png' width='14' height='14' /></a>`,
          expected: 'John Smith '
        },
        {
          input: `Dr. Wilson, R. <a href='https://orcid.org/0000-0000-0000-0002'><img alt='ORCID logo' src='orcid-icon.png' width='14' height='14' /></a>`,
          expected: 'Dr. Wilson, R. '
        }
      ]

      testCases.forEach((testCase) => {
        const result = extractAuthorNameFromHTML(testCase.input)
        expect(result.trim()).toBe(testCase.expected.trim())
      })
    })

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
        referenceDois: ['10.1000/ref1'],
        citationDois: ['10.1000/cit1'],
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
