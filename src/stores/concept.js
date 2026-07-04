import { defineStore } from 'pinia'

import { ConceptService } from '@/services/ConceptService.js'
import { findKeywordMatches } from '@/utils/scoringUtils.js'

export const useConceptStore = defineStore('concept', {
  state: () => {
    return {
      concepts: [],
      sortedConcepts: [],
      conceptMetadata: new Map(),
      previewConcepts: [],
      previewSortedConcepts: [],
      previewConceptMetadata: new Map()
    }
  },
  getters: {
    hasConcepts: (state) => state.concepts.length > 0,
    hasPreview: (state) => state.previewConcepts.length > 0
  },

  actions: {
    computePreview(publications, boostKeywords, includeCitations = true, includeAuthors = false) {
      this.previewConcepts = ConceptService.computeConcepts(
        publications,
        boostKeywords,
        includeCitations,
        includeAuthors
      )
      this.previewSortedConcepts = ConceptService.sortConceptsByImportance(
        this.previewConcepts,
        publications.length
      )
      this.previewConceptMetadata = ConceptService.generateConceptNames(
        this.previewSortedConcepts,
        publications
      )
    },

    assignConceptTagsToPublications(publications) {
      if (!this.hasConcepts) return

      publications.forEach((publication) => {
        const matchingConcepts = []
        const metadata = new Map()

        this.sortedConcepts.forEach((concept, index) => {
          if (this._publicationMatchesConceptAttributes(publication, concept.attributes)) {
            const conceptMetadata = this.conceptMetadata.get(index)
            const conceptName = conceptMetadata.name
            matchingConcepts.push(conceptName)
            metadata.set(conceptName, {
              topTerms: conceptMetadata.exclusivityTerms,
              attributes: concept.attributes
            })
          }
        })

        if (matchingConcepts.length > 0) {
          publication.concepts = matchingConcepts
          publication.conceptMetadata = metadata
        } else {
          publication.concepts = null
          publication.conceptMetadata = null
        }
      })
    },

    _publicationMatchesConceptAttributes(publication, attributes) {
      const keywordAttributes = attributes.filter((attr) => attr.type === 'keyword').map((attr) => attr.value)
      const citationAttributes = attributes.filter((attr) => attr.type === 'citation').map((attr) => attr.value)
      const authorAttributes = attributes.filter((attr) => attr.type === 'author').map((attr) => attr.value)

      // Check keyword attributes using same logic as ConceptService
      const matches = findKeywordMatches(publication.title, keywordAttributes)
      const matchedKeywords = matches.map((match) => match.keyword)
      const hasAllKeywords = keywordAttributes.every((keyword) => matchedKeywords.includes(keyword))

      // Check citation attributes (DOIs are Sets on Publication objects, arrays elsewhere)
      const citationDois = new Set(publication.citationDois)
      const referenceDois = new Set(publication.referenceDois)
      const hasAllCitations = citationAttributes.every(
        (doi) => publication.doi === doi || citationDois.has(doi) || referenceDois.has(doi)
      )

      // Check author attributes against the publication's normalized author IDs
      const publicationAuthorIds = authorAttributes.length > 0 ? publication.getAuthorIds?.() || [] : []
      const hasAllAuthors = authorAttributes.every((authorId) => publicationAuthorIds.includes(authorId))

      return hasAllKeywords && hasAllCitations && hasAllAuthors
    },

    applyPreview(publications, filter) {
      this.concepts = this.previewConcepts
      this.sortedConcepts = this.previewSortedConcepts
      this.conceptMetadata = this.previewConceptMetadata
      this.clearPreview()

      this.assignConceptTagsToPublications(publications)

      // Drop filter tags that no longer resolve to an existing concept
      const conceptTags = new Set(
        this.sortedConcepts.map((concept, index) => `concept${this.conceptMetadata.get(index).name.split(' ')[0]}`)
      )
      filter.tags = filter.tags.filter((tag) => !tag.startsWith('concept') || conceptTags.has(tag))
    },

    disable(publications, filter) {
      this.clear()

      publications.forEach((publication) => {
        publication.concepts = null
        publication.conceptMetadata = null
      })

      filter.tags = filter.tags.filter((tag) => !tag.startsWith('concept'))
    },

    clear() {
      this.concepts = []
      this.sortedConcepts = []
      this.conceptMetadata = new Map()
      this.clearPreview()
    },

    clearPreview() {
      this.previewConcepts = []
      this.previewSortedConcepts = []
      this.previewConceptMetadata = new Map()
    }
  }
})
