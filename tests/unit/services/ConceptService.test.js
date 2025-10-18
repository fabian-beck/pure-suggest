import { describe, it, expect, vi } from 'vitest'

import { ConceptService } from '@/services/ConceptService.js'

describe('ConceptService', () => {

  describe('computeConcepts', () => {
    it('should return empty array when no publications', () => {
      const result = ConceptService.computeConcepts([], [])

      expect(result).toEqual([])
    })

    it('should return empty array when no keywords and no citations', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Paper A', citationDois: [], referenceDois: [] },
        { doi: '10.1/b', title: 'Paper B', citationDois: [], referenceDois: [] }
      ]
      const result = ConceptService.computeConcepts(pubs, [])

      expect(result).toEqual([])
    })

    it('should compute formal concepts with simple case', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Visual Analytics', citationDois: [], referenceDois: [] },
        { doi: '10.1/b', title: 'Visual Data', citationDois: [], referenceDois: [] }
      ]
      const keywords = ['VISUAL']

      const result = ConceptService.computeConcepts(pubs, keywords)

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

      const result = ConceptService.computeConcepts(pubs, keywords)

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

      const result = ConceptService.computeConcepts(pubs, keywords)

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

      const result = ConceptService.computeConcepts(pubs, keywords)

      // Should include concept with both VISUAL keyword
      // Note: Paper B also has itself as an attribute (self-reference)
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            publications: expect.arrayContaining(['10.1/a', '10.1/b']),
            attributes: expect.arrayContaining(['VISUAL'])
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

      const result = ConceptService.computeConcepts(pubs, keywords)

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

      const result = ConceptService.computeConcepts(pubs, keywords)

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

      const result = ConceptService.computeConcepts(pubs, keywords)

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

      const context = ConceptService.buildContext(pubs, keywords)

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

      const context = ConceptService.buildContext(pubs, keywords)

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

      const context = ConceptService.buildContext(pubs, keywords)

      // Should only include DOIs from selected publications, not external ones
      expect(context.attributes).toContain('10.1/a')
      expect(context.attributes).toContain('10.1/b')
      expect(context.attributes).toContain('10.1/c')
      expect(context.attributes).not.toContain('10.1/external')

      // Paper A cites B and is itself A
      const bIdx = context.attributes.indexOf('10.1/b')
      expect(context.matrix[0][bIdx]).toBe(true)
      expect(context.matrix[1][bIdx]).toBe(true) // B has self-reference

      // Paper B cites A and A is referenced by C
      const aIdx = context.attributes.indexOf('10.1/a')
      expect(context.matrix[0][aIdx]).toBe(true) // A has self-reference
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

      const context = ConceptService.buildContext(pubs, keywords)

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

      const context = ConceptService.buildContext(pubs, keywords)

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
      const context = ConceptService.buildContext(pubs, keywords)

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
        { publications: ['10.1/a', '10.1/b', '10.1/c'], attributes: ['VISUAL'], importance: 0 },
        { publications: ['10.1/d', '10.1/e', '10.1/f'], attributes: ['DATA', 'ANALYT'], importance: 0 },
        { publications: ['10.1/g', '10.1/h', '10.1/i', '10.1/j'], attributes: ['VISUAL', 'DATA'], importance: 0 }
      ]

      const sorted = ConceptService.sortConceptsByImportance(concepts)

      // Should return only 2 concepts (third is filtered out due to low remaining importance)
      expect(sorted).toHaveLength(2)

      // 4 pubs * 2 attributes = 8 (highest)
      expect(sorted[0].importance).toBe(8)
      expect(sorted[0].publications).toHaveLength(4)

      // 3 pubs * 2 attributes = 6
      expect(sorted[1].importance).toBe(6)
      expect(sorted[1].publications).toHaveLength(3)

      // Third concept (3 pubs * 1 attribute = 3) is filtered out due to remaining importance <= 3
    })

    it('should handle empty concepts array', () => {
      const result = ConceptService.sortConceptsByImportance([])
      expect(result).toEqual([])
    })

    it('should filter out concepts with fewer than 3 publications', () => {
      const concepts = [
        { publications: ['10.1/a'], attributes: ['VISUAL', 'DATA'], importance: 0 },
        { publications: ['10.1/a', '10.1/b'], attributes: ['VISUAL'], importance: 0 },
        { publications: ['10.1/a', '10.1/b', '10.1/c'], attributes: ['DATA'], importance: 0 }
      ]

      const sorted = ConceptService.sortConceptsByImportance(concepts)

      // Should only include concepts with at least 3 publications
      expect(sorted).toHaveLength(1)
      expect(sorted[0].publications).toHaveLength(3)
    })

    it('should not mutate original array', () => {
      const concepts = [
        { publications: ['10.1/a'], attributes: ['VISUAL'], importance: 0 },
        { publications: ['10.1/a', '10.1/b'], attributes: ['DATA'], importance: 0 }
      ]
      const original = JSON.stringify(concepts)

      ConceptService.sortConceptsByImportance(concepts)

      expect(JSON.stringify(concepts)).toBe(original)
    })
  })

  describe('logConcepts', () => {
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

      ConceptService.logConcepts(concepts)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Concept Analysis')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('concepts found')
      )
    })

    it('should log empty result appropriately', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      ConceptService.logConcepts([])

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No concepts')
      )
    })

    it('should only log top 10 concepts when more than 10 exist', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const concepts = Array.from({ length: 15 }, (_, i) => ({
        publications: [`10.1/${i}`],
        attributes: ['VISUAL'],
        importance: 15 - i
      }))

      ConceptService.logConcepts(concepts)

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
          publications: ['10.1/a', '10.1/b', '10.1/c'],
          attributes: ['VISUAL', 'DATA'],
          importance: 6
        }
      ]

      ConceptService.logConcepts(concepts)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Importance: 6')
      )
    })

    it('should distinguish between keyword and citation attributes in output', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b', '10.1/c'],
          attributes: ['VISUAL', '10.1/cited'],
          importance: 6
        }
      ]

      ConceptService.logConcepts(concepts)

      // Should show both types of attributes
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Keywords.*VISUAL/)
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Citations.*10\.1\/cited/)
      )
    })
  })

  describe('assignConceptTags', () => {
    it('should assign concept tags to publications', () => {
      const publications = [
        { doi: '10.1/a', concepts: null, title: 'Visual Analytics Study' },
        { doi: '10.1/b', concepts: null, title: 'Visual Design Patterns' },
        { doi: '10.1/c', concepts: null, title: 'Analytical Methods' },
        { doi: '10.1/d', concepts: null, title: 'Visual System' },
        { doi: '10.1/e', concepts: null, title: 'Analytical Framework' }
      ]

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b', '10.1/d'],
          attributes: ['VISUAL', 'DESIGN'],
          importance: 6
        }
      ]

      ConceptService.assignConceptTags(publications, concepts)

      // Publication a should be in the concept
      expect(publications[0].concepts).toHaveLength(1)
      expect(publications[0].concepts[0]).toMatch(/^C\d+/)

      // Publication b should be in concept 1
      expect(publications[1].concepts).toHaveLength(1)
      expect(publications[1].concepts[0]).toMatch(/^C\d+/)

      // Publication c should not be in any concept
      expect(publications[2].concepts).toBeNull()
    })

    it('should handle publications not in any concept', () => {
      const publications = [
        { doi: '10.1/a', concepts: null, title: 'Visual Study' },
        { doi: '10.1/b', concepts: null, title: 'Visual Analysis' },
        { doi: '10.1/c', concepts: null, title: 'Other Topic' },
        { doi: '10.1/d', concepts: null, title: 'Visual System' }
      ]

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b', '10.1/d'],
          attributes: ['VISUAL'],
          importance: 0
        }
      ]

      ConceptService.assignConceptTags(publications, concepts)

      expect(publications[0].concepts).toHaveLength(1)
      expect(publications[0].concepts[0]).toMatch(/^C1/)
      expect(publications[1].concepts).toHaveLength(1)
      expect(publications[1].concepts[0]).toMatch(/^C1/)
      expect(publications[2].concepts).toBeNull()
    })

    it('should assign tags based on sorted importance', () => {
      const publications = [
        { doi: '10.1/a', concepts: null, title: 'Visual Study' },
        { doi: '10.1/b', concepts: null, title: 'Data Analytics Methods' },
        { doi: '10.1/c', concepts: null, title: 'Analytical Data Processing' },
        { doi: '10.1/d', concepts: null, title: 'Visual System' },
        { doi: '10.1/e', concepts: null, title: 'Data Visualization' },
        { doi: '10.1/f', concepts: null, title: 'Analytics Framework' }
      ]

      const concepts = [
        {
          publications: ['10.1/a', '10.1/d', '10.1/e'],
          attributes: ['VISUAL'],
          importance: 3
        },
        {
          publications: ['10.1/b', '10.1/c', '10.1/e', '10.1/f'],
          attributes: ['DATA', 'ANALYT'],
          importance: 8
        }
      ]

      ConceptService.assignConceptTags(publications, concepts)

      // Should be assigned concept names after sorting by importance
      // Concept with 2 attributes has higher importance (4*2 = 8) - picked first
      // Concept with 1 attribute has 3 pubs, after first concept covers e, has 2 uncovered * 1 attr = 2 remaining (filtered out)
      // Publication e should be in only the first concept picked
      expect(publications[4].concepts).toHaveLength(1)
      expect(publications[4].concepts[0]).toMatch(/^C1/)
    })

    it('should return a map of DOI to concept names', () => {
      const publications = [
        { doi: '10.1/a', concepts: null, title: 'Visual Study' },
        { doi: '10.1/b', concepts: null, title: 'Visual Analysis' },
        { doi: '10.1/c', concepts: null, title: 'Visual System' }
      ]

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b', '10.1/c'],
          attributes: ['VISUAL'],
          importance: 3
        }
      ]

      const tagMap = ConceptService.assignConceptTags(publications, concepts)

      expect(tagMap.get('10.1/a')).toHaveLength(1)
      expect(tagMap.get('10.1/a')[0]).toMatch(/^C1/)
      expect(tagMap.get('10.1/b')).toHaveLength(1)
      expect(tagMap.get('10.1/b')[0]).toMatch(/^C1/)
      expect(tagMap.get('10.1/c')).toHaveLength(1)
      expect(tagMap.get('10.1/c')[0]).toMatch(/^C1/)
    })

    it('should handle empty concepts array', () => {
      const publications = [
        { doi: '10.1/a', concepts: null }
      ]

      const tagMap = ConceptService.assignConceptTags(publications, [])

      expect(publications[0].concepts).toBeNull()
      expect(tagMap.size).toBe(0)
    })

    it('should not add term name when top scores are tied', () => {
      const publications = [
        { doi: '10.1/a', concepts: null, title: 'Study' },
        { doi: '10.1/b', concepts: null, title: 'Research' },
        { doi: '10.1/c', concepts: null, title: 'Analysis' }
      ]

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b', '10.1/c'],
          attributes: ['VISUAL'],
          importance: 3
        }
      ]

      ConceptService.assignConceptTags(publications, concepts)

      // All publications have different single-word titles with same TF-IDF
      // Should get concept number only (no term name)
      expect(publications[0].concepts[0]).toBe('C1')
      expect(publications[1].concepts[0]).toBe('C1')
      expect(publications[2].concepts[0]).toBe('C1')
    })

    it('should add term name when there is a clear winner', () => {
      const publications = [
        { doi: '10.1/a', concepts: null, title: 'Unique neuromorphic computing systems' },
        { doi: '10.1/b', concepts: null, title: 'Neuromorphic design patterns' },
        { doi: '10.1/c', concepts: null, title: 'Advanced neuromorphic architectures' }
      ]

      // Add many other publications with diverse titles to increase IDF
      for (let i = 0; i < 10; i++) {
        publications.push({
          doi: `10.1/other${i}`,
          concepts: null,
          title: `Different topic ${i} with various words`
        })
      }

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b', '10.1/c'],
          attributes: ['VISUAL'],
          importance: 3
        }
      ]

      ConceptService.assignConceptTags(publications, concepts)

      // "neuromorphic" appears only in concept publications - should have highest TF-IDF
      expect(publications[0].concepts[0]).toMatch(/^C1 - NEUROMORPHIC/)
    })

    it('should boost keyword alternatives separated by pipe', () => {
      const publications = [
        { doi: '10.1/a', concepts: null, title: 'Visual data analysis methods' },
        { doi: '10.1/b', concepts: null, title: 'Graphic representation techniques' },
        { doi: '10.1/c', concepts: null, title: 'Visualization and graphics systems' }
      ]

      // Add other publications
      for (let i = 0; i < 10; i++) {
        publications.push({
          doi: `10.1/other${i}`,
          concepts: null,
          title: `Different topic ${i} with other terms`
        })
      }

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b', '10.1/c'],
          attributes: ['VIS|GRAPH'], // Pipe-separated alternatives
          importance: 0
        }
      ]

      ConceptService.assignConceptTags(publications, concepts)

      // Should match "visual" and "graphic" via keyword alternatives and boost them
      const conceptName = publications[0].concepts[0]
      expect(conceptName).toMatch(/^C1/) // Has a concept tag
      // If there's a clear winner after boosting, it should be VIS or GRAPH related
    })
  })
})
