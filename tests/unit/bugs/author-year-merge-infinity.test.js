import { describe, it, expect, beforeEach, vi } from 'vitest'

import Author from '@/core/Author.js'

vi.mock('@/constants/config.js', () => ({
  SCORING: {
    FIRST_AUTHOR_BOOST: 2,
    NEW_PUBLICATION_BOOST: 1.5
  }
}))

describe('Bug: Author.mergeWith sets yearMin/yearMax to Infinity when both authors have undefined years', () => {
  let mockPublication

  beforeEach(() => {
    mockPublication = {
      doi: '10.1234/test',
      score: 10,
      year: undefined, // No year information
      isNew: false,
      boostKeywords: [],
      author: 'Smith, John',
      authorOrcid: 'Smith, John'
    }
  })

  it('should keep yearMin as NaN when merging two authors with undefined years', () => {
    const author1 = new Author('Smith, John', 0, mockPublication)
    const author2 = new Author('Smith, John', 0, mockPublication)

    // Both authors have NaN years from publication without year
    expect(author1.yearMin).toBeNaN()
    expect(author2.yearMin).toBeNaN()

    author1.mergeWith(author2)

    // After merge, yearMin should remain undefined, not become Infinity
    expect(author1.yearMin).toBe(undefined)
    expect(author1.yearMin).not.toBe(Infinity)
  })

  it('should keep yearMax as undefined when merging two authors with undefined years', () => {
    const author1 = new Author('Smith, John', 0, mockPublication)
    const author2 = new Author('Smith, John', 0, mockPublication)

    // Both authors have NaN years from publication without year
    expect(author1.yearMax).toBeNaN()
    expect(author2.yearMax).toBeNaN()

    author1.mergeWith(author2)

    // After merge, yearMax should remain undefined, not become -Infinity
    expect(author1.yearMax).toBe(undefined)
    expect(author1.yearMax).not.toBe(-Infinity)
  })

  it('should correctly merge when one author has years and the other does not', () => {
    const mockPub2020 = { ...mockPublication, year: 2020 }
    const mockPubNoYear = { ...mockPublication, year: undefined }

    const author1 = new Author('Smith, John', 0, mockPub2020)
    const author2 = new Author('Smith, John', 0, mockPubNoYear)

    expect(author1.yearMin).toBe(2020)
    expect(author1.yearMax).toBe(2020)
    expect(author2.yearMin).toBeNaN()
    expect(author2.yearMax).toBeNaN()

    author1.mergeWith(author2)

    // When one has a year and the other doesn't, the valid year should be preserved
    expect(author1.yearMin).toBe(2020)
    expect(author1.yearMax).toBe(2020)
  })

  it('should correctly compute min/max when both authors have different years', () => {
    const mockPub2020 = { ...mockPublication, year: 2020 }
    const mockPub2023 = { ...mockPublication, year: 2023 }

    const author1 = new Author('Smith, John', 0, mockPub2020)
    const author2 = new Author('Smith, John', 0, mockPub2023)

    author1.mergeWith(author2)

    // Should compute proper min/max
    expect(author1.yearMin).toBe(2020)
    expect(author1.yearMax).toBe(2023)
  })
})
