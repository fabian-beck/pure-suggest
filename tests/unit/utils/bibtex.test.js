import { describe, it, expect } from 'vitest'
import { generateBibtex } from '@/utils/bibtex.js'

describe('generateBibtex', () => {
  describe('Core Functionality', () => {
    it('should generate article bibtex for journal publication', () => {
      const publication = {
        title: 'Machine Learning in Software Engineering',
        author: 'John Doe;Jane Smith',
        year: '2023',
        container: 'IEEE Transactions on Software Engineering',
        volume: '49',
        issue: '3',
        page: '123-145',
        doi: '10.1109/TSE.2023.123456'
      }

      const result = generateBibtex(publication)

      expect(result).toContain('@article{Doe2023Machine,')
      expect(result).toContain('title = {Machine Learning in Software Engineering}')
      expect(result).toContain('author = {John Doe and Jane Smith}')
      expect(result).toContain('year = {2023}')
      expect(result).toContain('journal = {IEEE Transactions on Software Engineering}')
      expect(result).toContain('volume = {49}')
      expect(result).toContain('number = {3}')
      expect(result).toContain('pages = {123-145}')
      expect(result).toContain('doi = {10.1109/TSE.2023.123456}')
    })

    it('should generate inproceedings bibtex for conference publication', () => {
      const publication = {
        title: 'A Novel Approach to Testing',
        author: 'Alice Johnson',
        year: '2022',
        container: 'Proceedings of the International Conference on Software Testing',
        page: '45-60',
        doi: '10.1145/conference.2022.456'
      }

      const result = generateBibtex(publication)

      expect(result).toContain('@inproceedings{Johnson2022A,')
      expect(result).toContain('booktitle = {Proceedings of the International Conference on Software Testing}')
      expect(result).not.toContain('journal =')
      expect(result).not.toContain('volume =')
    })

    it('should handle minimal publication with fallback to misc type', () => {
      const publication = {
        title: 'Minimal Publication',
        doi: '10.1234/minimal.123'
      }

      const result = generateBibtex(publication)

      expect(result).toContain('@misc{Minimal,')
      expect(result).toContain('title = {Minimal Publication}')
      expect(result).toContain('doi = {10.1234/minimal.123}')
    })
  })

  describe('Publication Type Detection', () => {
    it('should detect conference publications by container keywords', () => {
      const testCases = [
        { container: 'Proceedings of the Conference', expected: '@inproceedings{' },
        { container: 'International Conference on AI', expected: '@inproceedings{' },
        { container: 'Symposium on Software Engineering', expected: '@inproceedings{' },
        { container: 'Workshop on Testing', expected: '@inproceedings{' }
      ]

      testCases.forEach(({ container, expected }) => {
        const publication = {
          title: 'Test Paper',
          container,
          doi: '10.1234/test.123'
        }
        const result = generateBibtex(publication)
        expect(result).toContain(expected)
      })
    })

    it('should detect journal articles by volume presence', () => {
      const publication = {
        title: 'Journal Paper',
        container: 'Some Journal',
        volume: '42',
        doi: '10.1234/journal.456'
      }

      const result = generateBibtex(publication)

      expect(result).toContain('@article{')
      expect(result).toContain('journal = {Some Journal}')
      expect(result).toContain('volume = {42}')
    })
  })

  describe('Author Processing', () => {
    it('should convert semicolon-separated authors to BibTeX format', () => {
      const publication = {
        title: 'Multi-Author Paper',
        author: 'Alice Smith;Bob Jones;Carol Brown',
        doi: '10.1234/multi.123'
      }

      const result = generateBibtex(publication)

      expect(result).toContain('author = {Alice Smith and Bob Jones and Carol Brown}')
    })

    it('should handle single author correctly', () => {
      const publication = {
        title: 'Single Author Paper',
        author: 'Alice Johnson',
        doi: '10.1234/single.456'
      }

      const result = generateBibtex(publication)

      expect(result).toContain('author = {Alice Johnson}')
    })
  })

  describe('Field Handling', () => {
    it('should protect acronyms in titles', () => {
      const publication = {
        title: 'API Testing with REST Services',
        author: 'Bob Wilson',
        year: '2023',
        doi: '10.1234/test.456'
      }

      const result = generateBibtex(publication)

      expect(result).toContain('title = {{API} Testing with {REST} Services}')
    })

    it('should generate clean citation keys from publication metadata', () => {
      const publication = {
        title: 'Test Paper',
        doi: '10.1234/test_paper_2023'
      }

      const result = generateBibtex(publication)

      expect(result).toContain('@misc{Test,')
      expect(result).toContain('doi = {10.1234/test_paper_2023}')
    })

    it('should handle missing optional fields gracefully', () => {
      const publication = {
        title: 'Basic Publication',
        doi: '10.1234/basic.789'
      }

      const result = generateBibtex(publication)

      expect(result).toContain('title = {Basic Publication}')
      expect(result).toContain('doi = {10.1234/basic.789}')
      // Should not include empty fields
      expect(result).not.toContain('author = {}')
      expect(result).not.toContain('year = {}')
    })
  })

  describe('BibTeX Key Generation Edge Cases', () => {
    it('should handle special characters in author names', () => {
      const publication = {
        title: 'Software Testing',
        author: 'José García-López;María O\'Connor',
        year: '2023',
        doi: '10.1234/test.789'
      }

      const result = generateBibtex(publication)
      expect(result).toContain('@misc{GarcaLpez2023Software,')
    })

    it('should handle missing author field', () => {
      const publication = {
        title: 'Anonymous Paper',
        year: '2023',
        doi: '10.1234/anon.123'
      }

      const result = generateBibtex(publication)
      expect(result).toContain('@misc{2023Anonymous,')
    })

    it('should handle missing year field', () => {
      const publication = {
        title: 'Undated Paper',
        author: 'John Smith',
        doi: '10.1234/undated.456'
      }

      const result = generateBibtex(publication)
      expect(result).toContain('@misc{SmithUndated,')
    })

    it('should handle missing title field', () => {
      const publication = {
        author: 'Jane Doe',
        year: '2022',
        doi: '10.1234/notitle.789'
      }

      const result = generateBibtex(publication)
      expect(result).toContain('@misc{Doe2022,')
    })

    it('should handle all missing fields with DOI fallback', () => {
      const publication = {
        doi: '10.1234/fallback.test-case'
      }

      const result = generateBibtex(publication)
      expect(result).toContain('@misc{101234fallbacktestcase,')
    })

    it('should handle title with special characters and punctuation', () => {
      const publication = {
        title: '"A Study of (Modern) Testing: What\'s Next?"',
        author: 'Alice Wonder',
        year: '2024',
        doi: '10.1234/special.456'
      }

      const result = generateBibtex(publication)
      expect(result).toContain('@misc{Wonder2024A,')
    })

    it('should handle multiple author names correctly', () => {
      const publication = {
        title: 'Collaborative Research',
        author: 'Dr. First Author;Prof. Second Author-Hyphenated;Third J. Author Jr.',
        year: '2023',
        doi: '10.1234/multi.789'
      }

      const result = generateBibtex(publication)
      expect(result).toContain('@misc{Author2023Collaborative,')
    })

    it('should handle very short names and titles', () => {
      const publication = {
        title: 'AI',
        author: 'A B',
        year: '2023',
        doi: '10.1234/short.123'
      }

      const result = generateBibtex(publication)
      expect(result).toContain('@misc{B2023Ai,')
    })

    it('should handle numeric-only title words', () => {
      const publication = {
        title: '2023 Survey of Machine Learning',
        author: 'John Smith',
        year: '2023',
        doi: '10.1234/numeric.456'
      }

      const result = generateBibtex(publication)
      expect(result).toContain('@misc{Smith20232023,')
    })

    it('should handle title starting with non-alphabetic characters', () => {
      const publication = {
        title: '(Re)thinking Software Architecture',
        author: 'Jane Doe',
        year: '2022',
        doi: '10.1234/nonalpha.789'
      }

      const result = generateBibtex(publication)
      expect(result).toContain('@misc{Doe2022Re,')
    })
  })
})