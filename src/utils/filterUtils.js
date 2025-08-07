/**
 * Utility functions for publication filtering to reduce code duplication
 */

/**
 * Creates a sorter function that sorts publications by filter match status first, then by score
 * @param {Function} filterMatches - Function that takes a publication and returns true if it matches filter
 * @returns {Function} Sorter function for use with Array.sort()
 */
export function createFilterSorter(filterMatches) {
  return (a, b) => {
    const aMatches = filterMatches(a);
    const bMatches = filterMatches(b);
    
    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;
    
    // If both match or both don't match, sort by score descending
    return b.score - a.score;
  };
}

/**
 * Filters and sorts publications based on filter state
 * @param {Array} publications - Array of publications to process
 * @param {Object} filter - Filter object with hasActiveFilters() and matches() methods
 * @param {boolean} shouldApply - Whether to apply the filter
 * @returns {Array} Filtered and sorted publications
 */
export function getFilteredPublications(publications, filter, shouldApply) {
  if (!filter.hasActiveFilters() || !shouldApply) {
    return publications;
  }
  
  return [...publications].sort(createFilterSorter(pub => filter.matches(pub)));
}

/**
 * Counts publications matching a filter condition
 * @param {Array} publications - Array of publications to count
 * @param {Object} filter - Filter object with hasActiveFilters() and matches() methods
 * @param {boolean} matchingFilter - If true, count matching publications; if false, count non-matching
 * @returns {number} Count of publications
 */
export function countFilteredPublications(publications, filter, matchingFilter = true) {
  if (!filter.hasActiveFilters()) return 0;
  
  return publications.filter(publication => 
    matchingFilter ? filter.matches(publication) : !filter.matches(publication)
  ).length;
}

/**
 * Generates section headers for publication lists
 * @param {string} publicationType - Either 'selected' or 'suggested'
 * @param {Object} sessionStore - Session store with filter counts
 * @returns {Array} Array of header objects
 */
export function generateSectionHeaders(publicationType, sessionStore) {
  const result = [];
  
  // Determine counts based on publication type
  const filteredCountKey = `${publicationType}PublicationsFilteredCount`;
  const nonFilteredCountKey = `${publicationType}PublicationsNonFilteredCount`;
  
  const filteredCount = sessionStore[filteredCountKey];
  const nonFilteredCount = sessionStore[nonFilteredCountKey];
  
  // Add filtered header if there are filtered publications
  if (filteredCount > 0) {
    result.push({
      type: 'header',
      text: `<i class="mdi mdi-filter"></i> Filtered (${filteredCount})`,
      key: 'filtered-header'
    });
  }
  
  // Add non-filtered header if there are non-filtered publications
  if (nonFilteredCount > 0) {
    result.push({
      type: 'header',
      text: `Other publications (${nonFilteredCount})`,
      key: 'non-filtered-header'
    });
  }
  
  return result;
}