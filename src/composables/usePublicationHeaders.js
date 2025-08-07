/**
 * Composable for managing publication headers and list organization
 */
import { computed } from 'vue'

export function usePublicationHeaders(publications, publicationType, sessionStore) {
  
  /**
   * Generate section headers based on publication type and filter state
   */
  const sectionHeaders = computed(() => {
    const result = []
    
    if (!sessionStore.filter.hasActiveFilters()) {
      return result
    }
    
    // Determine counts based on publication type
    const filteredCountKey = `${publicationType}PublicationsFilteredCount`
    const nonFilteredCountKey = `${publicationType}PublicationsNonFilteredCount`
    
    const filteredCount = sessionStore[filteredCountKey]
    const nonFilteredCount = sessionStore[nonFilteredCountKey]
    
    // Add filtered header if there are filtered publications
    if (filteredCount > 0) {
      result.push({
        type: 'header',
        text: `<i class="mdi mdi-filter"></i> Filtered (${filteredCount})`,
        key: 'filtered-header',
        section: 'filtered'
      })
    }
    
    // Add non-filtered header if there are non-filtered publications
    if (nonFilteredCount > 0) {
      result.push({
        type: 'header',
        text: `Other publications (${nonFilteredCount})`,
        key: 'non-filtered-header',
        section: 'non-filtered'
      })
    }
    
    return result
  })
  
  /**
   * Get filtered publications based on publication type
   */
  const filteredPublications = computed(() => {
    if (publicationType === 'selected') {
      return sessionStore.selectedPublicationsFiltered
    } else if (publicationType === 'suggested') {
      return sessionStore.suggestedPublicationsFiltered
    }
    return []
  })
  
  /**
   * Organize publications with appropriate section headers
   */
  const publicationsWithHeaders = computed(() => {
    const result = []
    
    if (!sessionStore.filter.hasActiveFilters()) {
      // No filters active - just return publications
      return publications.value || filteredPublications.value
    }
    
    const headers = sectionHeaders.value
    const allPublications = publications.value || filteredPublications.value
    
    // Separate publications into filtered and non-filtered
    const matchingPublications = []
    const nonMatchingPublications = []
    
    allPublications.forEach(publication => {
      if (sessionStore.filter.matches(publication)) {
        matchingPublications.push(publication)
      } else {
        nonMatchingPublications.push(publication)
      }
    })
    
    // Add filtered section
    const filteredHeader = headers.find(h => h.section === 'filtered')
    if (filteredHeader && matchingPublications.length > 0) {
      result.push(filteredHeader)
      result.push(...matchingPublications)
    }
    
    // Add non-filtered section  
    const nonFilteredHeader = headers.find(h => h.section === 'non-filtered')
    if (nonFilteredHeader && nonMatchingPublications.length > 0) {
      result.push(nonFilteredHeader)
      result.push(...nonMatchingPublications)
    }
    
    return result
  })
  
  return {
    sectionHeaders,
    filteredPublications,
    publicationsWithHeaders
  }
}