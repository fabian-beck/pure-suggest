import { describe, it, expect, beforeEach, vi } from 'vitest'
import Author from '@/core/Author.js'

// Mock constants
vi.mock('@/constants/config.js', () => ({
  SCORING: {
    FIRST_AUTHOR_BOOST: 2,
    NEW_PUBLICATION_BOOST: 1.5
  }
}))

describe('Eszett (ß) Transcription Matching Bug Fix', () => {
  let mockPublication1, mockPublication2, mockPublication3

  beforeEach(() => {
    mockPublication1 = {
      doi: '10.1234/test1',
      score: 10,
      year: 2023,
      isNew: false,
      boostKeywords: [],
      authorOrcid: 'Weiß, Hans; Smith, John'
    }

    mockPublication2 = {
      doi: '10.1234/test2',
      score: 10,
      year: 2023,
      isNew: false,
      boostKeywords: [],
      authorOrcid: 'Weiss, Hans; Doe, Jane'
    }

    mockPublication3 = {
      doi: '10.1234/test3',
      score: 10,
      year: 2023,
      isNew: false,
      boostKeywords: [],
      authorOrcid: 'Weis, Hans; Johnson, Bob'
    }
  })

  describe('nameToId current behavior', () => {
    it('should convert ß to ss', () => {
      expect(Author.nameToId('Weiß, Hans')).toBe('weiss, hans')
      expect(Author.nameToId('Straße, Maria')).toBe('strasse, maria')
      expect(Author.nameToId('Müßig, Peter')).toBe('mussig, peter')
    })

    it('should handle uppercase ẞ (capital eszett)', () => {
      expect(Author.nameToId('WEIẞ, HANS')).toBe('weiss, hans')
    })
  })

  describe('current matching limitations', () => {
    it('should now match different transcriptions of same name (limitation fixed)', () => {
      const publications = [mockPublication1, mockPublication2, mockPublication3]
      const authors = Author.computePublicationsAuthors(publications, true, false, false)

      // After the fix, these should be merged into one author
      const hansAuthors = authors.filter(
        (author) =>
          author.name.includes('Hans') &&
          (author.name.includes('Wei') || author.name.includes('Wei'))
      )

      // Now we expect only 1 Hans author after merging variants
      expect(hansAuthors.length).toBe(1)
      const mergedAuthor = hansAuthors[0]
      expect(mergedAuthor.alternativeNames).toEqual(
        expect.arrayContaining(['Weiß, Hans', 'Weiss, Hans', 'Weis, Hans'])
      )
    })
  })

  describe('desired behavior - matching eszett transcriptions', () => {
    it('should match ß, ss, s transcriptions of the same author name', () => {
      const publications = [mockPublication1, mockPublication2, mockPublication3]
      const authors = Author.computePublicationsAuthors(publications, true, false, false)

      // After fix, these should be merged into one author
      const hansAuthors = authors.filter(
        (author) =>
          author.name.toLowerCase().includes('hans') &&
          (author.id.includes('weis') || author.id.includes('wei'))
      )

      // We expect only 1 Hans author after merging
      expect(hansAuthors.length).toBe(1)

      // The merged author should have publications from all variants
      const mergedHans = hansAuthors[0]
      expect(mergedHans.publicationDois).toHaveLength(3)
      expect(mergedHans.publicationDois).toEqual(
        expect.arrayContaining(['10.1234/test1', '10.1234/test2', '10.1234/test3'])
      )

      // Alternative names should include all variants
      expect(mergedHans.alternativeNames).toEqual(
        expect.arrayContaining(['Weiß, Hans', 'Weiss, Hans', 'Weis, Hans'])
      )
    })

    it('should match ß, ss, s, b transcriptions including b variant', () => {
      const publications = [
        mockPublication1, // Weiß, Hans
        mockPublication2, // Weiss, Hans
        mockPublication3, // Weis, Hans
        {
          doi: '10.1234/test4',
          score: 10,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          authorOrcid: 'Weib, Hans; Miller, Tom' // b transcription
        }
      ]

      const authors = Author.computePublicationsAuthors(publications, true, false, false)

      // After fix, all variants should be merged into one author
      const hansAuthors = authors.filter(
        (author) =>
          author.name.toLowerCase().includes('hans') &&
          (author.id.includes('weis') || author.id.includes('wei') || author.id.includes('weib'))
      )

      // We expect only 1 Hans author after merging all variants
      expect(hansAuthors.length).toBe(1)

      // The merged author should have publications from all four variants
      const mergedHans = hansAuthors[0]
      expect(mergedHans.publicationDois).toHaveLength(4)
      expect(mergedHans.publicationDois).toEqual(
        expect.arrayContaining(['10.1234/test1', '10.1234/test2', '10.1234/test3', '10.1234/test4'])
      )

      // Alternative names should include all variants including b
      expect(mergedHans.alternativeNames).toEqual(
        expect.arrayContaining(['Weiß, Hans', 'Weiss, Hans', 'Weis, Hans', 'Weib, Hans'])
      )
    })

    it('should handle complex cases with multiple eszett transcriptions', () => {
      const complexPublications = [
        {
          doi: '10.1234/complex1',
          score: 10,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          authorOrcid: 'Weiß, Hans; Other, Author'
        },
        {
          doi: '10.1234/complex2',
          score: 10,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          authorOrcid: 'Weiss, Hans; Another, Author'
        },
        {
          doi: '10.1234/complex3',
          score: 10,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          authorOrcid: 'Weis, Hans; Third, Author' // Only last name has transcription
        }
      ]

      const authors = Author.computePublicationsAuthors(complexPublications, true, false, false)

      // Should merge into one author despite eszett differences
      const hansAuthors = authors.filter(
        (author) =>
          author.name.toLowerCase().includes('hans') &&
          (author.id.includes('weis') || author.id.includes('wei'))
      )

      expect(hansAuthors.length).toBe(1)
      expect(hansAuthors[0].publicationDois).toHaveLength(3)
    })
  })

  describe('generateEszettVariants method', () => {
    it('should generate ss, s, and b variants for names with ss', () => {
      const variants = Author.generateEszettVariants('weiss, hans')
      expect(variants).toEqual(
        expect.arrayContaining([
          'weiss, hans', // original
          'weis, hans', // s variant
          'weib, hans' // b variant
        ])
      )
      expect(variants).toHaveLength(3)
    })

    it('should generate ss and s variants for names with b', () => {
      const variants = Author.generateEszettVariants('weib, hans')
      expect(variants).toEqual(
        expect.arrayContaining([
          'weib, hans', // original
          'weiss, hans', // ss variant
          'weis, hans' // s variant
        ])
      )
      expect(variants).toHaveLength(3)
    })

    it('should generate ss and b variants for names with single s', () => {
      const variants = Author.generateEszettVariants('weis, hans')
      expect(variants).toEqual(
        expect.arrayContaining([
          'weis, hans', // original
          'weiss, hans', // ss variant
          'weib, hans' // b variant
        ])
      )
      expect(variants).toHaveLength(3)
    })

    it('should handle complex names with multiple potential transcriptions', () => {
      const variants = Author.generateEszettVariants('grossmann, hans')
      expect(variants).toEqual(
        expect.arrayContaining([
          'grossmann, hans', // original
          'grosmann, hans', // s variant
          'grobmann, hans' // b variant
        ])
      )
    })
  })

  describe('edge cases', () => {
    it('should not merge authors with different base names', () => {
      const publications = [
        {
          doi: '10.1234/edge1',
          score: 10,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          authorOrcid: 'Weiß, Hans'
        },
        {
          doi: '10.1234/edge2',
          score: 10,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          authorOrcid: 'Weiss, Peter' // Different first name
        }
      ]

      const authors = Author.computePublicationsAuthors(publications, true, false, false)

      // Should remain separate authors due to different first names
      const weissAuthors = authors.filter((author) => author.id.includes('weis'))
      expect(weissAuthors.length).toBe(2)
    })

    it('should preserve ORCID-based matching priority', () => {
      const publications = [
        {
          doi: '10.1234/orcid1',
          score: 10,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          authorOrcid: 'Weiß, Hans 0000-0000-0000-0001' // ORCID in author string
        },
        {
          doi: '10.1234/orcid2',
          score: 10,
          year: 2023,
          isNew: false,
          boostKeywords: [],
          authorOrcid: 'Weiss, Hans 0000-0000-0000-0001' // Same ORCID
        }
      ]

      const authors = Author.computePublicationsAuthors(publications, true, false, false)

      // Should be merged based on ORCID (existing behavior should be preserved)
      const hansAuthors = authors.filter((author) => author.name.includes('Hans'))
      expect(hansAuthors.length).toBe(1)
      expect(hansAuthors[0].orcid).toBe('0000-0000-0000-0001')
    })
  })
})
