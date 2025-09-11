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

      expect(result).toContain('@article{10.1109/TSE.2023.123456')
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

      expect(result).toContain('@inproceedings{10.1145/conference.2022.456')
      expect(result).toContain(
        'booktitle = {Proceedings of the International Conference on Software Testing}'
      )
      expect(result).not.toContain('journal =')
      expect(result).not.toContain('volume =')
    })

    it('should handle minimal publication with fallback to misc type', () => {
      const publication = {
        title: 'Minimal Publication',
        doi: '10.1234/minimal.123'
      }

      const result = generateBibtex(publication)

      expect(result).toContain('@misc{10.1234/minimal.123')
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

    it('should generate clean citation keys from DOIs', () => {
      const publication = {
        title: 'Test Paper',
        doi: '10.1234/test_paper_2023'
      }

      const result = generateBibtex(publication)

      expect(result).toContain('@misc{10.1234/testpaper2023,')
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
})
