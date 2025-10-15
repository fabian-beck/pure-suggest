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

    // Allow empty keywords array - citations can still form concepts
    const context = this.buildContext(publications, boostKeywords || [])

    // Return empty if no attributes at all (no keywords and no citations)
    if (context.attributes.length === 0) {
      return []
    }

    return this._extractFormalConcepts(context)
  }

  /**
   * Builds binary context matrix (publications × attributes)
   * Attributes include both keywords and citation relationships
   * @param {Array} publications - Array of publication objects
   * @param {string[]} boostKeywords - Array of boost keyword strings
   * @returns {Object} Context object with publications, attributes, and matrix
   */
  static buildContext(publications, boostKeywords) {
    // Create set of selected publication DOIs for filtering
    const selectedDois = new Set(publications.map((pub) => pub.doi))

    // Count citations for each selected publication
    const citationCounts = new Map()
    selectedDois.forEach((doi) => citationCounts.set(doi, 0))

    publications.forEach((publication) => {
      ;(publication.citationDois || []).forEach((doi) => {
        if (selectedDois.has(doi)) {
          citationCounts.set(doi, citationCounts.get(doi) + 1)
        }
      })
      ;(publication.referenceDois || []).forEach((doi) => {
        if (selectedDois.has(doi)) {
          citationCounts.set(doi, citationCounts.get(doi) + 1)
        }
      })
    })

    // Get top 10 most cited publications as attributes (exclude those with 0 citations)
    const topCitedDois = Array.from(citationCounts.entries())
      .filter((entry) => entry[1] > 0) // Only include DOIs with at least 1 citation
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .slice(0, 10) // Take top 10
      .map((entry) => entry[0])

    // Combine keywords and top citation DOIs as attributes
    const attributes = [...boostKeywords, ...topCitedDois]

    // Build binary matrix
    const matrix = []
    publications.forEach((publication) => {
      const row = []

      // Match keywords
      const matches = findKeywordMatches(publication.title, boostKeywords)
      const matchedKeywords = matches.map((match) => match.keyword)

      // Check each attribute
      attributes.forEach((attribute) => {
        if (boostKeywords.includes(attribute)) {
          // Keyword attribute
          row.push(matchedKeywords.includes(attribute))
        } else {
          // Citation attribute - check if publication cites or is cited by this DOI
          const hasCitation = (publication.citationDois || []).includes(attribute)
          const hasReference = (publication.referenceDois || []).includes(attribute)
          row.push(hasCitation || hasReference)
        }
      })

      matrix.push(row)
    })

    return {
      publications: publications.map((pub) => pub.doi),
      attributes,
      matrix
    }
  }

  /**
   * Extracts all formal concepts using FCA algorithm
   * @private
   * @param {Object} context - Context object with publications, attributes, and matrix
   * @returns {Array} Array of formal concepts
   */
  static _extractFormalConcepts(context) {
    const concepts = []
    const { publications, attributes, matrix } = context

    // Generate all possible attribute subsets (power set)
    const attributeSubsets = this._powerSet(attributes)

    attributeSubsets.forEach((attributeSet) => {
      // Find publications that have all attributes in the set (extent)
      const extent = this._computeExtent(attributeSet, publications, attributes, matrix)

      // Find all attributes shared by these publications (intent)
      const intent = this._computeIntent(extent, publications, attributes, matrix)

      // Check if this is a formal concept (closure property)
      if (this._isEqualSet(attributeSet, intent)) {
        concepts.push({
          publications: extent.sort(),
          attributes: attributeSet.sort()
        })
      }
    })

    // Remove duplicate concepts
    return this._removeDuplicateConcepts(concepts)
  }

  /**
   * Computes extent: publications that have all attributes in the set
   * @private
   */
  static _computeExtent(attributeSet, publications, attributes, matrix) {
    const extent = []

    publications.forEach((doi, pubIndex) => {
      const hasAllAttributes = attributeSet.every((attribute) => {
        const attrIndex = attributes.indexOf(attribute)
        return matrix[pubIndex][attrIndex]
      })

      if (hasAllAttributes) {
        extent.push(doi)
      }
    })

    return extent
  }

  /**
   * Computes intent: attributes shared by all publications in the set
   * @private
   */
  static _computeIntent(publicationSet, publications, attributes, matrix) {
    if (publicationSet.length === 0) {
      return attributes.slice() // All attributes if no publications
    }

    const intent = []

    attributes.forEach((attribute, attrIndex) => {
      const allHaveAttribute = publicationSet.every((doi) => {
        const pubIndex = publications.indexOf(doi)
        return matrix[pubIndex][attrIndex]
      })

      if (allHaveAttribute) {
        intent.push(attribute)
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
        attrs: concept.attributes.sort()
      })

      if (!seen.has(key)) {
        seen.add(key)
        unique.push(concept)
      }
    })

    return unique
  }

  /**
   * Sorts concepts using greedy algorithm based on remaining importance
   * Iteratively picks concepts that cover the most uncovered publications
   * @param {Array} concepts - Array of formal concepts
   * @returns {Array} Sorted array with importance and remaining importance
   */
  static sortConceptsByImportance(concepts) {
    if (!concepts || concepts.length === 0) {
      return []
    }

    // Filter out concepts with only one publication and calculate initial importance
    const allConcepts = concepts
      .filter((concept) => concept.publications.length > 1)
      .map((concept) => ({
        ...concept,
        importance: concept.publications.length * concept.attributes.length,
        remainingImportance: 0
      }))

    if (allConcepts.length === 0) {
      return []
    }

    // Start greedy selection
    const result = []
    const remaining = [...allConcepts]
    const coveredPublications = new Set()

    // Pick first concept by highest initial importance
    remaining.sort((a, b) => b.importance - a.importance)
    const firstConcept = remaining.shift()
    firstConcept.remainingImportance = firstConcept.importance
    firstConcept.publications.forEach((pub) => coveredPublications.add(pub))
    result.push(firstConcept)

    // Iteratively pick concepts with highest remaining importance
    while (remaining.length > 0) {
      // Recompute remaining importance for all remaining concepts
      remaining.forEach((concept) => {
        const uncoveredPubs = concept.publications.filter((pub) => !coveredPublications.has(pub))
        concept.remainingImportance = uncoveredPubs.length * concept.attributes.length
      })

      // Sort by remaining importance
      remaining.sort((a, b) => b.remainingImportance - a.remainingImportance)

      // Pick top concept
      const topConcept = remaining.shift()

      // Skip concepts with zero remaining importance
      if (topConcept.remainingImportance === 0) {
        break
      }

      // Add publications to covered set
      topConcept.publications.forEach((pub) => coveredPublications.add(pub))
      result.push(topConcept)
    }

    return result
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

    // Sort by importance and limit to top 10
    const sortedConcepts = this.sortConceptsByImportance(concepts)
    const conceptsToShow = sortedConcepts.slice(0, 10)
    const totalCount = concepts.length

    // Update header to indicate if showing subset
    if (totalCount > 10) {
      console.log(`\n[FCA] Formal Concept Analysis Results: Top 10 concepts (${totalCount} total)`)
    } else {
      console.log(`\n[FCA] Formal Concept Analysis Results: ${totalCount} concepts found`)
    }

    console.log('═'.repeat(80))

    conceptsToShow.forEach((concept, index) => {
      const pubCount = concept.publications.length
      const attrCount = concept.attributes.length

      // Separate keywords from citation DOIs
      const keywords = concept.attributes.filter((attr) => !attr.startsWith('10.'))
      const citations = concept.attributes.filter((attr) => attr.startsWith('10.'))

      console.log(`\nConcept ${index + 1}:`)
      console.log(
        `  Importance: ${concept.importance} (${pubCount} publications × ${attrCount} attributes)`
      )
      console.log(`  Remaining Importance: ${concept.remainingImportance}`)
      console.log(`  Publications (${pubCount}): ${pubCount === 0 ? '∅' : concept.publications.join(', ')}`)
      console.log(`  Keywords (${keywords.length}): ${keywords.length === 0 ? '∅' : keywords.join(', ')}`)
      console.log(`  Citations (${citations.length}): ${citations.length === 0 ? '∅' : citations.join(', ')}`)
    })

    console.log(`\n${'═'.repeat(80)}`)
  }
}
