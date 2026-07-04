import { describe, expect, it } from 'vitest'

import Publication from '@/core/Publication.js'

describe('Publication Citation Processing Performance', () => {
  it('processes publications with many citations and references without quadratic deduplication', () => {
    const referenceDois = Array.from({ length: 10_000 }, (_, i) => `10.1000/ref-${i}`)
    const citationDois = Array.from({ length: 10_000 }, (_, i) => `10.1000/cite-${i}`)
    const publication = new Publication('10.1000/main')

    const start = performance.now()
    publication.processCitations({
      reference: referenceDois.join('; '),
      citation: citationDois.join('; '),
      tooManyCitations: false
    })
    const processingTime = performance.now() - start

    expect(publication.referenceDois.size).toBe(referenceDois.length)
    expect(publication.citationDois.size).toBe(citationDois.length)
    expect(processingTime).toBeLessThan(100)
  })

  it('deduplicates repeated DOIs case-insensitively', () => {
    const publication = new Publication('10.1000/main')
    publication.processCitations({
      reference: '10.1000/a; 10.1000/A; 10.1000/b',
      citation: '10.1000/c; 10.1000/c',
      tooManyCitations: false
    })

    expect([...publication.referenceDois]).toEqual(['10.1000/a', '10.1000/b'])
    expect([...publication.citationDois]).toEqual(['10.1000/c'])
  })
})
