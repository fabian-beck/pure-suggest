import { describe, it, expect, beforeEach, vi } from 'vitest'
import Author from '@/core/Author.js'

// Mock constants
vi.mock('@/constants/config.js', () => ({
  SCORING: {
    FIRST_AUTHOR_BOOST: 2,
    NEW_PUBLICATION_BOOST: 1.5
  }
}))

describe('Instable Author Sorting Bug', () => {
  let publications

  beforeEach(() => {
    // Create publications with authors that will have identical scores
    publications = [
      {
        doi: '10.1234/test1',
        score: 10,
        year: 2023,
        isNew: false,
        boostKeywords: [],
        author: 'Smith, Alice; Doe, Bob',
        authorOrcid: 'Smith, Alice; Doe, Bob'
      },
      {
        doi: '10.1234/test2', 
        score: 10,
        year: 2023,
        isNew: false,
        boostKeywords: [],
        author: 'Jones, Charlie; Wilson, Dave',
        authorOrcid: 'Jones, Charlie; Wilson, Dave'
      }
    ]
  })

  describe('Author sorting determinism', () => {
    it('should produce consistent author order across multiple computations with identical scores', () => {
      // Run the same computation multiple times
      const results = []
      for (let i = 0; i < 10; i++) {
        const authors = Author.computePublicationsAuthors(
          publications, 
          true,  // isAuthorScoreEnabled
          false, // isFirstAuthorBoostEnabled
          false  // isAuthorNewBoostEnabled
        )
        results.push(authors.map(author => author.id))
      }

      // All results should be identical
      const firstResult = results[0]
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(firstResult)
      }
    })

    it('should handle authors with identical composite scores deterministically', () => {
      // Create a scenario where multiple authors have the same composite score
      // Using specific names that when converted to IDs might have different orders
      const identicalScorePublications = [
        {
          doi: '10.1234/identical1',
          score: 5,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          author: 'Zimmerman, Alice',
          authorOrcid: 'Zimmerman, Alice'
        },
        {
          doi: '10.1234/identical2',
          score: 5,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          author: 'Anderson, Bob',
          authorOrcid: 'Anderson, Bob'
        },
        {
          doi: '10.1234/identical3',
          score: 5,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          author: 'Peters, Charlie',
          authorOrcid: 'Peters, Charlie'
        }
      ]

      // Run multiple times and ensure consistent ordering
      const results = []
      for (let i = 0; i < 20; i++) {
        const authors = Author.computePublicationsAuthors(
          identicalScorePublications,
          true,  // isAuthorScoreEnabled
          false, // isFirstAuthorBoostEnabled
          false  // isAuthorNewBoostEnabled
        )
        results.push(authors.map(author => author.id))
      }

      // Verify all results are identical
      const firstResult = results[0]
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(firstResult)
      }

      // Verify that when scores are identical, names are ordered lexicographically
      const authors = Author.computePublicationsAuthors(
        identicalScorePublications,
        true, false, false
      )
      const scores = authors.map(a => a.score + a.firstAuthorCount / 100 + a.count / 1000)
      const allScoresEqual = scores.every(score => score === scores[0])
      
      if (allScoresEqual) {
        // When scores are equal, names should be in lexicographic order
        const names = authors.map(a => a.id)
        const sortedNames = [...names].sort()
        expect(names).toEqual(sortedNames)
      }
    })

    it('should maintain deterministic order even with complex author merging scenarios', () => {
      // Create a scenario with authors that might get merged
      const complexPublications = [
        {
          doi: '10.1234/complex1',
          score: 8,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          author: 'Smith, J.; Jones, M.',
          authorOrcid: 'Smith, J.; Jones, M.'
        },
        {
          doi: '10.1234/complex2',
          score: 8,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          author: 'Smith, John; Wilson, A.',
          authorOrcid: 'Smith, John; Wilson, A.'
        },
        {
          doi: '10.1234/complex3',
          score: 8,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          author: 'Brown, Sarah; Davis, Tom',
          authorOrcid: 'Brown, Sarah; Davis, Tom'
        }
      ]

      // Multiple computations should yield consistent results
      const results = []
      for (let i = 0; i < 5; i++) {
        const authors = Author.computePublicationsAuthors(
          complexPublications,
          true,  // isAuthorScoreEnabled
          false, // isFirstAuthorBoostEnabled
          false  // isAuthorNewBoostEnabled
        )
        results.push(authors.map(author => author.id))
      }

      // All results should be identical
      const firstResult = results[0]
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(firstResult)
      }
    })
  })
})