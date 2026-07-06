import { describe, it, expect, vi } from 'vitest'

import Author from '@/core/Author.js'

vi.mock('@/constants/config.js', () => ({
  SCORING: {
    FIRST_AUTHOR_BOOST: 2,
    NEW_PUBLICATION_BOOST: 1.5
  }
}))

function createPublication(doi, authorNames, year = 2023) {
  return {
    doi,
    score: 10,
    year,
    isNew: false,
    boostKeywords: [],
    authorOrcid: authorNames,
    author: authorNames
  }
}

describe('Fix wrong author alias (Issue #620)', () => {
  it('should not merge a co-author whose name happens to be a prefix of another author', () => {
    // "He, Qiang" is a real co-author of "Huang, Zeyuan" on this publication.
    // A different, unrelated author named "He, Qi" appears on another publication.
    // "He, Qi" is a textual prefix of "He, Qiang", but they are different people
    // and must not be merged into a single alias.
    const publications = [
      createPublication(
        '10.1109/tvcg.2023.3326932',
        'Huang, Zeyuan; He, Qiang; Maher, Kevin; Deng, Xiaoming; Lai, Yu-Kun; Ma, Cuixia; Qin, Sheng-feng; Liu, Yong-Jin; Wang, Hongan'
      ),
      createPublication('10.1234/other', 'He, Qi; Someone, Else', 2021)
    ]

    const authors = Author.computePublicationsAuthors(publications, true, false, false)

    const huang = authors.find((author) => author.id === 'huang, zeyuan')
    const heQiang = authors.find((author) => author.id === 'he, qiang')
    const heQi = authors.find((author) => author.id === 'he, qi')

    expect(huang).toBeDefined()
    expect(heQiang).toBeDefined()
    expect(heQi).toBeDefined()

    // Huang, Zeyuan must not show any other author as an alias.
    expect(huang.alternativeNames).toEqual(['Huang, Zeyuan'])
    // He, Qiang must not have He, Qi merged in as an alias.
    expect(heQiang.alternativeNames).toEqual(['He, Qiang'])
    expect(heQi.alternativeNames).toEqual(['He, Qi'])
  })

  it('should not merge coauthors when the API returns the same ORCID for both', () => {
    const publications = [
      createPublication(
        '10.1109/tvcg.2023.3326932',
        'Huang, Zeyuan, 0000-0002-2639-0487; He, Qiang, 0000-0002-2639-0487; Maher, Kevin, 0000-0002-6486-4866; Deng, Xiaoming, 0000-0001-8576-1201; Lai, Yu-Kun, 0000-0002-2094-5680; Ma, Cuixia, 0000-0003-3999-7429; Qin, Sheng-feng, 0000-0001-8538-8136; Liu, Yong-Jin, 0000-0001-5774-1916; Wang, Hongan, 0000-0002-9320-4920'
      )
    ]

    const authors = Author.computePublicationsAuthors(publications, true, false, false)

    const huang = authors.find((author) => author.id === 'huang, zeyuan')
    const heQiang = authors.find((author) => author.id === 'he, qiang')

    expect(huang).toBeDefined()
    expect(heQiang).toBeDefined()
    expect(huang.alternativeNames).toEqual(['Huang, Zeyuan'])
    expect(heQiang.alternativeNames).toEqual(['He, Qiang'])
  })
  it('should still merge genuine single-initial abbreviations', () => {
    const publications = [
      createPublication('10.1234/full', 'Schmidt, Klaus'),
      createPublication('10.1234/abbrev', 'Schmidt, K.', 2022)
    ]

    const authors = Author.computePublicationsAuthors(publications, true, false, false)

    const schmidtAuthors = authors.filter((author) => author.id.includes('schmidt'))
    expect(schmidtAuthors).toHaveLength(1)
    expect(schmidtAuthors[0].alternativeNames).toEqual(
      expect.arrayContaining(['Schmidt, Klaus', 'Schmidt, K.'])
    )
  })
})
