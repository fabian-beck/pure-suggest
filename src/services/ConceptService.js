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
   * @param {Object} options - Optional configuration
   * @param {boolean} options.includeCitations - Whether to include citation attributes (default: true)
   * @param {boolean} options.includeAuthors - Whether to include author attributes (default: false)
   * @returns {Array} Array of concepts
   */
  static computeConcepts(publications, boostKeywords, options = {}) {
    if (!publications || publications.length === 0) {
      return []
    }

    const { includeCitations = true, includeAuthors = false } = options

    // Allow empty keywords array - citations/authors can still form concepts
    const context = this.buildContext(publications, boostKeywords || [], {
      includeCitations,
      includeAuthors
    })

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
   * @param {Object} options - Optional configuration
   * @param {boolean} options.includeCitations - Whether to include citation attributes (default: true)
   * @param {boolean} options.includeAuthors - Whether to include author attributes (default: false)
   * @returns {Object} Context object with publications, attributes, and matrix
   */
  static buildContext(publications, boostKeywords, options = {}) {
    const { includeCitations = true, includeAuthors = false } = options

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
      const authors = Author.computePublicationsAuthors(publications, false, false, false)

      // Get top 10 most frequent authors as attributes (include all authors with at least 1 publication)
      // Note: The FCA algorithm will naturally only create concepts for authors appearing in 2+ publications
      topAuthors = authors
        .slice(0, 10) // Take top 10 (already sorted by score/count)
        .map((author) => author.id)
    }

    // Combine keywords, citation DOIs, and authors as attributes (with type information)
    const attributes = [
      ...boostKeywords.map((keyword) => ({ type: 'keyword', value: keyword })),
      ...topCitedDois.map((doi) => ({ type: 'citation', value: doi })),
      ...topAuthors.map((author) => ({ type: 'author', value: author }))
    ]

    // Build binary matrix
    const matrix = []
    publications.forEach((publication) => {
      const row = []

      // Match keywords
      const matches = findKeywordMatches(publication.title, boostKeywords)
      const matchedKeywords = matches.map((match) => match.keyword)

      // Get publication author IDs (normalized names)
      const publicationAuthors = publication.authorOrcid
        ? publication.authorOrcid.split('; ').map((authorString) => Author.nameToId(authorString))
        : []

      // Check each attribute
      attributes.forEach((attribute) => {
        if (attribute.type === 'keyword') {
          // Keyword attribute
          row.push(matchedKeywords.includes(attribute.value))
        } else if (attribute.type === 'citation') {
          // Citation attribute - check if publication cites or is cited by this DOI, or is itself
          const isSelf = publication.doi === attribute.value
          const hasCitation = (publication.citationDois || []).includes(attribute.value)
          const hasReference = (publication.referenceDois || []).includes(attribute.value)
          row.push(isSelf || hasCitation || hasReference)
        } else if (attribute.type === 'author') {
          // Author attribute - check if publication has this author
          row.push(publicationAuthors.includes(attribute.value))
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

      // Generate next intent in lexicographic order
      currentIntent = this._nextClosure(currentIntent, closure, attributes, publications, matrix)
    }

    return concepts
  }

  /**
   * Computes the next closure in lexicographic order (NextClosure algorithm step)
   * @private
   * @param {Array} current - Current intent (attribute set)
   * @param {Array} closure - Closure of current intent
   * @param {Array} attributes - All attributes
   * @param {Array} publications - All publications
   * @param {Array} matrix - Binary context matrix
   * @returns {Array|null} Next intent, or null if no more concepts exist
   */
  static _nextClosure(current, closure, attributes, publications, matrix) {
    const n = attributes.length

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

      // Skip concepts with remaining importance <= 3
      if (topConcept.remainingImportance <= 3) {
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
   * @returns {Map} Map of concept index to {name, topTerms} object
   */
  static generateConceptNames(concepts, allPublications) {
    const nameMap = new Map()

    if (!allPublications || allPublications.length === 0) {
      // Fallback to concept numbers only
      concepts.forEach((concept, index) => {
        nameMap.set(index, { name: `C${index + 1}`, topTerms: [] })
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

      if (exclusivityTerms.length === 0) {
        nameMap.set(index, {
          name: `C${index + 1}`,
          exclusivityTerms: [],
          frequencyTerms: []
        })
        return
      }

      // Check if top score is tied with other terms
      const topScore = exclusivityTerms[0].score
      const tiedTerms = exclusivityTerms.filter((t) => Math.abs(t.score - topScore) < 0.0001)

      if (tiedTerms.length === 2 && exclusivityTerms.length >= 3) {
        // Two terms with same/similar score - check if third is clearly different
        const thirdScore = exclusivityTerms[2].score
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
        // Clear winner (single top term)
        nameMap.set(index, {
          name: `C${index + 1} - ${exclusivityTerms[0].term.toUpperCase()}`,
          exclusivityTerms: top10Exclusive,
          frequencyTerms: top10Frequent
        })
      }
    })

    return nameMap
  }

  /**
   * Assigns concept tags to publications based on their membership in concepts
   * @param {Array} publications - Array of publication objects to tag
   * @param {Array} concepts - Array of concepts (sorted by importance)
   * @returns {Map} Map of DOI to array of concept names
   */
  static assignConceptTags(publications, concepts) {
    const tagMap = new Map()
    const termsMap = new Map()

    // Sort concepts by importance
    const sortedConcepts = this.sortConceptsByImportance(concepts, publications.length)

    // Generate concept names and metadata
    const conceptMetadata = this.generateConceptNames(sortedConcepts, publications)

    // Assign each publication to the concepts it belongs to
    sortedConcepts.forEach((concept, index) => {
      const metadata = conceptMetadata.get(index)
      const conceptName = metadata.name
      concept.publications.forEach((doi) => {
        if (!tagMap.has(doi)) {
          tagMap.set(doi, [])
        }
        tagMap.get(doi).push(conceptName)

        // Store metadata (top terms and attributes) for this concept
        if (!termsMap.has(doi)) {
          termsMap.set(doi, new Map())
        }
        termsMap.get(doi).set(conceptName, {
          topTerms: metadata.topTerms,
          attributes: concept.attributes
        })
      })
    })

    // Update publication objects with concept tags and metadata
    publications.forEach((publication) => {
      const conceptNames = tagMap.get(publication.doi) || []
      if (conceptNames.length > 0) {
        publication.concepts = conceptNames
        publication.conceptMetadata = termsMap.get(publication.doi) || new Map()
      } else {
        publication.concepts = null
        publication.conceptMetadata = null
      }
    })

    return tagMap
  }

  /**
   * Merges similar terms by finding common prefixes and combining their frequencies
   * @param {Map} termFreq - Map of term to frequency
   * @returns {Map} Map with merged term frequencies
   */
  static _mergeTermFrequencies(termFreq) {
    if (termFreq.size === 0) return new Map()

    const MIN_PREFIX_LENGTH = 5
    const terms = Array.from(termFreq.keys())
    const merged = new Map()
    const processed = new Set()

    // Sort by frequency descending to prioritize high-frequency terms
    const sorted = terms.sort((a, b) => (termFreq.get(b) || 0) - (termFreq.get(a) || 0))

    sorted.forEach((term) => {
      if (processed.has(term)) return

      // Find all terms that share a common prefix with this term
      const similar = sorted.filter((other) => {
        if (processed.has(other) || other === term) return false

        // Find common prefix length
        const minLen = Math.min(term.length, other.length)
        let commonPrefixLen = 0
        for (let i = 0; i < minLen; i++) {
          if (term[i] === other[i]) {
            commonPrefixLen++
          } else {
            break
          }
        }

        return commonPrefixLen >= MIN_PREFIX_LENGTH
      })

      if (similar.length > 0) {
        // Merge: use the shortest term as the representative
        const allTerms = [term, ...similar]
        const shortest = allTerms.reduce((a, b) => (a.length < b.length ? a : b), term)
        const totalFreq = allTerms.reduce((sum, t) => sum + (termFreq.get(t) || 0), 0)

        merged.set(shortest, totalFreq)

        // Mark all as processed
        processed.add(term)
        similar.forEach((s) => processed.add(s))
      } else {
        // No similar terms, add as-is
        merged.set(term, termFreq.get(term))
        processed.add(term)
      }
    })

    return merged
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

    // Sort by frequency descending to prioritize high-frequency terms
    const sorted = terms.sort((a, b) => (termFreq.get(b) || 0) - (termFreq.get(a) || 0))

    sorted.forEach((term) => {
      if (processed.has(term)) return

      // Find all terms that share a common prefix with this term
      const similar = sorted.filter((other) => {
        if (processed.has(other) || other === term) return false

        // Find common prefix length
        const minLen = Math.min(term.length, other.length)
        let commonPrefixLen = 0
        for (let i = 0; i < minLen; i++) {
          if (term[i] === other[i]) {
            commonPrefixLen++
          } else {
            break
          }
        }

        return commonPrefixLen >= MIN_PREFIX_LENGTH
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

  /**
   * Logs concepts to console with exclusivity-based descriptive terms
   * @param {Array} concepts - Array of concepts
   * @param {Array} allPublications - All publication objects
   */
  static logConcepts(concepts, allPublications = []) {
    if (!concepts || concepts.length === 0) {
      console.log('[Concepts] No concepts found.')
      return
    }

    // Sort by importance and limit to top 10
    const sortedConcepts = this.sortConceptsByImportance(concepts, allPublications.length)
    const conceptsToShow = sortedConcepts.slice(0, 10)
    const totalCount = concepts.length

    // Update header to indicate if showing subset
    if (totalCount > 10) {
      console.log(`\n[Concepts] Concept Analysis Results: Top 10 concepts (${totalCount} total)`)
    } else {
      console.log(`\n[Concepts] Concept Analysis Results: ${totalCount} concepts found`)
    }

    console.log('═'.repeat(80))

    conceptsToShow.forEach((concept, index) => {
      const pubCount = concept.publications.length
      const attrCount = concept.attributes.length

      // Separate keywords, citation DOIs, and authors
      const keywords = concept.attributes.filter((attr) => attr.type === 'keyword').map((attr) => attr.value)
      const citations = concept.attributes.filter((attr) => attr.type === 'citation').map((attr) => attr.value)
      const authors = concept.attributes.filter((attr) => attr.type === 'author').map((attr) => attr.value)

      console.log(`\nConcept ${index + 1}:`)
      console.log(
        `  Importance: ${concept.importance} (${pubCount} publications × ${attrCount} attributes)`
      )
      console.log(`  Remaining Importance: ${concept.remainingImportance}`)
      console.log(`  Publications (${pubCount}): ${pubCount === 0 ? '∅' : concept.publications.join(', ')}`)
      console.log(`  Keywords (${keywords.length}): ${keywords.length === 0 ? '∅' : keywords.join(', ')}`)
      console.log(`  Citations (${citations.length}): ${citations.length === 0 ? '∅' : citations.join(', ')}`)
      console.log(`  Authors (${authors.length}): ${authors.length === 0 ? '∅' : authors.join(', ')}`)

      // Compute and display top terms if publications available
      if (allPublications.length > 0 && concept.publications.length > 0) {
        const { exclusivityTerms } = this.computeConceptTerms(
          concept.publications,
          allPublications
        )
        const top10 = exclusivityTerms.slice(0, 10)
        if (top10.length > 0) {
          const termString = top10.map((t) => `${t.term} (${t.score})`).join(', ')
          console.log(`  Top Terms: ${termString}`)
        }
      }
    })

    console.log(`\n${'═'.repeat(80)}`)
  }
}
