import Author from '@/core/Author.js'
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
 * Service for computing concepts on selected publications
 * Groups publications based on shared boost keywords and citations
 */
export class ConceptService {
  /**
   * Computes all concepts from publications and keywords
   * @param {Array} publications - Array of publication objects
   * @param {string[]} boostKeywords - Array of boost keyword strings
   * @param {boolean} includeCitations - Whether to include citation attributes
   * @param {boolean} includeAuthors - Whether to include author attributes
   * @returns {Array} Array of concepts
   */
  static computeConcepts(publications, boostKeywords, includeCitations = true, includeAuthors = false) {
    if (!publications || publications.length === 0) {
      return []
    }

    // Allow empty keywords array - citations/authors can still form concepts
    const context = this.buildContext(publications, boostKeywords || [], includeCitations, includeAuthors)

    // Return empty if no attributes at all (no keywords, citations, or authors)
    if (context.attributes.length === 0) {
      return []
    }

    return this._extractConcepts(context)
  }

  /**
   * Builds binary context matrix (publications × attributes)
   * Attributes include keywords, citation relationships, and co-authors
   * @param {Array} publications - Array of publication objects
   * @param {string[]} boostKeywords - Array of boost keyword strings
   * @param {boolean} includeCitations - Whether to include citation attributes
   * @param {boolean} includeAuthors - Whether to include author attributes
   * @returns {Object} Context object with publications, attributes, and matrix
   */
  static buildContext(publications, boostKeywords, includeCitations = true, includeAuthors = false) {
    // Create set of selected publication DOIs for filtering
    const selectedDois = new Set(publications.map((pub) => pub.doi))

    let topCitedDois = []
    if (includeCitations) {
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
      topCitedDois = Array.from(citationCounts.entries())
        .filter((entry) => entry[1] > 0) // Only include DOIs with at least 1 citation
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .slice(0, 10) // Take top 10
        .map((entry) => entry[0])
    }

    let topAuthors = []
    if (includeAuthors) {
      // Use existing Author disambiguation logic
      // Note: The FCA algorithm will naturally only create concepts for authors appearing in 2+ publications
      const authors = Author.computePublicationsAuthors(publications, false, false, false)
      topAuthors = authors.slice(0, 10) // Take top 10 (already sorted by score/count)
    }

    // Author membership by disambiguated ID (handles ORCID annotations and merged name variants)
    const authorDoisById = new Map(
      topAuthors.map((author) => [author.id, new Set(author.publicationDois)])
    )

    // Combine keywords, citation DOIs, and authors as attributes (with type information)
    const attributes = [
      ...boostKeywords.map((keyword) => ({ type: 'keyword', value: keyword })),
      ...topCitedDois.map((doi) => ({ type: 'citation', value: doi })),
      ...topAuthors.map((author) => ({ type: 'author', value: author.id }))
    ]

    // Build binary matrix
    const matrix = []
    publications.forEach((publication) => {
      const row = []

      // Match keywords
      const matches = findKeywordMatches(publication.title, boostKeywords)
      const matchedKeywords = matches.map((match) => match.keyword)

      // Normalize citation DOIs (Sets on Publication objects, arrays elsewhere)
      const citationDois = new Set(publication.citationDois)
      const referenceDois = new Set(publication.referenceDois)

      // Check each attribute
      attributes.forEach((attribute) => {
        if (attribute.type === 'keyword') {
          // Keyword attribute
          row.push(matchedKeywords.includes(attribute.value))
        } else if (attribute.type === 'citation') {
          // Citation attribute - check if publication cites or is cited by this DOI, or is itself
          const isSelf = publication.doi === attribute.value
          row.push(isSelf || citationDois.has(attribute.value) || referenceDois.has(attribute.value))
        } else if (attribute.type === 'author') {
          // Author attribute - check if publication has this author
          row.push(authorDoisById.get(attribute.value).has(publication.doi))
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
   * Extracts all concepts using NextClosure algorithm (Ganter's algorithm)
   * More efficient than power set approach - O(|L| × n² × m) instead of O(2^n × m)
   * where |L| = number of concepts (typically << 2^n)
   * @private
   * @param {Object} context - Context object with publications, attributes, and matrix
   * @returns {Array} Array of concepts
   */
  static _extractConcepts(context) {
    const concepts = []
    const { publications, attributes, matrix } = context

    if (attributes.length === 0) {
      return concepts
    }

    // Start with empty intent (corresponds to top concept - all publications)
    let currentIntent = []

    while (currentIntent !== null) {
      // Compute closure of current intent
      const extent = this._computeExtent(currentIntent, publications, attributes, matrix)
      const closure = this._computeIntent(extent, publications, attributes, matrix)

      // Add concept (intent is already closed by construction of NextClosure)
      concepts.push({
        publications: extent.slice().sort(),
        attributes: closure.slice().sort()
      })

      // Generate next intent in lexicographic order, starting from the closed intent
      currentIntent = this._nextClosure(closure, attributes, publications, matrix)
    }

    return concepts
  }

  /**
   * Computes the next closure in lexicographic order (NextClosure algorithm step)
   * @private
   * @param {Array} closure - Closed intent of the current concept
   * @param {Array} attributes - All attributes
   * @param {Array} publications - All publications
   * @param {Array} matrix - Binary context matrix
   * @returns {Array|null} Next intent, or null if no more concepts exist
   */
  static _nextClosure(closure, attributes, publications, matrix) {
    const n = attributes.length
    let current = closure

    // Try to extend intent by adding attributes in reverse lexicographic order
    for (let i = n - 1; i >= 0; i--) {
      const attr = attributes[i]

      // Check if attribute is already in closure
      if (closure.includes(attr)) {
        // Remove this attribute and all attributes after it
        current = current.filter((a) => {
          const aIndex = attributes.indexOf(a)
          return aIndex < i
        })
      } else {
        // Try adding this attribute
        const candidate = [...current, attr].sort((a, b) => {
          return attributes.indexOf(a) - attributes.indexOf(b)
        })

        // Compute closure of candidate
        const candidateExtent = this._computeExtent(candidate, publications, attributes, matrix)
        const candidateClosure = this._computeIntent(
          candidateExtent,
          publications,
          attributes,
          matrix
        )

        // Check if this is the next closure (canonical test)
        // A set is canonical if adding attribute i doesn't introduce any attribute j < i
        let isCanonical = true
        for (const closedAttr of candidateClosure) {
          const closedIndex = attributes.indexOf(closedAttr)
          if (closedIndex < i && !candidate.includes(closedAttr)) {
            isCanonical = false
            break
          }
        }

        if (isCanonical) {
          return candidateClosure
        }
      }
    }

    // No more concepts
    return null
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
   * Sorts concepts using greedy algorithm based on remaining importance
   * Iteratively picks concepts that cover the most uncovered publications
   * @param {Array} concepts - Array of formal concepts
   * @param {number} totalPublications - Total number of publications for calculating max size
   * @returns {Array} Sorted array with importance and remaining importance
   */
  static sortConceptsByImportance(concepts, totalPublications = 0) {
    if (!concepts || concepts.length === 0) {
      return []
    }

    const minPublications = 3
    const maxPublications = totalPublications > 0 ? Math.floor(totalPublications / 2) : Infinity

    // Filter out concepts with fewer than minimum publications or more than half
    // Also skip concepts with 0 attributes (importance = 0)
    const allConcepts = concepts
      .filter(
        (concept) =>
          concept.publications.length >= minPublications &&
          concept.publications.length <= maxPublications &&
          concept.attributes.length > 0
      )
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

      // Skip concepts with remaining importance < 6 or less than half of original importance
      if (topConcept.remainingImportance < 6 || topConcept.remainingImportance < topConcept.importance / 2) {
        break
      }

      // Add publications to covered set
      topConcept.publications.forEach((pub) => coveredPublications.add(pub))
      result.push(topConcept)
    }

    return result
  }

  /**
   * Generates concept names and metadata from term scores
   * @param {Array} concepts - Array of formal concepts
   * @param {Array} allPublications - All publication objects
   * @returns {Map} Map of concept index to {name, exclusivityTerms, frequencyTerms} object
   */
  static generateConceptNames(concepts, allPublications) {
    const nameMap = new Map()

    if (!allPublications || allPublications.length === 0) {
      // Fallback to concept numbers only
      concepts.forEach((concept, index) => {
        nameMap.set(index, { name: `C${index + 1}`, exclusivityTerms: [], frequencyTerms: [] })
      })
      return nameMap
    }

    concepts.forEach((concept, index) => {
      const { exclusivityTerms, frequencyTerms } = this.computeConceptTerms(
        concept.publications,
        allPublications
      )

      const top10Exclusive = exclusivityTerms.slice(0, 10)
      const top10Frequent = frequencyTerms.slice(0, 10)

      // Filter to only characteristic terms (score >= 1) for naming
      const characteristicTerms = exclusivityTerms.filter((t) => t.score >= 1)

      if (characteristicTerms.length === 0) {
        nameMap.set(index, {
          name: `C${index + 1}`,
          exclusivityTerms: top10Exclusive,
          frequencyTerms: top10Frequent
        })
        return
      }

      // Check if top score is tied with other terms (among characteristic terms only)
      const topScore = characteristicTerms[0].score
      const tiedTerms = characteristicTerms.filter((t) => Math.abs(t.score - topScore) < 0.0001)

      if (tiedTerms.length === 2 && characteristicTerms.length >= 3) {
        // Two terms with same/similar score - check if third is clearly different
        const thirdScore = characteristicTerms[2].score
        const scoreDiff = topScore - thirdScore
        const relativeGap = topScore > 0 ? scoreDiff / topScore : 0

        // Use both terms if third term has clearly different score (>10% gap or absolute diff > 0.5)
        if (relativeGap > 0.1 || scoreDiff > 0.5) {
          const combinedLabel = `${tiedTerms[0].term.toUpperCase()}+${tiedTerms[1].term.toUpperCase()}`
          nameMap.set(index, {
            name: `C${index + 1} - ${combinedLabel}`,
            exclusivityTerms: top10Exclusive,
            frequencyTerms: top10Frequent
          })
        } else {
          // Third term is also similar - too arbitrary
          nameMap.set(index, {
            name: `C${index + 1}`,
            exclusivityTerms: top10Exclusive,
            frequencyTerms: top10Frequent
          })
        }
      } else if (tiedTerms.length > 2) {
        // More than two terms with same score - too arbitrary to pick
        nameMap.set(index, {
          name: `C${index + 1}`,
          exclusivityTerms: top10Exclusive,
          frequencyTerms: top10Frequent
        })
      } else {
        // Clear winner (single top term from characteristic terms)
        nameMap.set(index, {
          name: `C${index + 1} - ${characteristicTerms[0].term.toUpperCase()}`,
          exclusivityTerms: top10Exclusive,
          frequencyTerms: top10Frequent
        })
      }
    })

    return nameMap
  }

  /**
   * Computes term scores for a concept using exclusivity metric
   * @param {Array} conceptPublications - Array of publication DOIs in the concept
   * @param {Array} allPublications - All publication objects
   * @returns {Object} Object with exclusivityTerms and frequencyTerms arrays
   */
  static computeConceptTerms(conceptPublications, allPublications) {
    // Build a map of DOI to publication for quick lookup
    const pubMap = new Map(allPublications.map((pub) => [pub.doi, pub]))

    // Get titles of publications in this concept
    const conceptTitles = conceptPublications
      .map((doi) => pubMap.get(doi)?.title)
      .filter((title) => title)

    if (conceptTitles.length === 0) {
      return { exclusivityTerms: [], frequencyTerms: [] }
    }

    const conceptDois = new Set(conceptPublications)
    const outsidePublications = allPublications.filter((pub) => !conceptDois.has(pub.doi))

    // Step 1: Collect ALL raw terms from ALL publications (concept + outside)
    const allRawTerms = new Map()

    allPublications.forEach((pub) => {
      const tokens = tokenize(pub.title)
      tokens.forEach((term) => {
        allRawTerms.set(term, (allRawTerms.get(term) || 0) + 1)
      })
    })

    // Step 2: Build global term merge mapping (consistent across concept/outside)
    const termMergeMap = this._buildTermMergeMap(allRawTerms)

    // Step 3: Count merged term frequencies in concept and outside using the same mapping
    const mergedTermFreq = new Map()
    const mergedOutsideTermFreq = new Map()

    conceptTitles.forEach((title) => {
      const tokens = tokenize(title)
      tokens.forEach((rawTerm) => {
        const mergedTerm = termMergeMap.get(rawTerm) || rawTerm
        mergedTermFreq.set(mergedTerm, (mergedTermFreq.get(mergedTerm) || 0) + 1)
      })
    })

    outsidePublications.forEach((pub) => {
      const tokens = tokenize(pub.title)
      tokens.forEach((rawTerm) => {
        const mergedTerm = termMergeMap.get(rawTerm) || rawTerm
        mergedOutsideTermFreq.set(mergedTerm, (mergedOutsideTermFreq.get(mergedTerm) || 0) + 1)
      })
    })

    // Step 4: Count publications containing each merged term
    const pubsPerTerm = new Map()
    conceptTitles.forEach((title) => {
      const tokens = tokenize(title)
      const mergedTermsInTitle = new Set(
        tokens.map((rawTerm) => termMergeMap.get(rawTerm) || rawTerm)
      )
      mergedTermsInTitle.forEach((mergedTerm) => {
        pubsPerTerm.set(mergedTerm, (pubsPerTerm.get(mergedTerm) || 0) + 1)
      })
    })

    // Step 5: Filter and score terms
    const minPublications = Math.max(2, Math.ceil(conceptTitles.length * 0.2))

    const filteredTerms = []
    mergedTermFreq.forEach((inCount, term) => {
      const pubsWithTerm = pubsPerTerm.get(term) || 0

      if (pubsWithTerm >= minPublications) {
        const outCount = mergedOutsideTermFreq.get(term) || 0
        const score = inCount / (outCount + 1)
        filteredTerms.push({ term, score, inCount, outCount })
      }
    })

    return {
      exclusivityTerms: filteredTerms.slice().sort((a, b) => b.score - a.score),
      frequencyTerms: filteredTerms.slice().sort((a, b) => b.inCount - a.inCount)
    }
  }

  /**
   * Builds a global term merge mapping
   * @private
   * @param {Map} termFreq - Map of raw term to frequency
   * @returns {Map} Map of raw term to merged term
   */
  static _buildTermMergeMap(termFreq) {
    const MIN_PREFIX_LENGTH = 5
    const terms = Array.from(termFreq.keys())
    const mergeMap = new Map()
    const processed = new Set()

    // Sort by length ascending, then by frequency descending
    // This ensures shorter terms are processed first and become representatives
    const sorted = terms.sort((a, b) => {
      if (a.length !== b.length) {
        return a.length - b.length // Shorter first
      }
      return (termFreq.get(b) || 0) - (termFreq.get(a) || 0) // Higher frequency first
    })

    sorted.forEach((term) => {
      if (processed.has(term)) return

      // Find all terms where this term is a PREFIX of the other term
      const similar = sorted.filter((other) => {
        if (processed.has(other) || other === term) return false

        // Require one term to be a prefix of the other (not just share a prefix)
        const isTermPrefixOfOther = other.startsWith(term) && term.length >= MIN_PREFIX_LENGTH
        const isOtherPrefixOfTerm = term.startsWith(other) && other.length >= MIN_PREFIX_LENGTH

        return isTermPrefixOfOther || isOtherPrefixOfTerm
      })

      if (similar.length > 0) {
        // Merge: use the shortest term as the representative
        const allTerms = [term, ...similar]
        const shortest = allTerms.reduce((a, b) => (a.length < b.length ? a : b), term)

        // Map all variants to the shortest
        allTerms.forEach((t) => {
          mergeMap.set(t, shortest)
          processed.add(t)
        })
      } else {
        // No similar terms, map to itself
        mergeMap.set(term, term)
        processed.add(term)
      }
    })

    return mergeMap
  }

}
