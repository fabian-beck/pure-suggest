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

    it('should return empty array when no keywords and no citations', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Paper A', citationDois: [], referenceDois: [] },
        { doi: '10.1/b', title: 'Paper B', citationDois: [], referenceDois: [] }
      ]
      const result = FCAService.computeFormalConcepts(pubs, [])

      expect(result).toEqual([])
    })

    it('should compute formal concepts with simple case', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Visual Analytics', citationDois: [], referenceDois: [] },
        { doi: '10.1/b', title: 'Visual Data', citationDois: [], referenceDois: [] }
      ]
      const keywords = ['VISUAL']

      const result = FCAService.computeFormalConcepts(pubs, keywords)

      expect(result.length).toBeGreaterThan(0)
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            publications: expect.arrayContaining(['10.1/a', '10.1/b']),
            attributes: ['VISUAL']
          })
        ])
      )
    })

    it('should identify publications with multiple attributes', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Visual Analytics', citationDois: [], referenceDois: [] },
        { doi: '10.1/b', title: 'Visual Data', citationDois: [], referenceDois: [] },
        { doi: '10.1/c', title: 'Analytics Methods', citationDois: [], referenceDois: [] }
      ]
      const keywords = ['VISUAL', 'ANALYT']

      const result = FCAService.computeFormalConcepts(pubs, keywords)

      // Should include concept with both VISUAL and ANALYT for pub a
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            publications: ['10.1/a'],
            attributes: expect.arrayContaining(['VISUAL', 'ANALYT'])
          })
        ])
      )
    })

    it('should handle citation-based attributes', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Paper A', citationDois: ['10.1/b'], referenceDois: [] },
        { doi: '10.1/b', title: 'Paper B', citationDois: ['10.1/a'], referenceDois: [] }
      ]
      const keywords = []

      const result = FCAService.computeFormalConcepts(pubs, keywords)

      // Should include concepts with mutual citations
      // Each publication cites the other, creating two separate citation attributes
      expect(result.length).toBeGreaterThan(0)

      // Paper A has attribute 10.1/b (it cites B)
      const conceptWithA = result.find(c =>
        c.publications.includes('10.1/a') &&
        c.attributes.includes('10.1/b')
      )
      expect(conceptWithA).toBeDefined()
    })

    it('should handle mixed keyword and citation attributes', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Visual Analytics', citationDois: ['10.1/b'], referenceDois: [] },
        { doi: '10.1/b', title: 'Visual Data', citationDois: [], referenceDois: [] }
      ]
      const keywords = ['VISUAL']

      const result = FCAService.computeFormalConcepts(pubs, keywords)

      // Should include concept with both VISUAL keyword
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            publications: expect.arrayContaining(['10.1/a', '10.1/b']),
            attributes: ['VISUAL']
          })
        ])
      )

      // Should also include concept with paper A having both VISUAL and citing B
      const conceptWithBoth = result.find(c =>
        c.publications.includes('10.1/a') &&
        c.attributes.includes('VISUAL') &&
        c.attributes.includes('10.1/b')
      )
      expect(conceptWithBoth).toBeDefined()
    })

    it('should handle keyword alternatives correctly', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Literature Review', citationDois: [], referenceDois: [] },
        { doi: '10.1/b', title: 'Citation Networks', citationDois: [], referenceDois: [] }
      ]
      const keywords = ['LITERAT|CITATION']

      const result = FCAService.computeFormalConcepts(pubs, keywords)

      // Both publications should match the keyword group
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            publications: expect.arrayContaining(['10.1/a', '10.1/b']),
            attributes: ['LITERAT|CITATION']
          })
        ])
      )
    })

    it('should return all formal concepts including empty sets', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Visual Analytics', citationDois: [], referenceDois: [] }
      ]
      const keywords = ['VISUAL', 'DATA']

      const result = FCAService.computeFormalConcepts(pubs, keywords)

      // Should include concepts:
      // - All publications with no attributes (top concept)
      // - Publication a with VISUAL
      // - No publications with DATA (empty extent)
      // - Empty set with all attributes (bottom concept)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it('should not return duplicate concepts', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Visual Analytics', citationDois: [], referenceDois: [] },
        { doi: '10.1/b', title: 'Visual Analytics', citationDois: [], referenceDois: [] }
      ]
      const keywords = ['VISUAL', 'ANALYT']

      const result = FCAService.computeFormalConcepts(pubs, keywords)

      // Check for unique concepts by serializing and comparing
      const serialized = result.map(concept =>
        JSON.stringify({
          pubs: concept.publications.sort(),
          attrs: concept.attributes.sort()
        })
      )
      const unique = new Set(serialized)
      expect(unique.size).toBe(serialized.length)
    })
  })

  describe('buildContext', () => {
    it('should build binary context matrix with keywords and citations', () => {
      const pubs = [
        {
          doi: '10.1/a',
          title: 'Visual Analytics',
          citationDois: ['10.1/b'],
          referenceDois: []
        },
        {
          doi: '10.1/b',
          title: 'Data Methods',
          citationDois: [],
          referenceDois: ['10.1/a']
        }
      ]
      const keywords = ['VISUAL']

      const context = FCAService.buildContext(pubs, keywords)

      expect(context).toHaveProperty('publications')
      expect(context).toHaveProperty('attributes')
      expect(context).toHaveProperty('matrix')
      expect(context.publications).toHaveLength(2)

      // Should include keyword and citation attributes (only selected publication DOIs)
      expect(context.attributes).toContain('VISUAL')
      expect(context.attributes).toContain('10.1/a')
      expect(context.attributes).toContain('10.1/b')
    })

    it('should correctly identify keyword matches in titles', () => {
      const pubs = [
        {
          doi: '10.1/a',
          title: 'Visual Analytics',
          citationDois: [],
          referenceDois: []
        }
      ]
      const keywords = ['VISUAL', 'ANALYT']

      const context = FCAService.buildContext(pubs, keywords)

      // Find indices of keyword attributes
      const visualIdx = context.attributes.indexOf('VISUAL')
      const analytIdx = context.attributes.indexOf('ANALYT')

      expect(context.matrix[0][visualIdx]).toBe(true)
      expect(context.matrix[0][analytIdx]).toBe(true)
    })

    it('should handle citation relationships as attributes', () => {
      const pubs = [
        {
          doi: '10.1/a',
          title: 'Paper A',
          citationDois: ['10.1/b', '10.1/external'],
          referenceDois: ['10.1/c']
        },
        {
          doi: '10.1/b',
          title: 'Paper B',
          citationDois: ['10.1/a'],
          referenceDois: []
        },
        {
          doi: '10.1/c',
          title: 'Paper C',
          citationDois: [],
          referenceDois: ['10.1/a']
        }
      ]
      const keywords = []

      const context = FCAService.buildContext(pubs, keywords)

      // Should only include DOIs from selected publications, not external ones
      expect(context.attributes).toContain('10.1/a')
      expect(context.attributes).toContain('10.1/b')
      expect(context.attributes).toContain('10.1/c')
      expect(context.attributes).not.toContain('10.1/external')

      // Paper A cites B
      const bIdx = context.attributes.indexOf('10.1/b')
      expect(context.matrix[0][bIdx]).toBe(true)
      expect(context.matrix[1][bIdx]).toBe(false)

      // Paper B cites A
      const aIdx = context.attributes.indexOf('10.1/a')
      expect(context.matrix[0][aIdx]).toBe(false)
      expect(context.matrix[1][aIdx]).toBe(true)
    })

    it('should handle no matches correctly', () => {
      const pubs = [
        {
          doi: '10.1/a',
          title: 'Machine Learning',
          citationDois: [],
          referenceDois: []
        }
      ]
      const keywords = ['VISUAL', 'ANALYT']

      const context = FCAService.buildContext(pubs, keywords)

      const visualIdx = context.attributes.indexOf('VISUAL')
      const analytIdx = context.attributes.indexOf('ANALYT')

      expect(context.matrix[0][visualIdx]).toBe(false)
      expect(context.matrix[0][analytIdx]).toBe(false)
    })

    it('should not duplicate citation DOIs that appear as both citation and reference', () => {
      const pubs = [
        {
          doi: '10.1/a',
          title: 'Paper A',
          citationDois: ['10.1/b'],
          referenceDois: ['10.1/b']
        },
        {
          doi: '10.1/b',
          title: 'Paper B',
          citationDois: ['10.1/a'],
          referenceDois: ['10.1/a']
        }
      ]
      const keywords = []

      const context = FCAService.buildContext(pubs, keywords)

      // Each DOI should appear only once as an attribute
      const aOccurrences = context.attributes.filter(attr => attr === '10.1/a').length
      const bOccurrences = context.attributes.filter(attr => attr === '10.1/b').length
      expect(aOccurrences).toBe(1)
      expect(bOccurrences).toBe(1)
    })

    it('should limit citation attributes to top 10 most cited publications', () => {
      // Create 15 publications with varying citation counts
      const pubs = []
      for (let i = 0; i < 15; i++) {
        const citationDois = []
        // First 10 publications get more citations (15-i citations each)
        // Last 5 get fewer (5-4, 4-3, 3-2, 2-1, 1-0 citations)
        const citationCount = i < 10 ? 15 - i : 5 - (i - 10)

        for (let j = 0; j < citationCount && j < 15; j++) {
          if (j !== i) {
            citationDois.push(`10.1/${j}`)
          }
        }

        pubs.push({
          doi: `10.1/${i}`,
          title: `Paper ${i}`,
          citationDois,
          referenceDois: []
        })
      }

      const keywords = []
      const context = FCAService.buildContext(pubs, keywords)

      // Should only have top 10 citation attributes
      const citationAttrs = context.attributes.filter(attr => attr.startsWith('10.1/'))
      expect(citationAttrs.length).toBeLessThanOrEqual(10)

      // The most cited publications (0-9) should be included
      expect(context.attributes).toContain('10.1/0')
      expect(context.attributes).toContain('10.1/1')

      // The least cited publications (10-14) should likely not be included
      // (unless they happen to cite highly cited publications)
    })
  })

  describe('sortConceptsByImportance', () => {
    it('should sort concepts by importance score (publications * attributes)', () => {
      const concepts = [
        { publications: ['10.1/a'], attributes: ['VISUAL'], importance: 0 },
        { publications: ['10.1/a', '10.1/b', '10.1/c'], attributes: ['DATA', 'ANALYT'], importance: 0 },
        { publications: ['10.1/a', '10.1/b'], attributes: ['VISUAL'], importance: 0 }
      ]

      const sorted = FCAService.sortConceptsByImportance(concepts)

      // 3 pubs * 2 attributes = 6 (highest)
      expect(sorted[0].importance).toBe(6)
      expect(sorted[0].publications).toHaveLength(3)

      // 2 pubs * 1 attribute = 2
      expect(sorted[1].importance).toBe(2)
      expect(sorted[1].publications).toHaveLength(2)

      // 1 pub * 1 attribute = 1 (lowest)
      expect(sorted[2].importance).toBe(1)
      expect(sorted[2].publications).toHaveLength(1)
    })

    it('should handle empty concepts array', () => {
      const result = FCAService.sortConceptsByImportance([])
      expect(result).toEqual([])
    })

    it('should calculate importance correctly for edge cases', () => {
      const concepts = [
        { publications: [], attributes: ['VISUAL', 'DATA'], importance: 0 },
        { publications: ['10.1/a'], attributes: [], importance: 0 }
      ]

      const sorted = FCAService.sortConceptsByImportance(concepts)

      expect(sorted[0].importance).toBe(0)
      expect(sorted[1].importance).toBe(0)
    })

    it('should not mutate original array', () => {
      const concepts = [
        { publications: ['10.1/a'], attributes: ['VISUAL'], importance: 0 },
        { publications: ['10.1/a', '10.1/b'], attributes: ['DATA'], importance: 0 }
      ]
      const original = JSON.stringify(concepts)

      FCAService.sortConceptsByImportance(concepts)

      expect(JSON.stringify(concepts)).toBe(original)
    })
  })

  describe('logFormalConcepts', () => {
    it('should log concepts to console', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b'],
          attributes: ['VISUAL'],
          importance: 2
        },
        {
          publications: ['10.1/a'],
          attributes: ['VISUAL', 'ANALYT'],
          importance: 2
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

    it('should only log top 10 concepts when more than 10 exist', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const concepts = Array.from({ length: 15 }, (_, i) => ({
        publications: [`10.1/${i}`],
        attributes: ['VISUAL'],
        importance: 15 - i
      }))

      FCAService.logFormalConcepts(concepts)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Top 10 concepts')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('15 total')
      )
    })

    it('should include importance score in log output', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b'],
          attributes: ['VISUAL', 'DATA'],
          importance: 4
        }
      ]

      FCAService.logFormalConcepts(concepts)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Importance: 4')
      )
    })

    it('should distinguish between keyword and citation attributes in output', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const concepts = [
        {
          publications: ['10.1/a'],
          attributes: ['VISUAL', '10.1/cited'],
          importance: 2
        }
      ]

      FCAService.logFormalConcepts(concepts)

      // Should show both types of attributes
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Keywords.*VISUAL/)
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Citations.*10\.1\/cited/)
      )
    })
  })
})
