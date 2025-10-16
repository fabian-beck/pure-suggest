import { findKeywordMatches } from '@/utils/scoringUtils.js'

/**
 * Common English stopwords for text processing
 */
const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with'
])

/**
 * Simple stemmer using basic suffix removal rules
 * @param {string} word - Word to stem
 * @returns {string} Stemmed word
 */
function stem(word) {
  word = word.toLowerCase()

  // Remove common suffixes
  if (word.endsWith('ies') && word.length > 4) {
    return `${word.slice(0, -3)}y`
  }
  if (word.endsWith('es') && word.length > 3) {
    return word.slice(0, -2)
  }
  if (word.endsWith('s') && word.length > 2) {
    return word.slice(0, -1)
  }
  if (word.endsWith('ed') && word.length > 3) {
    return word.slice(0, -2)
  }
  if (word.endsWith('ing') && word.length > 4) {
    return word.slice(0, -3)
  }

  return word
}

/**
 * Tokenizes text into words, removes stopwords, and applies stemming
 * @param {string} text - Text to process
 * @returns {string[]} Array of processed tokens
 */
function tokenize(text) {
  if (!text) return []

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .map((word) => stem(word))
}

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
   * Generates concept names from TF-IDF terms
   * @param {Array} concepts - Array of formal concepts
   * @param {Array} allPublications - All publication objects
   * @returns {Map} Map of concept index to concept name
   */
  static generateConceptNames(concepts, allPublications) {
    const nameMap = new Map()

    if (!allPublications || allPublications.length === 0) {
      // Fallback to concept numbers only
      concepts.forEach((concept, index) => {
        nameMap.set(index, `C${index + 1}`)
      })
      return nameMap
    }

    concepts.forEach((concept, index) => {
      const topTerms = this.computeConceptTerms(
        concept.publications,
        allPublications,
        concept.attributes
      )

      if (topTerms.length === 0) {
        nameMap.set(index, `C${index + 1}`)
        return
      }

      // Check if top score is tied with other terms
      const topScore = topTerms[0].score
      const tiedTerms = topTerms.filter((t) => Math.abs(t.score - topScore) < 0.0001)

      if (tiedTerms.length > 1) {
        // Multiple terms with same score - too arbitrary to pick one
        nameMap.set(index, `C${index + 1}`)
      } else {
        // Clear winner
        nameMap.set(index, `C${index + 1} - ${topTerms[0].term.toUpperCase()}`)
      }
    })

    return nameMap
  }

  /**
   * Assigns concept tags to publications based on their membership in concepts
   * @param {Array} publications - Array of publication objects to tag
   * @param {Array} concepts - Array of formal concepts (sorted by importance)
   * @returns {Map} Map of DOI to array of concept names
   */
  static assignConceptTags(publications, concepts) {
    const tagMap = new Map()

    // Sort concepts by importance
    const sortedConcepts = this.sortConceptsByImportance(concepts)

    // Generate concept names
    const conceptNames = this.generateConceptNames(sortedConcepts, publications)

    // Assign each publication to the concepts it belongs to
    sortedConcepts.forEach((concept, index) => {
      const conceptName = conceptNames.get(index)
      concept.publications.forEach((doi) => {
        if (!tagMap.has(doi)) {
          tagMap.set(doi, [])
        }
        tagMap.get(doi).push(conceptName)
      })
    })

    // Update publication objects with concept tags
    publications.forEach((publication) => {
      const conceptNames = tagMap.get(publication.doi) || []
      if (conceptNames.length > 0) {
        publication.fcaConcepts = conceptNames
      } else {
        publication.fcaConcepts = null
      }
    })

    return tagMap
  }

  /**
   * Computes TF-IDF scores for terms in a concept's publications
   * @param {Array} conceptPublications - Array of publication DOIs in the concept
   * @param {Array} allPublications - All publication objects
   * @param {Array} conceptAttributes - Array of attributes (keywords and citation DOIs) for the concept
   * @returns {Array} Array of {term, score} objects sorted by score descending
   */
  static computeConceptTerms(conceptPublications, allPublications, conceptAttributes = []) {
    // Build a map of DOI to publication for quick lookup
    const pubMap = new Map(allPublications.map((pub) => [pub.doi, pub]))

    // Get titles of publications in this concept
    const conceptTitles = conceptPublications
      .map((doi) => pubMap.get(doi)?.title)
      .filter((title) => title)

    if (conceptTitles.length === 0) {
      return []
    }

    // Extract keywords (non-DOI attributes) and expand alternatives (pipe-separated)
    const keywords = conceptAttributes.filter((attr) => !attr.startsWith('10.'))
    const keywordAlternatives = []
    keywords.forEach((keyword) => {
      // Split by pipe to handle alternatives like "vis|graph"
      const alternatives = keyword.split('|').filter((alt) => alt.trim())
      alternatives.forEach((alternative) => {
        keywordAlternatives.push(alternative.toUpperCase())
      })
    })

    // Tokenize concept titles (bag of words)
    const conceptTokens = conceptTitles.flatMap((title) => tokenize(title))

    // Count term frequency in concept, doubling frequency for keyword matches
    // Match using substring logic similar to findKeywordMatches
    const termFreq = new Map()
    conceptTokens.forEach((term) => {
      let isKeywordMatch = false

      // Check if this term matches any keyword alternative
      for (const keyword of keywordAlternatives) {
        if (keyword.length <= 3) {
          // Word boundary match for short keywords - check if term starts with keyword
          if (term.toUpperCase().startsWith(keyword)) {
            isKeywordMatch = true
            break
          }
        } else {
          // Substring match for longer keywords
          if (term.toUpperCase().includes(keyword)) {
            isKeywordMatch = true
            break
          }
        }
      }

      const increment = isKeywordMatch ? 2 : 1
      termFreq.set(term, (termFreq.get(term) || 0) + increment)
    })

    // Count document frequency across all publications
    const docFreq = new Map()
    allPublications.forEach((pub) => {
      const tokens = new Set(tokenize(pub.title))
      tokens.forEach((term) => {
        docFreq.set(term, (docFreq.get(term) || 0) + 1)
      })
    })

    const totalDocs = allPublications.length

    // Compute TF-IDF for each term
    const tfidfScores = []
    termFreq.forEach((tf, term) => {
      const df = docFreq.get(term) || 1
      const idf = Math.log(totalDocs / df)
      const tfidf = tf * idf
      tfidfScores.push({ term, score: tfidf })
    })

    // Sort by score descending
    return tfidfScores.sort((a, b) => b.score - a.score)
  }

  /**
   * Logs formal concepts to console with TF-IDF based descriptive terms
   * @param {Array} concepts - Array of formal concepts
   * @param {Array} allPublications - All publication objects
   */
  static logFormalConcepts(concepts, allPublications = []) {
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

      // Compute and display top TF-IDF terms if publications available
      if (allPublications.length > 0 && concept.publications.length > 0) {
        const topTerms = this.computeConceptTerms(
          concept.publications,
          allPublications,
          concept.attributes
        )
        const top10 = topTerms.slice(0, 10)
        if (top10.length > 0) {
          const termString = top10.map((t) => `${t.term} (${t.score.toFixed(2)})`).join(', ')
          console.log(`  Top Terms: ${termString}`)
        }
      }
    })

    console.log(`\n${'═'.repeat(80)}`)
  }
}
