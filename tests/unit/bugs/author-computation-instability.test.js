import { describe, it, expect, beforeEach, vi } from 'vitest'
import Author from '@/core/Author.js'

// Mock constants
vi.mock('@/constants/config.js', () => ({
  SCORING: {
    FIRST_AUTHOR_BOOST: 2,
    NEW_PUBLICATION_BOOST: 1.5
  }
}))

describe('Author Computation Instability Bug', () => {
  let publications

  beforeEach(() => {
    // Create publications that could trigger complex merging scenarios
    publications = [
      {
        doi: '10.1234/test1',
        score: 10,
        year: 2023,
        isNew: false,
        boostKeywords: [],
        author: 'Smith, John; Müller, Anna; Johnson, Bob',
        authorOrcid: 'Smith, John; Müller, Anna; Johnson, Bob'
      },
      {
        doi: '10.1234/test2', 
        score: 15,
        year: 2023,
        isNew: false,
        boostKeywords: [],
        author: 'Smith, J.; Mueller, Anna; Davis, Charlie',
        authorOrcid: 'Smith, J.; Mueller, Anna; Davis, Charlie'
      },
      {
        doi: '10.1234/test3',
        score: 8,
        year: 2024,
        isNew: true,
        boostKeywords: [],
        author: 'Wilson, Eva; Smith, John A.; Mueller, A.',
        authorOrcid: 'Wilson, Eva; Smith, John A.; Mueller, A.'
      },
      {
        doi: '10.1234/test4',
        score: 12,
        year: 2023,
        isNew: false,
        boostKeywords: [],
        author: 'Brown, Sarah; Müller, Anna; Thompson, Mike',
        authorOrcid: 'Brown, Sarah; Müller, Anna; Thompson, Mike'
      }
    ]
  })

  describe('Author computation stability', () => {
    it('should produce identical author lists across multiple computations with same inputs', () => {
      // Run the same computation multiple times with identical parameters
      const results = []
      for (let i = 0; i < 20; i++) {
        const authors = Author.computePublicationsAuthors(
          publications, 
          true,  // isAuthorScoreEnabled
          true,  // isFirstAuthorBoostEnabled
          false  // isAuthorNewBoostEnabled
        )
        
        // Capture author IDs and scores for comparison
        const authorData = authors.map(author => ({
          id: author.id,
          score: author.score + author.firstAuthorCount / 100 + author.count / 1000,
          count: author.count,
          firstAuthorCount: author.firstAuthorCount
        }))
        
        results.push(authorData)
      }

      // All results should be identical - same authors in same order with same scores
      const firstResult = results[0]
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(firstResult)
      }
    })

    it('should produce same top authors regardless of object construction order', () => {
      // Test with publications in different orders to see if object construction order affects results
      const originalOrder = [...publications]
      const reversedOrder = [...publications].reverse()
      const shuffledOrder = [publications[2], publications[0], publications[3], publications[1]]
      
      const orderings = [originalOrder, reversedOrder, shuffledOrder]
      const results = []
      
      for (const ordering of orderings) {
        const authors = Author.computePublicationsAuthors(
          ordering, 
          true,  // isAuthorScoreEnabled
          true,  // isFirstAuthorBoostEnabled
          false  // isAuthorNewBoostEnabled
        )
        
        // Get top 3 authors for comparison
        const topAuthors = authors.slice(0, 3).map(author => ({
          id: author.id,
          score: author.score + author.firstAuthorCount / 100 + author.count / 1000,
          count: author.count
        }))
        
        results.push(topAuthors)
      }
      
      // All orderings should produce the same top authors with same scores
      const firstResult = results[0]
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(firstResult)
      }
    })

    it('should handle author merging deterministically', () => {
      // Test specifically for complex merging scenarios (abbreviated names, Eszett variants)
      const complexPublications = [
        {
          doi: '10.1234/complex1',
          score: 10,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          author: 'Weiß, Hans; Schmidt, Klaus; Müller, Fritz',
          authorOrcid: 'Weiß, Hans; Schmidt, Klaus; Müller, Fritz'
        },
        {
          doi: '10.1234/complex2',
          score: 8,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          author: 'Weiss, H.; Schmidt, K.; Mueller, F.',
          authorOrcid: 'Weiss, H.; Schmidt, K.; Mueller, F.'
        },
        {
          doi: '10.1234/complex3',
          score: 12,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          author: 'Weiß, Hans; Mueller, Fritz; Jones, Alice',
          authorOrcid: 'Weiß, Hans; Mueller, Fritz; Jones, Alice'
        }
      ]

      // Run multiple computations 
      const results = []
      for (let i = 0; i < 10; i++) {
        const authors = Author.computePublicationsAuthors(
          complexPublications,
          true,  // isAuthorScoreEnabled
          false, // isFirstAuthorBoostEnabled
          false  // isAuthorNewBoostEnabled
        )
        
        const authorSummary = authors.map(author => ({
          id: author.id,
          score: author.score,
          count: author.count,
          alternativeNames: [...author.alternativeNames].sort() // Sort for consistent comparison
        }))
        
        results.push(authorSummary)
      }

      // All results should be identical
      const firstResult = results[0]
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(firstResult)
      }
    })

    it('should produce consistent results when called in sequence like modal open/close', () => {
      // Simulate the modal open/close scenario
      const modalOpenCloseSequence = []
      
      for (let cycle = 0; cycle < 5; cycle++) {
        // Simulate "modal open" - compute authors
        const authorsOnOpen = Author.computePublicationsAuthors(
          publications, 
          true,  // isAuthorScoreEnabled
          true,  // isFirstAuthorBoostEnabled
          false  // isAuthorNewBoostEnabled
        )
        
        // Simulate some modal interactions (but no settings changes)
        // Just get the top 3 authors for comparison
        const topAuthorsOnOpen = authorsOnOpen.slice(0, 3).map(author => ({
          id: author.id,
          score: author.score + author.firstAuthorCount / 100 + author.count / 1000
        }))
        
        // Simulate "modal close" - compute authors again 
        const authorsOnClose = Author.computePublicationsAuthors(
          publications, 
          true,  // isAuthorScoreEnabled
          true,  // isFirstAuthorBoostEnabled
          false  // isAuthorNewBoostEnabled
        )
        
        const topAuthorsOnClose = authorsOnClose.slice(0, 3).map(author => ({
          id: author.id,
          score: author.score + author.firstAuthorCount / 100 + author.count / 1000
        }))
        
        modalOpenCloseSequence.push({
          cycle: cycle,
          onOpen: topAuthorsOnOpen,
          onClose: topAuthorsOnClose
        })
      }
      
      // For each cycle, the authors on open and close should be identical
      for (const cycle of modalOpenCloseSequence) {
        expect(cycle.onOpen).toEqual(cycle.onClose)
      }
      
      // All cycles should produce the same results
      const firstCycle = modalOpenCloseSequence[0]
      for (let i = 1; i < modalOpenCloseSequence.length; i++) {
        expect(modalOpenCloseSequence[i].onOpen).toEqual(firstCycle.onOpen)
        expect(modalOpenCloseSequence[i].onClose).toEqual(firstCycle.onClose)
      }
    })
  })
})