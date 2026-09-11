import { describe, it, expect } from 'vitest'

import ieeeReferenceList from './fixtures/ieee-reference-list.txt?raw'
import springerReferenceList from './fixtures/springer-reference-list.txt?raw'

import { extractDois } from '@/core/PublicationSearch.js'

describe('extractDois', () => {
  it('returns an empty list for text without DOIs', () => {
    expect(extractDois('visualization of citation networks')).toEqual([])
    expect(extractDois('')).toEqual([])
  })

  it('extracts DOIs from plain, prefixed, and URL forms', () => {
    expect(extractDois('10.1234/plain')).toEqual(['10.1234/plain'])
    expect(extractDois('doi:10.1234/prefixed')).toEqual(['10.1234/prefixed'])
    expect(extractDois('DOI: 10.1234/spaced-prefix')).toEqual(['10.1234/spaced-prefix'])
    expect(extractDois('https://doi.org/10.1234/url')).toEqual(['10.1234/url'])
    // eslint-disable-next-line sonarjs/no-clear-text-protocols -- legacy DOI links in references use http
    expect(extractDois('http://dx.doi.org/10.1234/dx-url')).toEqual(['10.1234/dx-url'])
    expect(extractDois('DOI:https://doi.org/10.1145/3290605.3300286')).toEqual([
      '10.1145/3290605.3300286'
    ])
  })

  it('strips surrounding punctuation and brackets', () => {
    expect(extractDois('see 10.1234/abc.')).toEqual(['10.1234/abc'])
    expect(extractDois('(https://doi.org/10.1234/abc).')).toEqual(['10.1234/abc'])
    expect(extractDois('[10.1234/abc],')).toEqual(['10.1234/abc'])
    expect(extractDois('<https://doi.org/10.1234/abc>')).toEqual(['10.1234/abc'])
    expect(extractDois('"10.1234/abc";')).toEqual(['10.1234/abc'])
  })

  it('keeps balanced parentheses that are part of the DOI', () => {
    expect(extractDois('10.1016/S0140-6736(20)30183-5')).toEqual(['10.1016/S0140-6736(20)30183-5'])
    expect(extractDois('(10.1016/S0140-6736(20)30183-5)')).toEqual([
      '10.1016/S0140-6736(20)30183-5'
    ])
  })

  it('keeps old-style DOIs containing angle brackets and semicolons', () => {
    const doi = '10.1002/(SICI)1097-0258(19980430)17:8<857::AID-SIM777>3.0.CO;2-E'
    expect(extractDois(`${doi}.`)).toEqual([doi])
  })

  it('reads DOIs from BibTeX entries', () => {
    const bibtex = `@article{key,
      title = {Some Title},
      doi = {10.1234/bib\\_tex},
      url = {https://doi.org/10.1234/bib\\_tex}
    }
    @inproceedings{other, doi = "10.5678/quoted"}`
    expect(extractDois(bibtex)).toEqual(['10.1234/bib_tex', '10.5678/quoted'])
  })

  it('reads DOIs from HTML links', () => {
    expect(extractDois('<a href="https://doi.org/10.1234/html">10.1234/html</a>')).toEqual([
      '10.1234/html'
    ])
  })

  it('decodes URL-encoded DOIs', () => {
    expect(extractDois('https://doi.org/10.1002%2Fadma.201234')).toEqual(['10.1002/adma.201234'])
    expect(extractDois('https://doi.org/10.1016/S0140-6736%2820%2930183-5')).toEqual([
      '10.1016/S0140-6736(20)30183-5'
    ])
  })

  it('ignores URL query strings and fragments', () => {
    expect(extractDois('https://doi.org/10.1234/abc?via=ihub#section')).toEqual(['10.1234/abc'])
  })

  it('deduplicates DOIs case-insensitively', () => {
    expect(extractDois('10.1234/ABC https://doi.org/10.1234/abc doi:10.1234/Abc')).toEqual([
      '10.1234/ABC'
    ])
  })

  it('separates DOIs joined by commas or semicolons', () => {
    expect(extractDois('10.1234/a,10.5678/b;10.9012/c')).toEqual([
      '10.1234/a',
      '10.5678/b',
      '10.9012/c'
    ])
  })

  it('separates DOIs listed one per line', () => {
    expect(extractDois('10.1145/3290605.3300286\n10.1109/TVCG.2018.2865146\r\n10.1007/978-3-030-29387-1_12')).toEqual([
      '10.1145/3290605.3300286',
      '10.1109/TVCG.2018.2865146',
      '10.1007/978-3-030-29387-1_12'
    ])
  })

  describe('DOIs broken by line breaks or spaces', () => {
    it('joins a DOI wrapped after a hyphen, slash, or underscore', () => {
      expect(extractDois('https://doi.org/10.1007/978-3-030-\n29387-1_12')).toEqual([
        '10.1007/978-3-030-29387-1_12'
      ])
      expect(extractDois('10.1007/\nS11192-020-03690-4')).toEqual(['10.1007/S11192-020-03690-4'])
      expect(extractDois('10.1007/978-3-030-29387-1_ 12')).toEqual(['10.1007/978-3-030-29387-1_12'])
    })

    it('joins a DOI wrapped after a dot when the rest starts with digits', () => {
      expect(extractDois('doi: 10.1109/TVCG.\n2018.2865146.')).toEqual(['10.1109/TVCG.2018.2865146'])
      expect(extractDois('10.1109/TVCG.2019. 2934619')).toEqual(['10.1109/TVCG.2019.2934619'])
    })

    it('joins a DOI wrapped before a hyphen or dot', () => {
      expect(extractDois('10.1111/j.1467\n-8659.2011.01921.x')).toEqual(['10.1111/j.1467-8659.2011.01921.x'])
      expect(extractDois('10.1007/978\n-3-319-22723-8_17')).toEqual(['10.1007/978-3-319-22723-8_17'])
      expect(extractDois('10.1109/tvcg\n.2016.2610422')).toEqual(['10.1109/tvcg.2016.2610422'])
    })

    it('does not join page back-references following a DOI', () => {
      expect(extractDois('doi: 10.5281/zenodo.7123500 3')).toEqual(['10.5281/zenodo.7123500'])
      expect(extractDois('doi: 10.1109/access.2022.3153027\n2\n[25] A. Author')).toEqual([
        '10.1109/access.2022.3153027'
      ])
      expect(extractDois('doi: 10.1145/223904.\n223913 1, 2')).toEqual(['10.1145/223904.223913'])
    })

    it('joins a DOI wrapped more than once', () => {
      expect(extractDois('10.1007/978-3-\n030-29387-\n1_12')).toEqual(['10.1007/978-3-030-29387-1_12'])
    })

    it('joins DOIs with spaces inside the prefix', () => {
      expect(extractDois('doi: 10.\n1109/TVCG.2018.2865146')).toEqual(['10.1109/TVCG.2018.2865146'])
      expect(extractDois('doi: 10\n.1109/TVCG.2018.2865146')).toEqual(['10.1109/TVCG.2018.2865146'])
      expect(extractDois('10.1109 / TVCG.2018.2865146')).toEqual(['10.1109/TVCG.2018.2865146'])
      expect(extractDois('10.1109/ TVCG.2018.2865146')).toEqual(['10.1109/TVCG.2018.2865146'])
    })

    it('does not join the DOI with the start of the next reference', () => {
      expect(extractDois('10.1109/TVCG.2018.2865146.\n[2] B. Author')).toEqual(['10.1109/TVCG.2018.2865146'])
      expect(extractDois('10.1109/TVCG.2018.2865146.\n2. B. Author')).toEqual(['10.1109/TVCG.2018.2865146'])
      expect(extractDois('10.1109/TVCG.2018.2865146\n12. B. Author')).toEqual(['10.1109/TVCG.2018.2865146'])
      expect(extractDois('10.1109/TVCG.2018.2865146.\nSmith, J. (2020)')).toEqual(['10.1109/TVCG.2018.2865146'])
      expect(extractDois('10.1109/TVCG.2018.2865146\nAccessed: 2020')).toEqual(['10.1109/TVCG.2018.2865146'])
      expect(extractDois('10.1109/TVCG.2018.2865146\n2019, pp. 1-12')).toEqual(['10.1109/TVCG.2018.2865146'])
    })

    it('does not join two consecutive DOIs', () => {
      expect(extractDois('10.1007/978-3-030-\n10.1109/TVCG.2018.2865146')).toEqual([
        '10.1007/978-3-030-',
        '10.1109/TVCG.2018.2865146'
      ])
    })

    it('handles a wrapped DOI inside BibTeX braces', () => {
      expect(extractDois('doi = {10.1109/TVCG.\n2018.2865146},\n year = {2018}')).toEqual([
        '10.1109/TVCG.2018.2865146'
      ])
    })
  })

  it('extracts all DOIs from a reference list copied from an IEEE PDF', () => {
    const dois = extractDois(ieeeReferenceList)
    // [36] is interrupted by a page header/footer between "10." and the rest of the DOI
    expect(dois).toHaveLength(54)
    expect(dois).toContain('10.1109/tvcg.2015.2467757')
    expect(dois).toContain('10.1109/icdim.2009.5356798')
    expect(dois).toContain('10.1111/j.1467-8659.2011.01921.x')
    expect(dois).toContain('10.1016/j.knosys.2019.07.031')
    expect(dois).toContain('10.1109/access.2022.3153027')
    expect(dois).toContain('10.1109/tvcg.2016.2610422')
    expect(dois).toContain('10.1145/223904.223913')
    expect(dois).toContain('10.1007/978-3-319-22723-8_17')
    expect(dois).toContain('10.3390/informatics4020011')
    expect(dois).not.toContain('10.1145/3411763.3450389')
    expect(dois.every((doi) => /^10\.\d{4,5}\/[a-z0-9()._-]+(\/[a-z0-9]+)?$/i.test(doi))).toBe(true)
  })

  it('extracts all DOIs from a reference list copied from a Springer PDF', () => {
    const dois = extractDois(springerReferenceList)
    expect(dois).toHaveLength(36)
    expect(dois).toContain('10.1109/MCG.2009.6')
    expect(dois).toContain('10.1145/965145.801294')
    expect(dois).toContain('10.1111/j.1467-8659.2009.01667.x')
    expect(dois).toContain('10.1109/IV.2006.94')
    expect(dois).toContain('10.1145/642611.642681')
    expect(dois.every((doi) => /^10\.\d{4}\/[a-z0-9._-]+$/i.test(doi))).toBe(true)
  })

  it('extracts all DOIs from a dirty pasted reference list', () => {
    const text = `[1] A. Author and B. Author, "A paper title," IEEE Trans. Vis. Comput.
Graph., vol. 25, no. 1, pp. 1–10, 2019, doi: 10.1109/TVCG.2018.
2865146.
[2] C. Author, "Another title," in Proc. CHI, 2019, pp. 1–12. [Online].
Available: https://doi.org/10.1145/3290605.3300286
[3] D. Author. Book Chapter. Springer, 2019. https://doi.org/10.1007/978-3-030-
29387-1_12
4. E. Author (2020). Title. Journal, 1(2), 3–4. https://doi.org/10.1016/S0140-6736(20)30183-5.
5. F. Author (2021). Title. Journal. DOI:10.1002/adma.202100001
Smith J, et al. Title. Lancet. 2020;395:497-506. doi:10.1016/S0140-6736(20)30183-5
`
    expect(extractDois(text)).toEqual([
      '10.1109/TVCG.2018.2865146',
      '10.1145/3290605.3300286',
      '10.1007/978-3-030-29387-1_12',
      '10.1016/S0140-6736(20)30183-5',
      '10.1002/adma.202100001'
    ])
  })
})
