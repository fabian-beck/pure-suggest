import { describe, it, expect } from 'vitest'
import { ConceptService } from '@/services/ConceptService.js'

describe('FCA Performance Benchmarks', () => {
  it('should handle 20 attributes efficiently', () => {
    // Create a realistic scenario with 20 publications and 20 attributes
    const pubs = []
    for (let i = 0; i < 20; i++) {
      const title = `Publication ${i} about visualization and data analytics`
      const citationDois = []

      // Each pub cites 3 random other pubs
      for (let j = 0; j < 3; j++) {
        const citedIndex = (i + j + 1) % 20
        citationDois.push(`10.1/${citedIndex}`)
      }

      pubs.push({
        doi: `10.1/${i}`,
        title,
        citationDois,
        referenceDois: []
      })
    }

    // 10 keywords that will match various publications
    const keywords = [
      'VISUAL',
      'DATA',
      'ANALYT',
      'NETWORK',
      'GRAPH',
      'SYSTEM',
      'ALGORITHM',
      'METHOD',
      'STUDY',
      'RESEARCH'
    ]

    const startTime = performance.now()
    const concepts = ConceptService.computeConcepts(pubs, keywords)
    const endTime = performance.now()
    const duration = endTime - startTime

    console.log(`\n[FCA Performance]`)
    console.log(`  Publications: ${pubs.length}`)
    console.log(`  Keywords: ${keywords.length}`)
    console.log(`  Total attributes: ~20 (10 keywords + top 10 citations)`)
    console.log(`  Concepts generated: ${concepts.length}`)
    console.log(`  Duration: ${duration.toFixed(2)}ms`)
    console.log(`  Power set size would be: 2^20 = ${Math.pow(2, 20).toLocaleString()} iterations`)

    // Should complete in reasonable time (< 1 second)
    expect(duration).toBeLessThan(1000)

    // Should generate concepts
    expect(concepts.length).toBeGreaterThan(0)
  })

  it('should scale better than exponential with NextClosure', () => {
    const results = []

    // Test with increasing attribute counts
    for (const numPubs of [5, 10, 15]) {
      const pubs = []
      for (let i = 0; i < numPubs; i++) {
        pubs.push({
          doi: `10.1/${i}`,
          title: `Paper ${i} about visualization and analytics`,
          citationDois: i > 0 ? [`10.1/${i - 1}`] : [],
          referenceDois: []
        })
      }

      const keywords = ['VISUAL', 'ANALYT', 'PAPER']

      const startTime = performance.now()
      const concepts = ConceptService.computeConcepts(pubs, keywords)
      const endTime = performance.now()

      results.push({
        numPubs,
        duration: endTime - startTime,
        conceptCount: concepts.length
      })
    }

    console.log('\n[FCA Scaling]')
    results.forEach(r => {
      console.log(`  ${r.numPubs} pubs: ${r.duration.toFixed(2)}ms, ${r.conceptCount} concepts`)
    })

    // Growth should be sub-exponential (output-sensitive)
    // If it were exponential, 15 pubs would take 32x longer than 5 pubs (2^5 / 2^15)
    // With NextClosure, should be much better
    const ratio = results[2].duration / results[0].duration
    console.log(`  Time ratio (15 pubs / 5 pubs): ${ratio.toFixed(2)}x`)

    // Should be much less than 32x (exponential growth)
    expect(ratio).toBeLessThan(32)
  })
})
