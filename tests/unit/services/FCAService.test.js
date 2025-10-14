import { describe, it, expect, vi, beforeEach } from 'vitest'

import { FCAService } from '@/services/FCAService.js'

describe('FCAService', () => {
  let mockPublications
  let mockBoostKeywords

  beforeEach(() => {
    vi.clearAllMocks()

    mockPublications = [
      {
        doi: '10.1234/pub1',
        title: 'Visual Analytics for Citation Networks',
        boostKeywords: []
      },
      {
        doi: '10.1234/pub2',
        title: 'Literature Review of Visualization Techniques',
        boostKeywords: []
      },
      {
        doi: '10.1234/pub3',
        title: 'Visual Data Analysis Methods',
        boostKeywords: []
      }
    ]

    mockBoostKeywords = ['VISUAL', 'LITERAT|CITATION', 'ANALYT']
  })

  describe('computeFormalConcepts', () => {
    it('should return empty array when no publications', () => {
      const result = FCAService.computeFormalConcepts([], mockBoostKeywords)

      expect(result).toEqual([])
    })

    it('should return empty array when no keywords', () => {
      const result = FCAService.computeFormalConcepts(mockPublications, [])

      expect(result).toEqual([])
    })

    it('should compute formal concepts with simple case', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Visual Analytics', boostKeywords: [] },
        { doi: '10.1/b', title: 'Visual Data', boostKeywords: [] }
      ]
      const keywords = ['VISUAL']

      const result = FCAService.computeFormalConcepts(pubs, keywords)

      expect(result.length).toBeGreaterThan(0)
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            publications: expect.arrayContaining(['10.1/a', '10.1/b']),
            keywords: ['VISUAL']
          })
        ])
      )
    })

    it('should identify publications with multiple keywords', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Visual Analytics', boostKeywords: [] },
        { doi: '10.1/b', title: 'Visual Data', boostKeywords: [] },
        { doi: '10.1/c', title: 'Analytics Methods', boostKeywords: [] }
      ]
      const keywords = ['VISUAL', 'ANALYT']

      const result = FCAService.computeFormalConcepts(pubs, keywords)

      // Should include concept with both VISUAL and ANALYT for pub a
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            publications: ['10.1/a'],
            keywords: expect.arrayContaining(['VISUAL', 'ANALYT'])
          })
        ])
      )
    })

    it('should handle keyword alternatives correctly', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Literature Review', boostKeywords: [] },
        { doi: '10.1/b', title: 'Citation Networks', boostKeywords: [] }
      ]
      const keywords = ['LITERAT|CITATION']

      const result = FCAService.computeFormalConcepts(pubs, keywords)

      // Both publications should match the keyword group
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            publications: expect.arrayContaining(['10.1/a', '10.1/b']),
            keywords: ['LITERAT|CITATION']
          })
        ])
      )
    })

    it('should return all formal concepts including empty sets', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Visual Analytics', boostKeywords: [] }
      ]
      const keywords = ['VISUAL', 'DATA']

      const result = FCAService.computeFormalConcepts(pubs, keywords)

      // Should include concepts:
      // - All publications with no keywords (top concept)
      // - Publication a with VISUAL
      // - No publications with DATA (empty extent)
      // - Empty set with all keywords (bottom concept)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it('should not return duplicate concepts', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Visual Analytics', boostKeywords: [] },
        { doi: '10.1/b', title: 'Visual Analytics', boostKeywords: [] }
      ]
      const keywords = ['VISUAL', 'ANALYT']

      const result = FCAService.computeFormalConcepts(pubs, keywords)

      // Check for unique concepts by serializing and comparing
      const serialized = result.map(concept =>
        JSON.stringify({
          pubs: concept.publications.sort(),
          keys: concept.keywords.sort()
        })
      )
      const unique = new Set(serialized)
      expect(unique.size).toBe(serialized.length)
    })
  })

  describe('buildContext', () => {
    it('should build binary context matrix', () => {
      const context = FCAService.buildContext(mockPublications, mockBoostKeywords)

      expect(context).toHaveProperty('publications')
      expect(context).toHaveProperty('keywords')
      expect(context).toHaveProperty('matrix')
      expect(context.publications).toHaveLength(mockPublications.length)
      expect(context.keywords).toEqual(mockBoostKeywords)
    })

    it('should correctly identify keyword matches in titles', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Visual Analytics', boostKeywords: [] }
      ]
      const keywords = ['VISUAL', 'ANALYT']

      const context = FCAService.buildContext(pubs, keywords)

      // pub1 matches both VISUAL and ANALYT
      expect(context.matrix[0][0]).toBe(true)  // VISUAL
      expect(context.matrix[0][1]).toBe(true)  // ANALYT
    })

    it('should handle no matches correctly', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Machine Learning', boostKeywords: [] }
      ]
      const keywords = ['VISUAL', 'ANALYT']

      const context = FCAService.buildContext(pubs, keywords)

      expect(context.matrix[0][0]).toBe(false)
      expect(context.matrix[0][1]).toBe(false)
    })
  })

  describe('logFormalConcepts', () => {
    it('should log concepts to console', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b'],
          keywords: ['VISUAL']
        },
        {
          publications: ['10.1/a'],
          keywords: ['VISUAL', 'ANALYT']
        }
      ]

      FCAService.logFormalConcepts(concepts)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Formal Concept Analysis')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('concepts found')
      )
    })

    it('should log empty result appropriately', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      FCAService.logFormalConcepts([])

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No formal concepts')
      )
    })
  })
})
