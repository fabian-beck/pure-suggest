import { describe, it, expect } from 'vitest'
import { generateBibtex } from '@/utils/bibtex.js'

describe('generateBibtex', () => {
  it('should generate article bibtex for publication with volume', () => {
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
    expect(result).toContain('booktitle = {Proceedings of the International Conference on Software Testing}')
    expect(result).not.toContain('journal =')
    expect(result).not.toContain('volume =')
  })

  it('should protect acronyms in title', () => {
    const publication = {
      title: 'API Testing with REST Services',
      author: 'Bob Wilson',
      year: '2023',
      doi: '10.1234/test.456'
    }

    const result = generateBibtex(publication)

    expect(result).toContain('title = {{API} Testing with {REST} Services}')
  })

  it('should handle special characters in title', () => {
    const publication = {
      title: 'Testing &amp; Validation &lt;Framework&gt;',
      author: 'Carol Brown',
      year: '2023',
      doi: '10.1234/special.789'
    }

    const result = generateBibtex(publication)

    expect(result).toContain('title = {Testing \\& Validation {\\textless}Framework{\\textgreater}}')
  })

  it('should handle missing optional fields gracefully', () => {
    const publication = {
      title: 'Minimal Publication',
      doi: '10.1234/minimal.123'
    }

    const result = generateBibtex(publication)

    expect(result).toContain('@misc{10.1234/minimal.123')
    expect(result).toContain('title = {Minimal Publication}')
    expect(result).toContain('doi = {10.1234/minimal.123}')
    expect(result).not.toContain('author =')
    expect(result).not.toContain('year =')
  })

  it('should detect workshop as inproceedings type', () => {
    const publication = {
      title: 'Workshop Paper',
      container: 'Workshop on Testing Techniques',
      doi: '10.1234/workshop.456'
    }

    const result = generateBibtex(publication)

    expect(result).toContain('@inproceedings{')
    expect(result).toContain('booktitle = {Workshop on Testing Techniques}')
  })

  // Tricky edge cases
  it('should handle DOI with underscores in citation key', () => {
    const publication = {
      title: 'Test Paper',
      doi: '10.1234/test_paper_2023'
    }

    const result = generateBibtex(publication)

    expect(result).toContain('@misc{10.1234/testpaper2023,')
    expect(result).toContain('doi = {10.1234/test_paper_2023}')
  })

  it('should handle multiple semicolons in author field', () => {
    const publication = {
      title: 'Multi-Author Paper',
      author: 'Alice Smith;Bob Jones; Carol Brown;Dave Wilson',
      doi: '10.1234/multi.123'
    }

    const result = generateBibtex(publication)

    expect(result).toContain('author = {Alice Smith and Bob Jones and Carol Brown and Dave Wilson}')
  })

  it('should handle empty strings gracefully', () => {
    const publication = {
      title: '',
      author: '',
      year: '',
      container: '',
      doi: '10.1234/empty.456'
    }

    const result = generateBibtex(publication)

    expect(result).toContain('@misc{10.1234/empty.456')
    expect(result).not.toContain('title =')
    expect(result).not.toContain('author =')
    expect(result).not.toContain('year =')
  })

  it('should handle complex special characters and HTML entities', () => {
    const publication = {
      title: 'Testing &quot;Quotes&quot; &amp; &lt;Tags&gt; &apos;Apostrophes&apos; &nbsp;Spaces',
      author: 'João São &amp; María Ñoño',
      doi: '10.1234/complex.789'
    }

    const result = generateBibtex(publication)

    expect(result).toContain('title = {Testing \\\"Quotes\\\" \\& {\\textless}Tags{\\textgreater} \'Apostrophes\'  Spaces}')
    expect(result).toContain('author = {João São \\& María Ñoño}')
  })

  it('should detect all conference keywords case-insensitively', () => {
    const testCases = [
      { container: 'PROCEEDINGS of the Conference', expected: '@inproceedings{' },
      { container: 'International CONFERENCE on AI', expected: '@inproceedings{' },
      { container: 'SYMPOSIUM on Software Engineering', expected: '@inproceedings{' },
      { container: 'workshop ON Testing', expected: '@inproceedings{' },
      { container: 'Journal of Software Engineering', expected: '@incollection{' }
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

  it('should protect multiple acronyms in complex title', () => {
    const publication = {
      title: 'Using AI and ML for REST API Testing in IoT Systems with GPU Acceleration',
      doi: '10.1234/acronyms.456'
    }

    const result = generateBibtex(publication)

    expect(result).toContain('title = {Using {AI} and {ML} for {REST} {API} Testing in {IoT} Systems with {GPU} Acceleration}')
  })

  it('should handle edge case with only volume but no container', () => {
    const publication = {
      title: 'Orphaned Volume',
      volume: '42',
      doi: '10.1234/orphan.123'
    }

    const result = generateBibtex(publication)

    expect(result).toContain('@article{')
    expect(result).toContain('volume = {42}')
    expect(result).toContain('journal = {}')
  })

  it('should handle null and undefined values', () => {
    const publication = {
      title: 'Valid Title',
      author: null,
      year: undefined,
      container: null,
      volume: undefined,
      doi: '10.1234/nulls.789'
    }

    const result = generateBibtex(publication)

    expect(result).toContain('title = {Valid Title}')
    expect(result).not.toContain('author =')
    expect(result).not.toContain('year =')
    expect(result).not.toContain('journal =')
    expect(result).not.toContain('volume =')
  })

  it('should handle extremely long DOI with special characters', () => {
    const publication = {
      title: 'Long DOI Test',
      doi: '10.1234/very_long_doi_with-hyphens.and.dots/and_underscores_2023_v1.0'
    }

    const result = generateBibtex(publication)

    expect(result).toContain('@misc{10.1234/verylongdoiwithhyphens.and.dots/andunderscores2023v1.0,')
    expect(result).toContain('doi = {10.1234/very_long_doi_with-hyphens.and.dots/and_underscores_2023_v1.0}')
  })
})