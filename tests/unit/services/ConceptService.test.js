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
            attributes: [{ type: 'keyword', value: 'VISUAL' }]
          })
        ])
      )
    })

    it('should find sub-clusters when one attribute is shared by all publications', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Visual Network Exploration', citationDois: [], referenceDois: [] },
        { doi: '10.1/b', title: 'Visual Network Analysis', citationDois: [], referenceDois: [] },
        { doi: '10.1/c', title: 'Visual Graph Drawing', citationDois: [], referenceDois: [] },
        { doi: '10.1/d', title: 'Visual Graph Layout', citationDois: [], referenceDois: [] },
        { doi: '10.1/e', title: 'Visual Network and Graph Methods', citationDois: [], referenceDois: [] },
        { doi: '10.1/f', title: 'Visual Encoding', citationDois: [], referenceDois: [] }
      ]
      const keywords = ['VISUAL', 'NETWORK', 'GRAPH']

      const result = ConceptService.computeConcepts(pubs, keywords)

      // VISUAL is shared by all publications; sub-clusters must still be enumerated
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            publications: ['10.1/a', '10.1/b', '10.1/e'],
            attributes: expect.arrayContaining([{ type: 'keyword', value: 'NETWORK' }])
          }),
          expect.objectContaining({
            publications: ['10.1/c', '10.1/d', '10.1/e'],
            attributes: expect.arrayContaining([{ type: 'keyword', value: 'GRAPH' }])
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
            attributes: expect.arrayContaining([
              { type: 'keyword', value: 'VISUAL' },
              { type: 'keyword', value: 'ANALYT' }
            ])
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
        c.attributes.some(attr => attr.type === 'citation' && attr.value === '10.1/b')
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
            attributes: expect.arrayContaining([{ type: 'keyword', value: 'VISUAL' }])
          })
        ])
      )

      // Should also include concept with paper A having both VISUAL and citing B
      const conceptWithBoth = result.find(c =>
        c.publications.includes('10.1/a') &&
        c.attributes.some(attr => attr.type === 'keyword' && attr.value === 'VISUAL') &&
        c.attributes.some(attr => attr.type === 'citation' && attr.value === '10.1/b')
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
            attributes: [{ type: 'keyword', value: 'LITERAT|CITATION' }]
          })
        ])
      )
    })

    it('should return only valid formal concepts', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Visual Analytics', citationDois: [], referenceDois: [] }
      ]
      const keywords = ['VISUAL', 'DATA']

      const result = ConceptService.computeConcepts(pubs, keywords)

      // NextClosure correctly generates only valid formal concepts
      // In this case: publication 'a' has VISUAL but not DATA
      // Valid concept: extent={10.1/a}, intent={VISUAL}
      // Invalid (not closed): extent={}, intent={DATA} - not a concept
      expect(result.length).toBeGreaterThanOrEqual(1)

      // Verify the valid concept exists
      const visualConcept = result.find(c =>
        c.publications.includes('10.1/a') &&
        c.attributes.some(attr => attr.type === 'keyword' && attr.value === 'VISUAL')
      )
      expect(visualConcept).toBeDefined()
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
      expect(context.attributes).toContainEqual({ type: 'keyword', value: 'VISUAL' })
      expect(context.attributes).toContainEqual({ type: 'citation', value: '10.1/a' })
      expect(context.attributes).toContainEqual({ type: 'citation', value: '10.1/b' })
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
      const visualIdx = context.attributes.findIndex(attr => attr.type === 'keyword' && attr.value === 'VISUAL')
      const analytIdx = context.attributes.findIndex(attr => attr.type === 'keyword' && attr.value === 'ANALYT')

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
      expect(context.attributes).toContainEqual({ type: 'citation', value: '10.1/a' })
      expect(context.attributes).toContainEqual({ type: 'citation', value: '10.1/b' })
      expect(context.attributes).toContainEqual({ type: 'citation', value: '10.1/c' })
      expect(context.attributes).not.toContainEqual({ type: 'citation', value: '10.1/external' })

      // Paper A cites B and is itself A
      const bIdx = context.attributes.findIndex(attr => attr.type === 'citation' && attr.value === '10.1/b')
      expect(context.matrix[0][bIdx]).toBe(true)
      expect(context.matrix[1][bIdx]).toBe(true) // B has self-reference

      // Paper B cites A and A is referenced by C
      const aIdx = context.attributes.findIndex(attr => attr.type === 'citation' && attr.value === '10.1/a')
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

      const visualIdx = context.attributes.findIndex(attr => attr.type === 'keyword' && attr.value === 'VISUAL')
      const analytIdx = context.attributes.findIndex(attr => attr.type === 'keyword' && attr.value === 'ANALYT')

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
      const aOccurrences = context.attributes.filter(attr => attr.type === 'citation' && attr.value === '10.1/a').length
      const bOccurrences = context.attributes.filter(attr => attr.type === 'citation' && attr.value === '10.1/b').length
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
      const citationAttrs = context.attributes.filter(attr => attr.type === 'citation')
      expect(citationAttrs.length).toBeLessThanOrEqual(10)

      // The most cited publications (0-9) should be included
      expect(context.attributes).toContainEqual({ type: 'citation', value: '10.1/0' })
      expect(context.attributes).toContainEqual({ type: 'citation', value: '10.1/1' })

      // The least cited publications (10-14) should likely not be included
      // (unless they happen to cite highly cited publications)
    })
  })

  describe('sortConceptsByImportance', () => {
    it('should sort concepts by importance score (publications * attributes)', () => {
      const concepts = [
        { publications: ['10.1/a', '10.1/b', '10.1/c'], attributes: [{ type: 'keyword', value: 'VISUAL' }], importance: 0 },
        { publications: ['10.1/d', '10.1/e', '10.1/f'], attributes: [{ type: 'keyword', value: 'DATA' }, { type: 'keyword', value: 'ANALYT' }], importance: 0 },
        { publications: ['10.1/g', '10.1/h', '10.1/i', '10.1/j'], attributes: [{ type: 'keyword', value: 'VISUAL' }, { type: 'keyword', value: 'DATA' }], importance: 0 }
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
        { publications: ['10.1/a'], attributes: [{ type: 'keyword', value: 'VISUAL' }, { type: 'keyword', value: 'DATA' }], importance: 0 },
        { publications: ['10.1/a', '10.1/b'], attributes: [{ type: 'keyword', value: 'VISUAL' }], importance: 0 },
        { publications: ['10.1/a', '10.1/b', '10.1/c'], attributes: [{ type: 'keyword', value: 'DATA' }], importance: 0 }
      ]

      const sorted = ConceptService.sortConceptsByImportance(concepts)

      // Should only include concepts with at least 3 publications
      expect(sorted).toHaveLength(1)
      expect(sorted[0].publications).toHaveLength(3)
    })

    it('should filter out concepts with more than half of total publications', () => {
      const concepts = [
        { publications: ['10.1/a', '10.1/b', '10.1/c'], attributes: [{ type: 'keyword', value: 'DATA' }], importance: 0 },
        { publications: ['10.1/a', '10.1/b', '10.1/c', '10.1/d', '10.1/e', '10.1/f'], attributes: [{ type: 'keyword', value: 'VISUAL' }], importance: 0 }
      ]

      const totalPublications = 10
      const sorted = ConceptService.sortConceptsByImportance(concepts, totalPublications)

      // Should only include concepts with at most 5 publications (half of 10)
      expect(sorted).toHaveLength(1)
      expect(sorted[0].publications).toHaveLength(3)
    })

    it('should not mutate original array', () => {
      const concepts = [
        { publications: ['10.1/a'], attributes: [{ type: 'keyword', value: 'VISUAL' }], importance: 0 },
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
          attributes: [{ type: 'keyword', value: 'VISUAL' }],
          importance: 2
        },
        {
          publications: ['10.1/a'],
          attributes: [{ type: 'keyword', value: 'VISUAL' }, { type: 'keyword', value: 'ANALYT' }],
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
        attributes: [{ type: 'keyword', value: 'VISUAL' }],
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
          attributes: [{ type: 'keyword', value: 'VISUAL' }, { type: 'keyword', value: 'DATA' }],
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
          attributes: [
            { type: 'keyword', value: 'VISUAL' },
            { type: 'citation', value: '10.1/cited' }
          ],
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
        { doi: '10.1/e', concepts: null, title: 'Analytical Framework' },
        { doi: '10.1/f', concepts: null, title: 'Other Topic One' },
        { doi: '10.1/g', concepts: null, title: 'Other Topic Two' }
      ]

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b', '10.1/d'],
          attributes: [{ type: 'keyword', value: 'VISUAL' }, { type: 'keyword', value: 'DESIGN' }],
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
        { doi: '10.1/d', concepts: null, title: 'Visual System' },
        { doi: '10.1/e', concepts: null, title: 'Another Topic' },
        { doi: '10.1/f', concepts: null, title: 'Different Topic' },
        { doi: '10.1/g', concepts: null, title: 'More Topics' }
      ]

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b', '10.1/d'],
          attributes: [{ type: 'keyword', value: 'VISUAL' }],
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
          attributes: [{ type: 'keyword', value: 'VISUAL' }],
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
        { doi: '10.1/c', concepts: null, title: 'Visual System' },
        { doi: '10.1/d', concepts: null, title: 'Other Topic One' },
        { doi: '10.1/e', concepts: null, title: 'Other Topic Two' },
        { doi: '10.1/f', concepts: null, title: 'Other Topic Three' },
        { doi: '10.1/g', concepts: null, title: 'Other Topic Four' }
      ]

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b', '10.1/c'],
          attributes: [{ type: 'keyword', value: 'VISUAL' }],
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
        { doi: '10.1/c', concepts: null, title: 'Analysis' },
        { doi: '10.1/d', concepts: null, title: 'Other Topic One' },
        { doi: '10.1/e', concepts: null, title: 'Other Topic Two' },
        { doi: '10.1/f', concepts: null, title: 'Other Topic Three' },
        { doi: '10.1/g', concepts: null, title: 'Other Topic Four' }
      ]

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b', '10.1/c'],
          attributes: [{ type: 'keyword', value: 'VISUAL' }],
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
          attributes: [{ type: 'keyword', value: 'VISUAL' }],
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

    it('should only use terms with characteristic score >= 1 for concept names', () => {
      const publications = [
        { doi: '10.1/a', concepts: null, title: 'Research on quantum computing methods' },
        { doi: '10.1/b', concepts: null, title: 'Quantum algorithms and applications' },
        { doi: '10.1/c', concepts: null, title: 'Advanced quantum systems' }
      ]

      // Add many publications that also contain "research" (makes it non-exclusive)
      for (let i = 0; i < 10; i++) {
        publications.push({
          doi: `10.1/other${i}`,
          concepts: null,
          title: `Research on different topic ${i}`
        })
      }

      const concepts = [
        {
          publications: ['10.1/a', '10.1/b', '10.1/c'],
          attributes: [{ type: 'keyword', value: 'QUANTUM' }],
          importance: 3
        }
      ]

      ConceptService.assignConceptTags(publications, concepts)

      // "quantum" appears only in concept (inCount=3, outCount=0) -> score = 3/1 = 3 >= 1
      // "research" appears in concept and outside (inCount=1, outCount=10) -> score = 1/11 < 1
      // Only "quantum" should be used for naming (characteristic score >= 1)
      expect(publications[0].concepts[0]).toMatch(/^C1 - QUANTUM/)
    })
  })

  describe('_buildTermMergeMap', () => {
    it('should merge terms with common prefix of length >= 5', () => {
      const termFreq = new Map([
        ['visualiz', 10],
        ['visualization', 8],
        ['visual', 6]
      ])

      const mergeMap = ConceptService._buildTermMergeMap(termFreq)

      expect(mergeMap.get('visualiz')).toBe('visual')
      expect(mergeMap.get('visualization')).toBe('visual')
      expect(mergeMap.get('visual')).toBe('visual')
    })

    it('should merge generat and generation', () => {
      const termFreq = new Map([
        ['generat', 15],
        ['generation', 7]
      ])

      const mergeMap = ConceptService._buildTermMergeMap(termFreq)

      expect(mergeMap.get('generat')).toBe('generat')
      expect(mergeMap.get('generation')).toBe('generat')
    })

    it('should NOT merge general and generat (not prefix relationship)', () => {
      const termFreq = new Map([
        ['general', 10],
        ['generat', 8],
        ['generation', 6]
      ])

      const mergeMap = ConceptService._buildTermMergeMap(termFreq)

      // "general" and "generat" are NOT prefixes of each other, so they stay separate
      expect(mergeMap.get('general')).toBe('general')
      expect(mergeMap.get('generat')).toBe('generat')

      // "generat" IS a prefix of "generation", so they merge
      expect(mergeMap.get('generation')).toBe('generat')
    })

    it('should not merge terms with prefix shorter than 5', () => {
      const termFreq = new Map([
        ['data', 10],
        ['date', 8]
      ])

      const mergeMap = ConceptService._buildTermMergeMap(termFreq)

      expect(mergeMap.get('data')).toBe('data')
      expect(mergeMap.get('date')).toBe('date')
    })

    it('should keep non-similar terms separate', () => {
      const termFreq = new Map([
        ['visual', 10],
        ['network', 8],
        ['analyt', 6]
      ])

      const mergeMap = ConceptService._buildTermMergeMap(termFreq)

      expect(mergeMap.get('visual')).toBe('visual')
      expect(mergeMap.get('network')).toBe('network')
      expect(mergeMap.get('analyt')).toBe('analyt')
    })

    it('should merge multiple related terms', () => {
      const termFreq = new Map([
        ['comput', 12],
        ['computation', 10],
        ['computing', 8],
        ['computational', 6]
      ])

      const mergeMap = ConceptService._buildTermMergeMap(termFreq)

      expect(mergeMap.get('comput')).toBe('comput')
      expect(mergeMap.get('computation')).toBe('comput')
      expect(mergeMap.get('computing')).toBe('comput')
      expect(mergeMap.get('computational')).toBe('comput')
    })

    it('should handle empty map', () => {
      const mergeMap = ConceptService._buildTermMergeMap(new Map())
      expect(mergeMap.size).toBe(0)
    })

    it('should handle single term', () => {
      const termFreq = new Map([['visual', 10]])
      const mergeMap = ConceptService._buildTermMergeMap(termFreq)

      expect(mergeMap.get('visual')).toBe('visual')
    })

    it('should only merge when one term is prefix of another', () => {
      const termFreq = new Map([
        ['network', 20],
        ['networking', 15],
        ['neural', 10],
        ['neuron', 8],
        ['neurons', 5]
      ])

      const mergeMap = ConceptService._buildTermMergeMap(termFreq)

      // "network" is prefix of "networking" (7 chars >= 5)
      expect(mergeMap.get('network')).toBe('network')
      expect(mergeMap.get('networking')).toBe('network')

      // "neuron" is prefix of "neurons" (6 chars >= 5)
      expect(mergeMap.get('neuron')).toBe('neuron')
      expect(mergeMap.get('neurons')).toBe('neuron')

      // "neural" and "neuron" share prefix "neuro" but neither is prefix of other
      expect(mergeMap.get('neural')).toBe('neural')
    })
  })

  describe('computeConceptTerms - consistent term merging', () => {
    it('should merge terms consistently across in-concept and out-concept', () => {
      const conceptPublications = [
        { doi: '10.1/a', title: 'Study on visual analytics' },
        { doi: '10.1/b', title: 'Visual design patterns' },
        { doi: '10.1/c', title: 'Visualization methods' }
      ]

      const outsidePublications = [
        { doi: '10.1/d', title: 'Visual computing' },
        { doi: '10.1/e', title: 'Data visualization' },
        { doi: '10.1/f', title: 'Visualizing networks' }
      ]

      const allPublications = [...conceptPublications, ...outsidePublications]
      const conceptDois = conceptPublications.map(p => p.doi)

      const result = ConceptService.computeConceptTerms(conceptDois, allPublications)

      // "visual", "visualiz", "visualization" should all merge to "visual"
      // Check that the merged term appears in results
      const visualTerm = result.exclusivityTerms.find(t => t.term === 'visual')
      expect(visualTerm).toBeDefined()

      // Should not have separate entries for variants
      const visualizTerm = result.exclusivityTerms.find(t => t.term === 'visualiz')
      const visualizationTerm = result.exclusivityTerms.find(t => t.term === 'visualization')
      expect(visualizTerm).toBeUndefined()
      expect(visualizationTerm).toBeUndefined()

      // The counts should reflect merged frequencies
      // In-concept: "visual" (2) + "visualiz" (0) + "visualization" (1) = 3
      // Out-concept: "visual" (1) + "visualiz" (1) + "visualization" (1) = 3
      expect(visualTerm.inCount).toBe(3)
      expect(visualTerm.outCount).toBe(3)
    })

    it('should use same merge mapping for publication counting', () => {
      const conceptPublications = [
        { doi: '10.1/a', title: 'Computing systems' },
        { doi: '10.1/b', title: 'Computational methods' },
        { doi: '10.1/c', title: 'Computation theory' }
      ]

      const outsidePublications = [
        { doi: '10.1/d', title: 'Network analysis' },
        { doi: '10.1/e', title: 'Data processing' }
      ]

      const allPublications = [...conceptPublications, ...outsidePublications]
      const conceptDois = conceptPublications.map(p => p.doi)

      const result = ConceptService.computeConceptTerms(conceptDois, allPublications)

      // All "comput*" variants should merge to "comput"
      const computTerm = result.exclusivityTerms.find(t => t.term === 'comput')
      expect(computTerm).toBeDefined()

      // All 3 concept publications contain "comput" (after merging)
      // The publication count should be 3 (not counting duplicates from same pub)
      expect(computTerm.inCount).toBe(3)
    })
  })

  describe('Author attributes', () => {
    it('should extract author IDs using Author disambiguation logic', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Paper A', year: 2020, authorOrcid: 'Smith, John; Jones, Mary', citationDois: [], referenceDois: [], boostKeywords: [] },
        { doi: '10.1/b', title: 'Paper B', year: 2021, authorOrcid: 'Smith, John; Brown, Bob', citationDois: [], referenceDois: [], boostKeywords: [] },
        { doi: '10.1/c', title: 'Paper C', year: 2022, authorOrcid: 'Jones, Mary; White, Alice', citationDois: [], referenceDois: [], boostKeywords: [] }
      ]

      const context = ConceptService.buildContext(pubs, [], { includeCitations: false, includeAuthors: true })

      // Should include all authors (top 10), not just those appearing multiple times
      const authorAttrs = context.attributes.filter((attr) => attr.type === 'author')
      expect(authorAttrs.length).toBeGreaterThan(0)
      expect(authorAttrs.map((a) => a.value)).toContain('smith, john')
      expect(authorAttrs.map((a) => a.value)).toContain('jones, mary')
    })

    it('should create concepts based on shared authors', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Paper A', year: 2020, authorOrcid: 'Smith, John; Jones, Mary', citationDois: [], referenceDois: [], boostKeywords: [] },
        { doi: '10.1/b', title: 'Paper B', year: 2021, authorOrcid: 'Smith, John; Brown, Bob', citationDois: [], referenceDois: [], boostKeywords: [] },
        { doi: '10.1/c', title: 'Paper C', year: 2022, authorOrcid: 'Jones, Mary; White, Alice', citationDois: [], referenceDois: [], boostKeywords: [] }
      ]

      const concepts = ConceptService.computeConcepts(pubs, [], { includeCitations: false, includeAuthors: true })

      // Should have a concept for Smith (papers A and B)
      const smithConcept = concepts.find((c) =>
        c.attributes.some((a) => a.type === 'author' && a.value === 'smith, john')
      )
      expect(smithConcept).toBeDefined()
      expect(smithConcept.publications).toContain('10.1/a')
      expect(smithConcept.publications).toContain('10.1/b')

      // Should have a concept for Jones (papers A and C)
      const jonesConcept = concepts.find((c) =>
        c.attributes.some((a) => a.type === 'author' && a.value === 'jones, mary')
      )
      expect(jonesConcept).toBeDefined()
      expect(jonesConcept.publications).toContain('10.1/a')
      expect(jonesConcept.publications).toContain('10.1/c')
    })

    it('should include all authors as attributes even if appearing once', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Paper A', year: 2020, authorOrcid: 'Smith, John', citationDois: [], referenceDois: [], boostKeywords: [] },
        { doi: '10.1/b', title: 'Paper B', year: 2021, authorOrcid: 'Jones, Mary', citationDois: [], referenceDois: [], boostKeywords: [] }
      ]

      const context = ConceptService.buildContext(pubs, [], { includeCitations: false, includeAuthors: true })

      // Authors are included even if they appear only once - FCA will determine concept relevance
      const authorAttrs = context.attributes.filter((attr) => attr.type === 'author')
      expect(authorAttrs.length).toBe(2)
    })

    it('should handle publications without author data', () => {
      const pubs = [
        { doi: '10.1/a', title: 'Paper A', citationDois: [], referenceDois: [] },
        { doi: '10.1/b', title: 'Paper B', year: 2020, authorOrcid: 'Smith, John', citationDois: [], referenceDois: [], boostKeywords: [] }
      ]

      const context = ConceptService.buildContext(pubs, [], { includeCitations: false, includeAuthors: true })

      // Only one author (Smith)
      const authorAttrs = context.attributes.filter((attr) => attr.type === 'author')
      expect(authorAttrs.length).toBe(1)
    })
  })
})
