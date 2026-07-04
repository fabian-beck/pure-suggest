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
    computeAndStoreConcepts(selectedPublications, boostKeywords) {
      this.concepts = ConceptService.computeConcepts(selectedPublications, boostKeywords)
      this.sortedConcepts = ConceptService.sortConceptsByImportance(this.concepts, selectedPublications.length)
      this.conceptMetadata = ConceptService.generateConceptNames(
        this.sortedConcepts,
        selectedPublications
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

      // Check citation attributes
      const hasAllCitations = citationAttributes.every((doi) => {
        const isSelf = publication.doi === doi
        const hasCitation = (publication.citationDois || []).includes(doi)
        const hasReference = (publication.referenceDois || []).includes(doi)
        return isSelf || hasCitation || hasReference
      })

      // Check author attributes against the publication's normalized author IDs
      const publicationAuthorIds = authorAttributes.length > 0 ? publication.getAuthorIds?.() || [] : []
      const hasAllAuthors = authorAttributes.every((authorId) => publicationAuthorIds.includes(authorId))

      return hasAllKeywords && hasAllCitations && hasAllAuthors
    },

    clear() {
      this.concepts = []
      this.sortedConcepts = []
      this.conceptMetadata = new Map()
    },

    clearPreview() {
      this.previewConcepts = []
      this.previewSortedConcepts = []
      this.previewConceptMetadata = new Map()
    }
  }
})
