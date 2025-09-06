import Publication from "@/core/Publication.js";
import { shuffle } from "@/lib/Util.js";
import { PAGINATION } from "@/constants/config.js";

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
    console.log(`Starting to compute new suggestions based on ${selectedPublications.length} selected publications.`);
    
    // Reset citation/reference counts for selected publications
    selectedPublications.forEach((publication) => {
      publication.citationCount = 0;
      publication.referenceCount = 0;
    });
    
    // Build suggestions from citation network
    const suggestedPublications = {};
    
    // Helper function to process DOI arrays with the same pattern
    const processDoisArray = (dois, counterType, listType, sourceDoi) => {
      dois.forEach((doi) => {
        this._incrementSuggestedPublicationCounter(
          suggestedPublications,
          doi,
          counterType,
          listType,
          sourceDoi,
          { isExcluded, isSelected, getSelectedPublicationByDoi }
        );
      });
    };
    
    selectedPublications.forEach((publication) => {
      // Process citations and references using the helper
      processDoisArray(publication.citationDois, "citationCount", "referenceDois", publication.doi);
      processDoisArray(publication.referenceDois, "referenceCount", "citationDois", publication.doi);
    });
    
    // Process and rank suggestions
    let filteredSuggestions = Object.values(suggestedPublications);
    filteredSuggestions = shuffle(filteredSuggestions, 0);
    console.log(`Identified ${filteredSuggestions.length} publications as suggestions.`);
    
    // Sort by citation + reference count (titles not yet fetched)
    filteredSuggestions.sort(
      (a, b) => b.citationCount + b.referenceCount - (a.citationCount + a.referenceCount)
    );
    
    // Prepare suggestions for preloading
    const preloadSuggestions = filteredSuggestions.slice(
      maxSuggestions, 
      maxSuggestions + PAGINATION.LOAD_MORE_INCREMENT
    );
    filteredSuggestions = filteredSuggestions.slice(0, maxSuggestions);
    
    // Load metadata for top suggestions
    console.log(`Filtered suggestions to ${filteredSuggestions.length} top candidates, loading metadata for these.`);
    await this._loadSuggestionsMetadata(filteredSuggestions, updateLoadingMessage);
    
    // Mark read status
    filteredSuggestions.forEach((publication) => {
      publication.isRead = readPublicationsDois.has(publication.doi);
    });
    
    console.log("Completed computing and loading of new suggestions.");
    
    // Preload next batch in background
    preloadSuggestions.forEach(publication => {
      publication.fetchData();
    });
    
    return {
      publications: filteredSuggestions,
      totalSuggestions: Object.values(suggestedPublications).length
    };
  }
  
  /**
   * Increments suggestion counters for a given DOI
   * @private
   */
  static _incrementSuggestedPublicationCounter(
    suggestedPublications,
    doi,
    counter,
    doiList,
    sourceDoi,
    { isExcluded, isSelected, getSelectedPublicationByDoi }
  ) {
    if (!isExcluded(doi)) {
      if (!isSelected(doi)) {
        // Add to suggestions
        if (!suggestedPublications[doi]) {
          const citingPublication = new Publication(doi);
          suggestedPublications[doi] = citingPublication;
        }
        suggestedPublications[doi][doiList].push(sourceDoi);
        suggestedPublications[doi][counter]++;
      } else {
        // Update selected publication counters
        getSelectedPublicationByDoi(doi)[counter]++;
      }
    }
  }
  
  /**
   * Loads metadata for suggestions with progress tracking
   * @private
   */
  static async _loadSuggestionsMetadata(suggestions, updateLoadingMessage) {
    let publicationsLoadedCount = 0;
    updateLoadingMessage(`${publicationsLoadedCount}/${suggestions.length} suggestions loaded`);
    
    await Promise.all(suggestions.map(async (suggestedPublication) => {
      await suggestedPublication.fetchData();
      publicationsLoadedCount++;
      updateLoadingMessage(`${publicationsLoadedCount}/${suggestions.length} suggestions loaded`);
    }));
  }
}