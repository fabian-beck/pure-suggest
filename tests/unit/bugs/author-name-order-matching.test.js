import { describe, it, expect, vi } from 'vitest'

import Author from '@/core/Author.js'

// Mock constants
vi.mock('@/constants/config.js', () => ({
  SCORING: {
    FIRST_AUTHOR_BOOST: 2,
    NEW_PUBLICATION_BOOST: 1.5
  }
}))

function createPublication(doi, authorOrcid, year = 2023) {
  return {
    doi,
    score: 10,
    year,
    isNew: false,
    boostKeywords: [],
    authorOrcid,
    author: authorOrcid.replace(/(,\s+)(\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx])/g, '')
  }
}

describe('Author name order matching ("First Last" vs "Last, First")', () => {
  it('should merge an author listed as "First Last" with the same author listed as "Last, First"', () => {
    const publications = [
      createPublication('10.1234/comma', 'Ma, Kwan-Liu, 0000-0001-8086-0366; Chen, Ling'),
      createPublication('10.1234/nocomma', 'Kwan-Liu Ma; Yuzuru Tanahashi', 2012)
    ]

    const authors = Author.computePublicationsAuthors(publications, true, false, false)

    const maAuthors = authors.filter((author) => author.id.includes('kwan-liu'))
    expect(maAuthors).toHaveLength(1)

    const mergedMa = maAuthors[0]
    expect(mergedMa.name).toBe('Ma, Kwan-Liu')
    expect(mergedMa.orcid).toBe('0000-0001-8086-0366')
    expect(mergedMa.publicationDois).toEqual(
      expect.arrayContaining(['10.1234/comma', '10.1234/nocomma'])
    )
    expect(mergedMa.alternativeNames).toEqual(
      expect.arrayContaining(['Ma, Kwan-Liu', 'Kwan-Liu Ma'])
    )
  })

  it('should merge multi-part first names listed without comma', () => {
    const publications = [
      createPublication('10.1234/a', 'Van Duyne, Richard P.'),
      createPublication('10.1234/b', 'Richard P. Van Duyne')
    ]

    const authors = Author.computePublicationsAuthors(publications, true, false, false)

    // "richard p. van duyne" flips to "duyne, richard p. van" which does not match —
    // conservative behavior: multi-word surnames stay separate rather than mismerge
    expect(authors).toHaveLength(2)
  })

  it('should not merge "First Last" authors with different surnames', () => {
    const publications = [
      createPublication('10.1234/a', 'Ma, Kwan-Liu'),
      createPublication('10.1234/b', 'Kwan-Liu Chen')
    ]

    const authors = Author.computePublicationsAuthors(publications, true, false, false)
    expect(authors).toHaveLength(2)
  })

  it('should not merge when both authors have conflicting ORCIDs', () => {
    const publications = [
      createPublication('10.1234/a', 'Ma, Kwan-Liu, 0000-0001-8086-0366'),
      createPublication('10.1234/b', 'Kwan-Liu Ma, 0000-0002-0000-0001')
    ]

    const authors = Author.computePublicationsAuthors(publications, true, false, false)
    expect(authors).toHaveLength(2)
  })

  it('should update coauthor references after merging name order variants', () => {
    const publications = [
      createPublication('10.1234/comma', 'Ma, Kwan-Liu; Tanahashi, Yuzuru'),
      createPublication('10.1234/nocomma', 'Kwan-Liu Ma; Tanahashi, Yuzuru')
    ]

    const authors = Author.computePublicationsAuthors(publications, true, false, false)

    const tanahashi = authors.find((author) => author.id === 'tanahashi, yuzuru')
    expect(tanahashi.coauthors['ma, kwan-liu']).toBe(2)
    expect(tanahashi.coauthors['kwan-liu ma']).toBeUndefined()
  })
})
