import Publication from './Publication.js'
import { API_ENDPOINTS, API_PARAMS } from '../constants/config.js'
import { cachedFetch } from '../lib/Cache.js'

// DOI prefix ("10." + registrant code + "/"); see https://www.doi.org/doi_handbook/2_Numbering.html
const DOI_PREFIX = /10\.\d{4,9}(?:\.\d+)*\//
// DOI suffix up to a character that cannot be part of a DOI in the given context (quotes and
// braces from BibTeX/HTML, query strings or fragments from URLs); old-style DOIs may contain
// "<...>" groups, which are distinguished from closing HTML tags by not starting with "/"
const DOI_SUFFIX = /^(?:[^\s"'{}<>?#]|<[^\s"'{}<>/]+>)+/
// A whitespace-separated token that may continue a DOI broken by a line break or space
const DOI_CONTINUATION = /^[A-Za-z0-9][A-Za-z0-9._\-():]*/
const LIST_NUMBER = /^\d{1,3}[.)]$/
const YEAR = /^(?:19|20)\d{2}$/

/**
 * Extracts all DOIs from arbitrary text, such as a pasted reference list, in order of appearance.
 * Handles DOI URLs and prefixes, BibTeX and HTML markup, URL encoding, and DOIs broken by line
 * breaks or spaces (e.g., when copied from a PDF).
 * @param {string} text - The text to scan.
 * @returns {string[]} Unique DOIs (compared case-insensitively).
 */
export function extractDois(text) {
  const normalized = text
    .replace(/\\_/g, '_')
    .replace(/%[0-9A-Fa-f]{2}/g, (encoded) => {
      try {
        return decodeURIComponent(encoded)
      } catch {
        return encoded
      }
    })
    // whitespace within the DOI prefix, e.g. "10. 1109/" or "10.1109 / TVCG"
    .replace(/(?<![\d.])10\.\s+(?=\d{4,9}\/)/g, '10.')
    .replace(/(10\.\d{4,9}(?:\.\d+)*)\s*\/\s*/g, '$1/')
  const tokens = normalized.split(/\s+/)
  const dois = []
  const seen = new Set()
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i]
    let prefix = DOI_PREFIX.exec(token)
    while (prefix) {
      const rest = token.slice(prefix.index + prefix[0].length)
      let suffix = DOI_SUFFIX.exec(rest)?.[0] ?? ''
      // DOIs separated by "," or ";" without whitespace
      const nextPrefix = /[,;]10\.\d{4,9}(?:\.\d+)*\//.exec(suffix)
      if (nextPrefix) {
        suffix = suffix.slice(0, nextPrefix.index)
      }
      let doi = prefix[0] + suffix
      token = rest.slice(suffix.length)
      // DOI broken by whitespace: continue with the following tokens while they look like DOI parts
      while (!token && i + 1 < tokens.length && continuesDoi(doi, tokens[i + 1])) {
        const continuation = DOI_CONTINUATION.exec(tokens[++i])[0]
        doi += continuation
        token = tokens[i].slice(continuation.length)
      }
      doi = cleanDoi(doi)
      if (doi.length > prefix[0].length && !seen.has(doi.toLowerCase())) {
        seen.add(doi.toLowerCase())
        dois.push(doi)
      }
      prefix = DOI_PREFIX.exec(token)
    }
  }
  return dois
}

function continuesDoi(doi, next) {
  const continuation = DOI_CONTINUATION.exec(next)?.[0]
  if (
    !continuation ||
    DOI_PREFIX.test(continuation) ||
    !/^[.,;:)\]}"']*$/.test(next.slice(continuation.length)) ||
    LIST_NUMBER.test(next) ||
    YEAR.test(continuation)
  ) {
    return false
  }
  // after characters that cannot end a DOI, any DOI-like token continues it; otherwise only digits
  return /[-/_(:]$/.test(doi) || /^\d/.test(continuation)
}

// Removes trailing punctuation and unbalanced closing brackets that belong to the surrounding text
function cleanDoi(doi) {
  let cleaned = doi
  while (
    /[.,;:\]]$/.test(cleaned) ||
    (cleaned.endsWith(')') && cleaned.split(')').length > cleaned.split('(').length)
  ) {
    cleaned = cleaned.slice(0, -1)
  }
  return cleaned
}

export default class PublicationSearch {
  constructor(query) {
    this.query = query
  }

  async execute(onProgress) {
    const results = extractDois(this.query).map((doi) => new Publication(doi))
    if (results.length) {
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
