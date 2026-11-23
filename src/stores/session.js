import LZString from 'lz-string'
import { defineStore } from 'pinia'

import { PAGINATION } from '@/constants/config.js'
import Filter from '@/core/Filter.js'
import Publication from '@/core/Publication.js'
import { saveAsFile } from '@/lib/Util.js'
import { generateBibtex } from '@/utils/bibtex.js'
import { getFilteredPublications } from '@/utils/filterUtils.js'
import {
  normalizeBoostKeywordString,
  parseUniqueBoostKeywords,
  updatePublicationScores
} from '@/utils/scoringUtils.js'

export const useSessionStore = defineStore('session', {
  state: () => {
    return {
      selectedPublications: [],
      excludedPublicationsDois: [],
      starredPublicationsDois: [],
      suggestion: '',
      maxSuggestions: PAGINATION.INITIAL_SUGGESTIONS_COUNT,
      boostKeywordString: '',
      isBoost: true,
      activePublication: '',
      readPublicationsDois: new Set(),
      filter: new Filter(),
      sessionName: '',
      sessionId: ''
    }
  },
  getters: {
    selectedPublicationsDois: (state) =>
      state.selectedPublications.map((publication) => publication.doi),
    selectedPublicationsDoiSet: (state) =>
      new Set(state.selectedPublications.map((publication) => publication.doi)),
    selectedPublicationsByDoi: (state) =>
      new Map(state.selectedPublications.map((publication) => [publication.doi, publication])),
    excludedPublicationsDoiSet: (state) => new Set(state.excludedPublicationsDois),
    starredPublicationsDoiSet: (state) => new Set(state.starredPublicationsDois),
    selectedPublicationsCount: (state) => state.selectedPublications.length,
    excludedPublicationsCount: (state) => state.excludedPublicationsDois.length,
    suggestedPublications: (state) => (state.suggestion ? state.suggestion.publications : []),
    suggestedPublicationsFiltered: (state) => {
      return getFilteredPublications(
        state.suggestedPublications,
        state.filter,
        state.filter.applyToSuggested
      )
    },
    selectedPublicationsFiltered: (state) => {
      return getFilteredPublications(
        state.selectedPublications,
        state.filter,
        state.filter.applyToSelected
      )
    },
    publications: (state) => state.selectedPublications.concat(state.suggestedPublications),
    publicationsFiltered: (state) =>
      state.selectedPublications.concat(state.suggestedPublicationsFiltered),
    unreadSuggestionsCount: (state) =>
      state.suggestedPublicationsFiltered.filter((publication) => !publication.isRead).length,
    uniqueBoostKeywords: (state) => parseUniqueBoostKeywords(state.boostKeywordString),
    sessionData() {
      return {
        name: this.sessionName,
        selected: this.selectedPublicationsDois,
        excluded: this.excludedPublicationsDois,
        starred: this.starredPublicationsDois,
        boost: this.uniqueBoostKeywords.join(', ')
      }
    },
    isSelected() {
      return (doi) => this.selectedPublicationsDoiSet.has(doi)
    },
    isExcluded() {
      return (doi) => this.excludedPublicationsDoiSet.has(doi)
    },
    getSelectedPublicationByDoi() {
      return (doi) => this.selectedPublicationsByDoi.get(doi)
    }
  },
  actions: {
    clear() {
      this.selectedPublications = []
      this.excludedPublicationsDois = []
      this.starredPublicationsDois = []
      this.suggestion = ''
      this.maxSuggestions = PAGINATION.INITIAL_SUGGESTIONS_COUNT
      this.boostKeywordString = ''
      this.isBoost = true
      this.activePublication = ''
      // Read publications are kept, as the user might want to carry them over to the next session
      this.filter = new Filter()
      this.sessionName = ''
      this.sessionId = ''
    },

    removeFromExcludedPublication(doi) {
      this.excludedPublicationsDois = this.excludedPublicationsDois.filter(
        (excludedDoi) => excludedDoi != doi
      )
    },

    toggleStarred(publication) {
      publication.isStarred = !this.starredPublicationsDoiSet.has(publication.doi)
      this.starredPublicationsDois = publication.isStarred
        ? [...this.starredPublicationsDois, publication.doi]
        : this.starredPublicationsDois.filter((doi) => doi !== publication.doi)
    },

    setBoostKeywordString(boostKeywordString) {
      this.boostKeywordString = boostKeywordString
      this.updatePublicationScores()
    },

    setSessionName(sessionName) {
      this.sessionName = sessionName || ''
    },

    generateFilename(extension) {
      // Use default filename if session name is empty, null
      const isDefaultName = !this.sessionName || this.sessionName.trim() === ''

      if (isDefaultName) {
        return extension === 'json' ? 'session.puresuggest.json' : 'publications.bib'
      }

      // Convert to lowercase and sanitize
      let filename = this.sessionName
        .toLowerCase()
        // Replace multiple whitespace with single underscore
        .replace(/\s+/g, '_')
        // Replace invalid filename characters and punctuation with underscores
        .replace(/[/\\?*|<>:"'!()]/g, '_')
        // Replace remaining non-alphanumeric characters (except underscores and hyphens) with underscores
        .replace(/[^a-z0-9_-]/g, '_')
        // Replace multiple underscores with single underscore
        .replace(/_+/g, '_')
        // Remove leading/trailing underscore (runs already collapsed to one above)
        .replace(/^_/, '')
        .replace(/_$/, '')

      // Handle edge case of empty filename after sanitization
      if (!filename || filename === '_') {
        return extension === 'json' ? 'session.puresuggest.json' : 'publications.bib'
      }

      // Truncate if too long (leave room for extension)
      const extensionSuffix = extension === 'json' ? '.puresuggest.json' : '.bib'
      const maxLength = 250 - extensionSuffix.length
      if (filename.length > maxLength) {
        filename = filename.substring(0, maxLength)
      }

      return `${filename}${extensionSuffix}`
    },

    async addPublicationsToSelection(dois) {
      console.log(`Adding to selection publications with DOIs: ${dois}.`)
      dois.forEach((doi) => {
        doi = doi.toLowerCase()
        if (this.isExcluded(doi)) {
          this.removeFromExcludedPublication(doi)
        }
        if (!this.getSelectedPublicationByDoi(doi)) {
          this.selectedPublications.push(new Publication(doi))
        }
      })
    },

    markPublicationsAsNewlyAdded(dois, wasSessionEmpty = false) {
      // Only mark publications as newly added if the session was not empty before
      if (wasSessionEmpty) {
        return
      }

      this.clearNewlyAddedFlags()

      // Mark the specified publications as newly added
      dois.forEach((doi) => {
        const normalizedDoi = doi.toLowerCase()
        const publication = this.getSelectedPublicationByDoi(normalizedDoi)
        if (publication) {
          publication.isNewlyAdded = true
        }
      })
      console.log(`Marked ${dois.length} publications as newly added.`)
    },

    clearNewlyAddedFlags() {
      this.selectedPublications.forEach((publication) => {
        publication.isNewlyAdded = false
      })
    },

    updatePublicationScores() {
      console.log('Updating scores of publications and reordering them.')

      // Normalize boost keyword string
      this.boostKeywordString = normalizeBoostKeywordString(this.boostKeywordString)

      // Update scores for all publications
      updatePublicationScores(this.publications, this.uniqueBoostKeywords, this.isBoost)

      Publication.sortPublications(this.selectedPublications)
      Publication.sortPublications(this.suggestedPublications)
    },

    setActivePublication(doi) {
      const selectedPublications = this.selectedPublications
      const suggestedPublications = this.suggestedPublications
      const selectedPublication = selectedPublications.find(
        (publication) => publication.doi === doi
      )
      const suggestedPublication = selectedPublication
        ? undefined
        : suggestedPublications.find((publication) => publication.doi === doi)

      // Each state is assigned once, so that only publications with a changed state update
      if (selectedPublication) {
        const linkedDois = new Set([
          ...selectedPublication.citationDois,
          ...selectedPublication.referenceDois
        ])
        this.publications.forEach((publication) => {
          publication.isActive = publication === selectedPublication
          publication.isLinkedToActive = linkedDois.has(publication.doi)
        })
        this.activePublication = selectedPublication
      } else {
        // Linked by the selected publications' own citation data, as are network links and
        // scores: the suggestion's fetched data may list further, unreciprocated citations
        selectedPublications.forEach((publication) => {
          publication.isActive = false
          publication.isLinkedToActive =
            Boolean(suggestedPublication) &&
            (publication.citationDois.has(doi) || publication.referenceDois.has(doi))
        })
        suggestedPublications.forEach((publication) => {
          publication.isActive = publication === suggestedPublication
          publication.isLinkedToActive = false
        })
        if (suggestedPublication) {
          suggestedPublication.isRead = true
          this.readPublicationsDois.add(doi)
          this.activePublication = suggestedPublication
        }
      }
      console.log(`Highlighted as active publication with DOI ${doi}.`)
    },

    clearActivePublication(source) {
      if (!this.activePublication) {
        return
      }

      const previousDoi = this.activePublication.doi
      this.activePublication = undefined
      this.publications.forEach((publication) => {
        publication.isActive = false
        publication.isLinkedToActive = false
      })
      console.log(`Cleared active publication ${previousDoi}, triggered by "${source}".`)
    },

    exportSession() {
      const filename = this.generateFilename('json')
      saveAsFile(filename, 'application/json', JSON.stringify(this.sessionData))
    },

    exportAllBibtex() {
      this.exportBibtex(this.selectedPublications)
    },

    exportSingleBibtex(publication) {
      this.exportBibtex([publication])
    },

    exportBibtex(publicationList) {
      let bib = ''
      publicationList.forEach((publication) => (bib += `${generateBibtex(publication)}\n\n`))
      const filename = this.generateFilename('bib')
      saveAsFile(filename, 'application/x-bibtex', bib)
    },

    generateSessionUrl() {
      // Compress and encode the data
      const jsonString = JSON.stringify(this.sessionData)
      const compressed = LZString.compressToEncodedURIComponent(jsonString)

      // Generate URL with session parameter
      const baseUrl = window.location.origin + window.location.pathname
      return `${baseUrl}?session=${compressed}`
    }
  }
})
