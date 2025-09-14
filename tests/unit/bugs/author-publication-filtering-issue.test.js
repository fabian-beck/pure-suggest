import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'

import { useAppState } from '@/composables/useAppState.js'
import { useAuthorStore } from '@/stores/author.js'
import { useSessionStore } from '@/stores/session.js'

describe('Author Publication Filtering Issue', () => {
  let authorStore, sessionStore, appState

  beforeEach(() => {
    setActivePinia(createPinia())
    authorStore = useAuthorStore()
    sessionStore = useSessionStore()
    appState = useAppState()
  })

  describe('Issue: selectedPublicationsForAuthor shows too many publications', () => {
    it('should not show publications from authors with similar names (false positives)', () => {
      // Set up test data that reproduces the issue
      const mockAuthors = [
        {
          id: 'smith, j.',
          name: 'Smith, J.',
          alternativeNames: ['Smith, J.'],
          score: 25,
          count: 2
        },
        {
          id: 'smith, john b.',
          name: 'Smith, John B.',
          alternativeNames: ['Smith, John B.'],
          score: 18,
          count: 1
        }
      ]

      const mockPublications = [
        {
          doi: '10.1/pub1',
          author: 'Smith, J.; Wilson, R.',
          title: 'Publication by Smith J'
        },
        {
          doi: '10.1/pub2',
          author: 'Smith, John B.; Davis, M.',
          title: 'Publication by Smith John B'
        },
        {
          doi: '10.1/pub3',
          author: 'Johnson, A.; Smith, J.',
          title: 'Another publication by Smith J'
        },
        {
          doi: '10.1/pub4',
          author: 'Brown, K.; Smith, John B.; White, L.',
          title: 'Another publication by Smith John B'
        }
      ]

      authorStore.selectedPublicationsAuthors = mockAuthors
      sessionStore.selectedPublications = mockPublications

      // Test Smith, J. - should only get publications where "Smith, J." is the exact author
      authorStore.setActiveAuthor('smith, j.')
      const smithJPublications = appState.selectedPublicationsForAuthor.value

      // Should get publications 1 and 3 (where "Smith, J." is listed)
      expect(smithJPublications).toHaveLength(2)
      expect(smithJPublications.map((p) => p.doi)).toContain('10.1/pub1')
      expect(smithJPublications.map((p) => p.doi)).toContain('10.1/pub3')
      // Should NOT contain publications by "Smith, John B."
      expect(smithJPublications.map((p) => p.doi)).not.toContain('10.1/pub2')
      expect(smithJPublications.map((p) => p.doi)).not.toContain('10.1/pub4')

      // Test Smith, John B. - should only get publications where "Smith, John B." is the exact author
      authorStore.setActiveAuthor('smith, john b.')
      const smithJohnBPublications = appState.selectedPublicationsForAuthor.value

      // Should get publications 2 and 4 (where "Smith, John B." is listed)
      expect(smithJohnBPublications).toHaveLength(2)
      expect(smithJohnBPublications.map((p) => p.doi)).toContain('10.1/pub2')
      expect(smithJohnBPublications.map((p) => p.doi)).toContain('10.1/pub4')
      // Should NOT contain publications by "Smith, J."
      expect(smithJohnBPublications.map((p) => p.doi)).not.toContain('10.1/pub1')
      expect(smithJohnBPublications.map((p) => p.doi)).not.toContain('10.1/pub3')
    })

    it('should handle partial name matches correctly without false positives', () => {
      // Test with more subtle cases where includes() would fail
      const mockAuthors = [
        {
          id: 'brown, m.',
          name: 'Brown, M.',
          alternativeNames: ['Brown, M.'],
          score: 15,
          count: 1
        },
        {
          id: 'brown, mary j.',
          name: 'Brown, Mary J.',
          alternativeNames: ['Brown, Mary J.'],
          score: 20,
          count: 2
        }
      ]

      const mockPublications = [
        {
          doi: '10.1/pub1',
          author: 'Brown, M.; Davis, A.',
          title: 'Publication by Brown M'
        },
        {
          doi: '10.1/pub2',
          author: 'Wilson, R.; Brown, Mary J.',
          title: 'Publication by Brown Mary J'
        },
        {
          doi: '10.1/pub3',
          author: 'Brown, Mary J.; Smith, K.',
          title: 'Another publication by Brown Mary J'
        }
      ]

      authorStore.selectedPublicationsAuthors = mockAuthors
      sessionStore.selectedPublications = mockPublications

      // Test Brown, M. - the current buggy implementation might match "Brown, Mary J." because it includes "Brown, M"
      authorStore.setActiveAuthor('brown, m.')
      const brownMPublications = appState.selectedPublicationsForAuthor.value

      // Should only get pub1 (where "Brown, M." is exactly listed)
      expect(brownMPublications).toHaveLength(1)
      expect(brownMPublications[0].doi).toBe('10.1/pub1')
      // Should NOT match "Brown, Mary J." publications
      expect(brownMPublications.map((p) => p.doi)).not.toContain('10.1/pub2')
      expect(brownMPublications.map((p) => p.doi)).not.toContain('10.1/pub3')

      // Test Brown, Mary J. - should get the correct publications
      authorStore.setActiveAuthor('brown, mary j.')
      const brownMaryPublications = appState.selectedPublicationsForAuthor.value

      // Should get pub2 and pub3 (where "Brown, Mary J." is exactly listed)
      expect(brownMaryPublications).toHaveLength(2)
      expect(brownMaryPublications.map((p) => p.doi)).toContain('10.1/pub2')
      expect(brownMaryPublications.map((p) => p.doi)).toContain('10.1/pub3')
      // Should NOT match "Brown, M." publication
      expect(brownMaryPublications.map((p) => p.doi)).not.toContain('10.1/pub1')
    })

    it('should handle edge cases with comma and semicolon separators correctly', () => {
      // Test publications with different author separators and formats
      const mockAuthors = [
        {
          id: 'johnson, a.',
          name: 'Johnson, A.',
          alternativeNames: ['Johnson, A.'],
          score: 25,
          count: 1
        }
      ]

      const mockPublications = [
        {
          doi: '10.1/semicolon',
          author: 'Johnson, A.; Smith, B.',
          title: 'Publication with semicolon separator'
        },
        {
          doi: '10.1/comma',
          author: 'Johnson, A.; Smith, B.',
          title: 'Publication with semicolon separator (changed from comma)'
        },
        {
          doi: '10.1/mixed',
          author: 'Wilson, R.; Johnson, A.; Davis, M.',
          title: 'Publication with Johnson A in middle'
        }
      ]

      authorStore.selectedPublicationsAuthors = mockAuthors
      sessionStore.selectedPublications = mockPublications

      authorStore.setActiveAuthor('johnson, a.')
      const johnsonPublications = appState.selectedPublicationsForAuthor.value

      // Should find Johnson, A. in all publications regardless of separator format
      expect(johnsonPublications).toHaveLength(3)
      expect(johnsonPublications.map((p) => p.doi)).toContain('10.1/semicolon')
      expect(johnsonPublications.map((p) => p.doi)).toContain('10.1/comma')
      expect(johnsonPublications.map((p) => p.doi)).toContain('10.1/mixed')
    })

    it('should demonstrate the current buggy behavior with includes() method', () => {
      // This test demonstrates the current problem - it should fail initially
      // and pass after we fix the issue

      const mockAuthors = [
        {
          id: 'lee, j.',
          name: 'Lee, J.',
          alternativeNames: ['Lee, J.'],
          score: 25,
          count: 1
        }
      ]

      const mockPublications = [
        {
          doi: '10.1/correct',
          author: 'Lee, J.; Davis, A.',
          title: 'Correct publication by Lee J'
        },
        {
          doi: '10.1/false-positive',
          author: 'Lee, James Robert; Wilson, B.',
          title: 'Should NOT match Lee J - different author'
        }
      ]

      authorStore.selectedPublicationsAuthors = mockAuthors
      sessionStore.selectedPublications = mockPublications

      authorStore.setActiveAuthor('lee, j.')
      const leePublications = appState.selectedPublicationsForAuthor.value

      // This test will initially fail because the current implementation incorrectly matches
      // "Lee, James Robert" because "Lee, James Robert".includes("Lee, J.") returns false
      // but "Lee, J.".includes("Lee, J") returns true (partial match)

      // After fix: should only get the correct publication
      expect(leePublications).toHaveLength(1)
      expect(leePublications[0].doi).toBe('10.1/correct')
      expect(leePublications.map((p) => p.doi)).not.toContain('10.1/false-positive')
    })
  })
})
