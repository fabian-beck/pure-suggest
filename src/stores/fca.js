import { defineStore } from 'pinia'

import { FCAService } from '@/services/FCAService.js'
import { findKeywordMatches } from '@/utils/scoringUtils.js'

export const useFcaStore = defineStore('fca', {
  state: () => {
    return {
      concepts: [],
      sortedConcepts: [],
      conceptMetadata: new Map()
    }
  },
  getters: {
    hasConcepts: (state) => state.concepts.length > 0
  },

  actions: {
    computeAndStoreConcepts(selectedPublications, boostKeywords) {
      this.concepts = FCAService.computeFormalConcepts(selectedPublications, boostKeywords)
      this.sortedConcepts = FCAService.sortConceptsByImportance(this.concepts)
      this.conceptMetadata = FCAService.generateConceptNames(
        this.sortedConcepts,
        selectedPublications
      )

      FCAService.logFormalConcepts(this.concepts, selectedPublications)
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
              topTerms: conceptMetadata.topTerms,
              attributes: concept.attributes
            })
          }
        })

        if (matchingConcepts.length > 0) {
          publication.fcaConcepts = matchingConcepts
          publication.fcaConceptMetadata = metadata
        } else {
          publication.fcaConcepts = null
          publication.fcaConceptMetadata = null
        }
      })
    },

    _publicationMatchesConceptAttributes(publication, attributes) {
      const keywordAttributes = attributes.filter((attr) => !attr.startsWith('10.'))
      const citationAttributes = attributes.filter((attr) => attr.startsWith('10.'))

      // Check keyword attributes using same logic as FCAService
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

      return hasAllKeywords && hasAllCitations
    },

    clear() {
      this.concepts = []
      this.sortedConcepts = []
      this.conceptMetadata = new Map()
    }
  }
})
