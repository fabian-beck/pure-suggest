import { PAGINATION } from '@/constants/config.js'
import Publication from '@/core/Publication.js'
import { shuffle } from '@/lib/Util.js'

/**
 * Service for computing publication suggestions based on citation networks
 */
export class SuggestionService {
  /**
   * Computes suggestions based on selected publications and their citation networks
   * @param {Object} options - Configuration options
   * @param {Array} options.selectedPublications - Array of selected publications
   * @param {Function} options.isExcluded - Function to check if DOI is excluded
   * @param {Function} options.isSelected - Function to check if DOI is selected
   * @param {Function} options.getSelectedPublicationByDoi - Function to get publication by DOI
   * @param {number} options.maxSuggestions - Maximum number of suggestions to return
   * @param {Set} options.readPublicationsDois - Set of DOIs that have been read
   * @param {Function} options.updateLoadingMessage - Callback to update loading progress
   * @returns {Promise<Object>} Suggestion result with publications and metadata
   */
  static async computeSuggestions({
    selectedPublications,
    isExcluded,
    isSelected,
    getSelectedPublicationByDoi,
    maxSuggestions,
    readPublicationsDois,
    updateLoadingMessage
  }) {
    console.log(
      `Starting to compute new suggestions based on ${selectedPublications.length} selected publications.`
    )

    // Validate and sync bidirectional citation relationships
    this._validateCitationConsistency(selectedPublications, getSelectedPublicationByDoi)

    // Reset citation/reference counts for selected publications
    selectedPublications.forEach((publication) => {
      publication.citationCount = 0
      publication.referenceCount = 0
    })

    // Build suggestions from citation network
    const suggestedPublications = {}

    selectedPublications.forEach((publication) => {
      // Process citations (publication cites these DOIs)
      publication.citationDois.forEach((doi) => {
        if (isExcluded(doi)) return

        if (isSelected(doi)) {
          getSelectedPublicationByDoi(doi).citationCount++
        } else {
          this._addCitationSuggestion(suggestedPublications, doi, publication.doi)
        }
      })

      // Process references (these DOIs cite this publication)
      publication.referenceDois.forEach((doi) => {
        if (isExcluded(doi)) return

        if (isSelected(doi)) {
          getSelectedPublicationByDoi(doi).referenceCount++
        } else {
          this._addReferenceSuggestion(suggestedPublications, doi, publication.doi)
        }
      })
    })

    // Process and rank suggestions
    let filteredSuggestions = Object.values(suggestedPublications)
    filteredSuggestions = shuffle(filteredSuggestions, 0)
    console.log(`Identified ${filteredSuggestions.length} publications as suggestions.`)

    // Sort by citation + reference count (titles not yet fetched)
    filteredSuggestions.sort(
      (a, b) => b.citationCount + b.referenceCount - (a.citationCount + a.referenceCount)
    )

    // Prepare suggestions for preloading
    const preloadSuggestions = filteredSuggestions.slice(
      maxSuggestions,
      maxSuggestions + PAGINATION.LOAD_MORE_INCREMENT
    )
    filteredSuggestions = filteredSuggestions.slice(0, maxSuggestions)

    // Load metadata for top suggestions
    console.log(
      `Filtered suggestions to ${filteredSuggestions.length} top candidates, loading metadata for these.`
    )
    await this._loadSuggestionsMetadata(filteredSuggestions, updateLoadingMessage)

    // Mark read status
    filteredSuggestions.forEach((publication) => {
      publication.isRead = readPublicationsDois.has(publication.doi)
    })

    console.log('Completed computing and loading of new suggestions.')

    // Preload next batch in background
    preloadSuggestions.forEach((publication) => {
      publication.fetchData()
    })

    return {
      publications: filteredSuggestions,
      totalSuggestions: Object.values(suggestedPublications).length
    }
  }

  /**
   * Adds citation suggestion (suggested DOI is referenced by source)
   * @private
   */
  static _addCitationSuggestion(suggestedPublications, doi, sourceDoi) {
    if (!suggestedPublications[doi]) {
      suggestedPublications[doi] = new Publication(doi)
    }
    suggestedPublications[doi].referenceDois.push(sourceDoi)
    suggestedPublications[doi].citationCount++
  }

  /**
   * Adds reference suggestion (suggested DOI cites source)
   * @private
   */
  static _addReferenceSuggestion(suggestedPublications, doi, sourceDoi) {
    if (!suggestedPublications[doi]) {
      suggestedPublications[doi] = new Publication(doi)
    }
    suggestedPublications[doi].citationDois.push(sourceDoi)
    suggestedPublications[doi].referenceCount++
  }

  /**
   * Loads metadata for suggestions with progress tracking
   * @private
   */
  static async _loadSuggestionsMetadata(suggestions, updateLoadingMessage) {
    let publicationsLoadedCount = 0
    updateLoadingMessage(`${publicationsLoadedCount}/${suggestions.length} suggestions loaded`)

    await Promise.all(
      suggestions.map(async (suggestedPublication) => {
        await suggestedPublication.fetchData()
        publicationsLoadedCount++
        updateLoadingMessage(`${publicationsLoadedCount}/${suggestions.length} suggestions loaded`)
      })
    )
  }

  /**
   * Validates and repairs bidirectional citation consistency
   * Ensures that if A cites B (B in A.referenceDois), then B should have A in citationDois
   * @private
   */
  static _validateCitationConsistency(selectedPublications, getSelectedPublicationByDoi) {
    let inconsistenciesFound = 0
    let inconsistenciesFixed = 0

    selectedPublications.forEach((publication) => {
      // Check forward citations: if A cites B, B should list A as citing it
      publication.referenceDois.forEach((citedDoi) => {
        try {
          const citedPub = getSelectedPublicationByDoi(citedDoi)
          if (citedPub && !citedPub.citationDois.includes(publication.doi)) {
            inconsistenciesFound++
            console.warn(
              `[SuggestionService] Citation inconsistency: ${publication.doi} claims to cite ${citedDoi}, ` +
              `but ${citedDoi} doesn't list ${publication.doi} in citationDois. Adding reverse relationship.`
            )
            citedPub.citationDois.push(publication.doi)
            inconsistenciesFixed++
          }
        } catch (e) {
          // Publication not in selected set, skip validation
        }
      })

      // Check reverse citations: if A lists B as citing it, B should cite A
      publication.citationDois.forEach((citingDoi) => {
        try {
          const citingPub = getSelectedPublicationByDoi(citingDoi)
          if (citingPub && !citingPub.referenceDois.includes(publication.doi)) {
            inconsistenciesFound++
            console.warn(
              `[SuggestionService] Citation inconsistency: ${publication.doi} claims ${citingDoi} cites it, ` +
              `but ${citingDoi} doesn't list ${publication.doi} in referenceDois. Adding forward relationship.`
            )
            citingPub.referenceDois.push(publication.doi)
            inconsistenciesFixed++
          }
        } catch (e) {
          // Publication not in selected set, skip validation
        }
      })
    })

    if (inconsistenciesFound > 0) {
      console.log(
        `[SuggestionService] Citation consistency check: Found and fixed ${inconsistenciesFixed} inconsistencies`
      )
    }
  }
}
