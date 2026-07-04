import { describe, expect, it } from 'vitest'

import Author from '@/core/Author.js'
import Filter from '@/core/Filter.js'
import Publication from '@/core/Publication.js'

function createPublications(count) {
  return Array.from({ length: count }, (_, i) => {
    const publication = new Publication(`10.1000/pub-${i}`)
    publication.processData({
      title: `Publication ${i} on Visual Analytics`,
      author: Array.from({ length: 8 }, (_, a) => `Müllér-${i}-${a}, Ærø`).join('; '),
      container: 'Journal of Testing',
      year: 2020
    })
    return publication
  })
}

describe('Filter Matching Performance', () => {
  it('repeatedly filters a large corpus by author without recomputing author ids', () => {
    const publications = createPublications(2_000)
    const filter = new Filter()
    filter.string = 'visual'
    filter.authors = [Author.nameToId('Müllér-42-0, Ærø')]

    const start = performance.now()
    let matches
    for (let pass = 0; pass < 20; pass++) {
      matches = publications.filter((publication) => filter.matches(publication))
    }
    const filteringTime = performance.now() - start

    expect(matches.map((publication) => publication.doi)).toEqual(['10.1000/pub-42'])
    expect(filteringTime).toBeLessThan(200)
  })

  it('refreshes cached meta string and author ids when publication data is reprocessed', () => {
    const publication = new Publication('10.1000/pub')
    publication.processData({ title: 'Old Title', author: 'Smith, Jane', year: 2020 })
    expect(publication.getMetaString()).toContain('Old Title')
    expect(publication.getAuthorIds()).toEqual([Author.nameToId('Smith, Jane')])

    publication.processData({ title: 'New Title', author: 'Doe, John', year: 2021 })
    expect(publication.getMetaString()).toContain('New Title')
    expect(publication.getMetaString()).not.toContain('Old Title')
    expect(publication.getAuthorIds()).toEqual([Author.nameToId('Doe, John')])
  })
})
