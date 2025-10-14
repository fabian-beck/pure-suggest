import { findKeywordMatches } from '@/utils/scoringUtils.js'

/**
 * Service for computing Formal Concept Analysis (FCA) on selected publications
 * Groups publications based on shared boost keywords
 */
export class FCAService {
  /**
   * Computes all formal concepts from publications and keywords
   * @param {Array} publications - Array of publication objects
   * @param {string[]} boostKeywords - Array of boost keyword strings
   * @returns {Array} Array of formal concepts
   */
  static computeFormalConcepts(publications, boostKeywords) {
    if (!publications || publications.length === 0) {
      return []
    }

    if (!boostKeywords || boostKeywords.length === 0) {
      return []
    }

    const context = this.buildContext(publications, boostKeywords)
    return this._extractFormalConcepts(context)
  }

  /**
   * Builds binary context matrix (publications × keywords)
   * @param {Array} publications - Array of publication objects
   * @param {string[]} boostKeywords - Array of boost keyword strings
   * @returns {Object} Context object with publications, keywords, and matrix
   */
  static buildContext(publications, boostKeywords) {
    const matrix = []

    publications.forEach((publication) => {
      const row = []
      const matches = findKeywordMatches(publication.title, boostKeywords)
      const matchedKeywords = matches.map((match) => match.keyword)

      boostKeywords.forEach((keyword) => {
        row.push(matchedKeywords.includes(keyword))
      })

      matrix.push(row)
    })

    return {
      publications: publications.map((pub) => pub.doi),
      keywords: boostKeywords,
      matrix
    }
  }

  /**
   * Extracts all formal concepts using FCA algorithm
   * @private
   * @param {Object} context - Context object with publications, keywords, and matrix
   * @returns {Array} Array of formal concepts
   */
  static _extractFormalConcepts(context) {
    const concepts = []
    const { publications, keywords, matrix } = context

    // Generate all possible keyword subsets (power set)
    const keywordSubsets = this._powerSet(keywords)

    keywordSubsets.forEach((keywordSet) => {
      // Find publications that have all keywords in the set (extent)
      const extent = this._computeExtent(keywordSet, publications, keywords, matrix)

      // Find all keywords shared by these publications (intent)
      const intent = this._computeIntent(extent, publications, keywords, matrix)

      // Check if this is a formal concept (closure property)
      if (this._isEqualSet(keywordSet, intent)) {
        concepts.push({
          publications: extent.sort(),
          keywords: keywordSet.sort()
        })
      }
    })

    // Remove duplicate concepts
    return this._removeDuplicateConcepts(concepts)
  }

  /**
   * Computes extent: publications that have all keywords in the set
   * @private
   */
  static _computeExtent(keywordSet, publications, keywords, matrix) {
    const extent = []

    publications.forEach((doi, pubIndex) => {
      const hasAllKeywords = keywordSet.every((keyword) => {
        const keyIndex = keywords.indexOf(keyword)
        return matrix[pubIndex][keyIndex]
      })

      if (hasAllKeywords) {
        extent.push(doi)
      }
    })

    return extent
  }

  /**
   * Computes intent: keywords shared by all publications in the set
   * @private
   */
  static _computeIntent(publicationSet, publications, keywords, matrix) {
    if (publicationSet.length === 0) {
      return keywords.slice() // All keywords if no publications
    }

    const intent = []

    keywords.forEach((keyword, keyIndex) => {
      const allHaveKeyword = publicationSet.every((doi) => {
        const pubIndex = publications.indexOf(doi)
        return matrix[pubIndex][keyIndex]
      })

      if (allHaveKeyword) {
        intent.push(keyword)
      }
    })

    return intent
  }

  /**
   * Generates power set (all subsets) of an array
   * @private
   */
  static _powerSet(array) {
    const result = [[]]

    for (const element of array) {
      const length = result.length
      for (let i = 0; i < length; i++) {
        result.push([...result[i], element])
      }
    }

    return result
  }

  /**
   * Checks if two sets are equal
   * @private
   */
  static _isEqualSet(set1, set2) {
    if (set1.length !== set2.length) return false

    const sorted1 = [...set1].sort()
    const sorted2 = [...set2].sort()

    return sorted1.every((val, index) => val === sorted2[index])
  }

  /**
   * Removes duplicate concepts
   * @private
   */
  static _removeDuplicateConcepts(concepts) {
    const seen = new Set()
    const unique = []

    concepts.forEach((concept) => {
      const key = JSON.stringify({
        pubs: concept.publications.sort(),
        keys: concept.keywords.sort()
      })

      if (!seen.has(key)) {
        seen.add(key)
        unique.push(concept)
      }
    })

    return unique
  }

  /**
   * Logs formal concepts to console
   * @param {Array} concepts - Array of formal concepts
   */
  static logFormalConcepts(concepts) {
    if (!concepts || concepts.length === 0) {
      console.log('[FCA] No formal concepts found.')
      return
    }

    console.log(`\n[FCA] Formal Concept Analysis Results: ${concepts.length} concepts found`)
    console.log('═'.repeat(80))

    concepts.forEach((concept, index) => {
      const pubCount = concept.publications.length
      const keyCount = concept.keywords.length

      console.log(`\nConcept ${index + 1}:`)
      console.log(`  Publications (${pubCount}): ${pubCount === 0 ? '∅' : concept.publications.join(', ')}`)
      console.log(`  Keywords (${keyCount}): ${keyCount === 0 ? '∅' : concept.keywords.join(', ')}`)
    })

    console.log(`\n${'═'.repeat(80)}`)
  }
}
