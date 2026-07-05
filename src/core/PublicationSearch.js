import Publication from './Publication.js'
import { API_ENDPOINTS, API_PARAMS } from '../constants/config.js'
import { cachedFetch } from '../lib/Cache.js'

export default class PublicationSearch {
  constructor(query) {
    this.query = query
  }

  async execute(onProgress) {
    const dois = []
    const results = []
    // removing whitespace (e.g., through line breaks) in DOIs
    this.query = this.query.replace(/(10\.\d+\/)\s?(\S{0,12})\s([^[])/g, '$1$2$3')
    // splitting query by characters that must (or partly: should) be encoded differently in DOIs or by typical prefixes
    // see: https://www.doi.org/doi_handbook/2_Numbering.html
    // "\{|\}" necessary to read DOIs from BibTeX
    this.query.split(/ |"|%|#|\?|\{|\}|doi:|doi.org\//).forEach((doi) => {
      // cutting characters that might be included in DOI, but very unlikely at the end
      doi = doi
        .trim()
        // eslint-disable-next-line sonarjs/super-linear-regex -- safe on short DOI tokens
        .replace(/^[.,;]+/, '').replace(/[.,;]+$/, '')
        .replace('\\_', '_')
      if (doi.indexOf('10.') === 0 && !dois.includes(doi)) {
        dois.push(doi)
        results.push(new Publication(doi))
      }
    })
    if (dois.length) {
      console.log(`Identified ${results.length} DOI(s) in input; do not perform search.`)
      await this.fetchAll(results, onProgress)
      return { results, type: 'doi' }
    }

    console.log(`Searching for publications matching '${this.query}' using both OpenAlex and CrossRef.`)

    // Search both APIs in parallel and merge results
    await Promise.all([
      this.searchOpenAlex(results),
      this.searchCrossRef(results)
    ])

    // Remove duplicates, then load metadata before ranking so scores are based on fetched data
    const uniqueResults = this.removeDuplicates(results)
    await this.fetchAll(uniqueResults, onProgress)
    const rankedResults = this.rankResults(uniqueResults)

    return { results: rankedResults, type: 'search' }
  }

  /**
   * Loads metadata for all result publications in chunked bulk requests,
   * reporting progress after each loaded publication.
   */
  async fetchAll(publications, onProgress) {
    let loaded = 0
    await Publication.fetchAll(publications, () => onProgress?.(++loaded, publications.length))
  }

  async searchCrossRef(results) {
    const simplifiedQuery = this.query.replace(/\W+/g, '+').toLowerCase()
    await cachedFetch(
      `${API_ENDPOINTS.CROSSREF}?query=${simplifiedQuery}&mailto=${API_PARAMS.CROSSREF_EMAIL}&filter=${API_PARAMS.CROSSREF_FILTER}&sort=${API_PARAMS.CROSSREF_SORT}&order=desc`,
      (data) => {
        data.message.items
          .filter((item) => item.title)
          .forEach((item) => {
            results.push(new Publication(item.DOI))
          })
      }
    )
  }

  async searchOpenAlex(results) {
    const simplifiedQuery = encodeURIComponent(this.query)
    await cachedFetch(
      `${API_ENDPOINTS.OPENALEX}?search=${simplifiedQuery}&filter=has_doi:true&per_page=20&mailto=${API_PARAMS.OPENALEX_EMAIL}`,
      (data) => {
        data.results
          .filter((item) => item.doi)
          .forEach((item) => {
            // Extract DOI from the full URL (OpenAlex returns it as https://doi.org/...)
            const doi = item.doi.replace('https://doi.org/', '')
            results.push(new Publication(doi))
          })
      }
    )
  }

  removeDuplicates(results) {
    const seenDois = new Set()
    return results.filter((publication) => {
      const normalizedDoi = publication.doi.toLowerCase()
      if (seenDois.has(normalizedDoi)) {
        return false
      }
      seenDois.add(normalizedDoi)
      return true
    })
  }

  rankResults(results) {
    const queryWords = this.extractWords(this.query)
    
    // Calculate match scores for each publication
    const scoredResults = results.map((publication) => {
      const score = this.calculateMatchScore(publication, queryWords)
      return { publication, score }
    })
    
    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score)
    
    return scoredResults.map((item) => item.publication)
  }

  extractWords(text) {
    // Normalize and extract words (3+ characters for meaningful matching)
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 3)
  }

  calculateMatchScore(publication, queryWords) {
    let score = 0
    
    // Weight factors for different fields
    const TITLE_WEIGHT = 3
    const AUTHOR_WEIGHT = 2
    const VENUE_WEIGHT = 1
    
    const titleWords = this.extractWords(publication.title || '')
    const authorWords = this.extractWords(publication.author || '')
    const venueWords = this.extractWords(publication.container || '')
    
    queryWords.forEach((queryWord) => {
      // Count matches in title
      const titleMatches = titleWords.filter((word) => word === queryWord).length
      score += titleMatches * TITLE_WEIGHT
      
      // Count matches in authors
      const authorMatches = authorWords.filter((word) => word === queryWord).length
      score += authorMatches * AUTHOR_WEIGHT
      
      // Count matches in venue
      const venueMatches = venueWords.filter((word) => word === queryWord).length
      score += venueMatches * VENUE_WEIGHT
    })
    
    return score
  }
}
