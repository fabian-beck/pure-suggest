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
})