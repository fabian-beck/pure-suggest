/**
 * Utility functions for publication filtering to reduce code duplication
 */


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
  
  const sorter = (a, b) => {
    const aMatches = filter.matches(a);
    const bMatches = filter.matches(b);
    
    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;
    
    return b.score - a.score;
  };
  
  return [...publications].sort(sorter);
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

