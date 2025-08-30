import { defineStore } from 'pinia'


import Publication from "@/Publication.js";
import { generateBibtex } from "@/utils/bibtex.js";
import { getFilteredPublications, countFilteredPublications } from "@/utils/filterUtils.js";
import { normalizeBoostKeywordString, parseUniqueBoostKeywords, updatePublicationScores } from "@/utils/scoringUtils.js";
import Filter from '@/Filter.js';
import { saveAsFile } from "@/Util.js"
import { PAGINATION } from "@/constants/config.js";


export const useSessionStore = defineStore('session', {
  state: () => {
    return {
      selectedPublications: [],
      excludedPublicationsDois: [],
      suggestion: "",
      maxSuggestions: PAGINATION.INITIAL_SUGGESTIONS_COUNT,
      boostKeywordString: "",
      isBoost: true,
      activePublication: "",
      readPublicationsDois: new Set(),
      filter: new Filter(),
      addQuery: "",
      sessionName: "",
    }
  },
  getters: {
    selectedPublicationsDois: (state) => asDois(state.selectedPublications),
    selectedPublicationsCount: (state) => state.selectedPublications.length,
    excludedPublicationsCount: (state) => state.excludedPublicationsDois.length,
    suggestedPublications: (state) => state.suggestion ? state.suggestion.publications : [],
    suggestedPublicationsFiltered: (state) => {
      return getFilteredPublications(state.suggestedPublications, state.filter, state.filter.applyToSuggested);
    },
    selectedPublicationsFiltered: (state) => {
      return getFilteredPublications(state.selectedPublications, state.filter, state.filter.applyToSelected);
    },
    selectedPublicationsFilteredCount: (state) => {
      return countFilteredPublications(state.selectedPublications, state.filter, true);
    },
    selectedPublicationsNonFilteredCount: (state) => {
      return countFilteredPublications(state.selectedPublications, state.filter, false);
    },
    suggestedPublicationsFilteredCount: (state) => {
      return countFilteredPublications(state.suggestedPublications, state.filter, true);
    },
    suggestedPublicationsNonFilteredCount: (state) => {
      return countFilteredPublications(state.suggestedPublications, state.filter, false);
    },
    publications: (state) => state.selectedPublications.concat(state.suggestedPublications),
    publicationsFiltered: (state) => state.selectedPublications.concat(state.suggestedPublicationsFiltered),
    yearMax: (state) => Math.max(...state.publicationsFiltered.filter(publication => publication.year).map(publication => Number(publication.year))),
    yearMin: (state) => Math.min(...state.publicationsFiltered.filter(publication => publication.year).map(publication => Number(publication.year))),
    unreadSuggestionsCount: (state) => state.suggestedPublicationsFiltered.filter(
      (publication) => !publication.isRead
    ).length,
    isKeywordLinkedToActive: (state) => (keyword) => state.activePublication && state.activePublication.boostKeywords.includes(keyword),
    uniqueBoostKeywords: (state) => parseUniqueBoostKeywords(state.boostKeywordString),
    isSelected: (state) => (doi) => state.selectedPublicationsDois.includes(doi),
    isExcluded: (state) => (doi) => state.excludedPublicationsDois.includes(doi),
    getSelectedPublicationByDoi: (state) => (doi) => state.selectedPublications.filter(publication => publication.doi === doi)[0],
  },
  actions: {
    
    clear() {
      this.selectedPublications = []
      this.excludedPublicationsDois = []
      this.suggestion = ""
      this.maxSuggestions = PAGINATION.INITIAL_SUGGESTIONS_COUNT
      this.boostKeywordString = ""
      this.isBoost = true
      this.activePublication = ""
      this.readPublicationsDois = new Set()
      this.filter = new Filter()
      this.addQuery = ""
      this.sessionName = ""
    },

    removeFromExcludedPublication(doi) {
      this.excludedPublicationsDois = this.excludedPublicationsDois.filter(excludedDoi => excludedDoi != doi)
    },

    setBoostKeywordString(boostKeywordString) {
      this.boostKeywordString = boostKeywordString;
      this.updateScores();
    },

    setSessionName(sessionName) {
      this.sessionName = sessionName || "";
    },

    generateFilename(extension) {
      // Use default filename if session name is empty, null
      const isDefaultName = !this.sessionName || 
                           this.sessionName.trim() === '';
      
      if (isDefaultName) {
        return extension === 'json' ? 'session.puresuggest.json' : 'publications.bib';
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
        // Remove leading/trailing underscores
        .replace(/^_+|_+$/g, '');
      
      // Handle edge case of empty filename after sanitization
      if (!filename || filename === '_') {
        return extension === 'json' ? 'session.puresuggest.json' : 'publications.bib';
      }
      
      // Truncate if too long (leave room for extension)
      const extensionSuffix = extension === 'json' ? '.puresuggest.json' : '.bib';
      const maxLength = 250 - extensionSuffix.length;
      if (filename.length > maxLength) {
        filename = filename.substring(0, maxLength);
      }
      
      return `${filename}${extensionSuffix}`;
    },




    async addPublicationsToSelection(dois) {
      console.log(`Adding to selection publications with DOIs: ${dois}.`);
      dois.forEach((doi) => {
        doi = doi.toLowerCase();
        if (this.isExcluded(doi)) {
          this.removeFromExcludedPublication(doi);
        }
        if (!this.getSelectedPublicationByDoi(doi)) {
          this.selectedPublications.push(new Publication(doi));
        }
      });
    },




    updateScores() {
      console.log("Updating scores of publications and reordering them.");

      // Normalize boost keyword string
      this.boostKeywordString = normalizeBoostKeywordString(this.boostKeywordString);

      // Update scores for all publications
      updatePublicationScores(this.publications, this.uniqueBoostKeywords, this.isBoost);

      Publication.sortPublications(this.selectedPublications);
      Publication.sortPublications(this.suggestedPublications);
    },


    setActivePublication(doi) {
      // Clear all active states first
      this.publications.forEach((publication) => {
        publication.isActive = false;
        publication.isLinkedToActive = false;
      });
      // Set active state for selected publications
      this.selectedPublications.forEach((selectedPublication) => {
        const isActive = selectedPublication.doi === doi
        selectedPublication.isActive = isActive;
        if (isActive) {
          this.activePublication = selectedPublication;
          this.selectedPublications.forEach((publication) => {
            publication.isLinkedToActive =
              selectedPublication.citationDois.indexOf(publication.doi) >= 0 ||
              selectedPublication.referenceDois.indexOf(publication.doi) >= 0;
          });
          this.suggestedPublications.forEach((publication) => {
            publication.isLinkedToActive =
              selectedPublication.citationDois.indexOf(publication.doi) >= 0 ||
              selectedPublication.referenceDois.indexOf(publication.doi) >= 0;
          });
        }
      });
      // Set active state for suggested publications
      this.suggestedPublications.forEach((suggestedPublication) => {
        const isActive = suggestedPublication.doi === doi
        suggestedPublication.isActive = isActive;
        if (isActive) {
          suggestedPublication.isRead = true;
          this.readPublicationsDois.add(doi);
          this.activePublication = suggestedPublication;
          this.selectedPublications.forEach((publication) => {
            publication.isLinkedToActive =
              suggestedPublication.citationDois.indexOf(publication.doi) >= 0 ||
              suggestedPublication.referenceDois.indexOf(publication.doi) >= 0;
          });
        }
      });
      console.log(`Highlighted as active publication with DOI ${doi}.`);
    },


    clearActivePublication(source) {
      if (!this.activePublication) {
        return;
      }

      const previousDoi = this.activePublication.doi
      this.activePublication = undefined;
      this.publications.forEach((publication) => {
        publication.isActive = false;
        publication.isLinkedToActive = false;
      });
      console.log(
        `Cleared active publication ${previousDoi}, triggered by "${source}".`
      );
    },

    hoverPublication(publication, isHovered) {
      if (publication.isHovered !== isHovered) {
        publication.isHovered = isHovered;
        this.hasUpdated();
      }
    },


    // This method can be watched to manually trigger updates 
    hasUpdated() {
    },



    exportSession: function () {
      let data = {
        name: this.sessionName,
        selected: this.selectedPublicationsDois,
        excluded: this.excludedPublicationsDois,
        boost: this.uniqueBoostKeywords.join(", "),
      };
      const filename = this.generateFilename('json');
      saveAsFile(filename, "application/json", JSON.stringify(data));
    },



    exportAllBibtex: function () {
      this.exportBibtex(this.selectedPublications);
    },

    exportSingleBibtex: function (publication) {
      this.exportBibtex([publication]);
    },

    exportBibtex: function (publicationList) {
      let bib = "";
      publicationList.forEach(
        (publication) => (bib += generateBibtex(publication) + "\n\n")
      );
      const filename = this.generateFilename('bib');
      saveAsFile(filename, "application/x-bibtex", bib);
    },

  }
})

function asDois(publications) {
  return publications.map((publication) => publication.doi);
}

