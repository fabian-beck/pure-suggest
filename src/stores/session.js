import { defineStore } from 'pinia'

import Publication from "./../Publication.js";
import { shuffle } from "./../Util.js"

export const useSessionStore = defineStore('session', {
  state: () => {
    return {
      selectedPublications: [],
      excludedPublicationsDois: [],
      suggestion: undefined,
      maxSuggestions: 50,
      boostKeywords: [],
    }
  },
  getters: {
    selectedPublicationsDois: (state) => state.selectedPublications.map((publication) => publication.doi),
    selectedPublicationsCount: (state) => state.selectedPublications.length,
    excludedPublicationsCount: (state) => state.excludedPublicationsDois.length,
    isEmpty: (state) => state.selectedPublicationsCount === 0,
    isDoiSelected: (state) => (doi) => state.selectedPublicationsDois.includes(doi),
    isDoiExcluded: (state) => (doi) => state.excludedPublicationsDois.includes(doi),
    getSelectedPublicationByDoi: (state) => (doi) => state.selectedPublications.filter(publication => publication.doi === doi)[0]
  },
  actions: {
    reset() {
      this.selectedPublications = [];
      this.excludedPublicationsDois = [];
    },
    removeFromExcludedPublicationByDoi(doi) {
      this.excludedPublicationsDois = this.excludedPublicationsDois.filter(excludedDoi => excludedDoi != doi)
    },
    excludePublicationByDoi(doi) {
      this.selectedPublications = this.selectedPublications.filter(publication => publication.doi != doi)
      this.excludedPublicationsDois.push(doi);
    },
    async computeSuggestions(updateLoadingToast) {

      function incrementSuggestedPublicationCounter(
        _this,
        doi,
        counter,
        doiList,
        sourceDoi
      ) {
        if (!_this.isDoiExcluded(doi)) {
          if (!_this.isDoiSelected(doi)) {
            if (!suggestedPublications[doi]) {
              const citingPublication = new Publication(doi);
              suggestedPublications[doi] = citingPublication;
            }
            suggestedPublications[doi][doiList].push(sourceDoi);
            suggestedPublications[doi][counter]++;
          } else {
            _this.getSelectedPublicationByDoi(doi)[counter]++;
          }
        }
      }

      console.log(`Starting to compute new suggestions based on ${this.selectedPublicationsCount} selected (and ${this.excludedPublicationsCount} excluded).`);
      const suggestedPublications = {};
      console.log(this);
      this.selectedPublications.forEach((publication) => {
        publication.citationCount = 0;
        publication.referenceCount = 0;
      });
      this.selectedPublications.forEach((publication) => {
        publication.citationDois.forEach((citationDoi) => {
          incrementSuggestedPublicationCounter(
            this,
            citationDoi,
            "citationCount",
            "referenceDois",
            publication.doi
          );
        });
        publication.referenceDois.forEach((referenceDoi) => {
          incrementSuggestedPublicationCounter(
            this,
            referenceDoi,
            "referenceCount",
            "citationDois",
            publication.doi
          );
        });
      });
      this.selectedPublications.forEach((publication) =>
        publication.updateScore(this.boostKeywords)
      );
      let filteredSuggestions = Object.values(suggestedPublications);
      filteredSuggestions = shuffle(filteredSuggestions, 0);
      console.log(`Identified ${filteredSuggestions.length} publications as suggestions.`);
      // titles not yet fetched, that is why sorting can be only done on citations/references
      filteredSuggestions.sort(
        (a, b) =>
          b.citationCount + b.referenceCount - (a.citationCount + a.referenceCount)
      );
      const preloadSuggestions = filteredSuggestions.slice(this.maxSuggestions, this.maxSuggestions + 50);
      filteredSuggestions = filteredSuggestions.slice(0, this.maxSuggestions);
      console.log(`Filtered suggestions to ${filteredSuggestions.length} top candidates, loading metadata for these.`);
      let publicationsLoadedCount = 0;
      updateLoadingToast(`${publicationsLoadedCount}/${filteredSuggestions.length} suggestions loaded`, "is-info");
      await Promise.all(filteredSuggestions.map(async (suggestedPublication) => {
        await suggestedPublication.fetchData()
        publicationsLoadedCount++;
        updateLoadingToast(`${publicationsLoadedCount}/${filteredSuggestions.length} suggestions loaded`, "is-info");
      }));
      filteredSuggestions.forEach((publication) =>
        publication.updateScore(this.boostKeywords)
      );
      Publication.sortPublications(filteredSuggestions);
      console.log("Completed computing and loading of new suggestions.");
      preloadSuggestions.forEach(publication => {
        publication.fetchData()
      });
      this.suggestion = {
        publications: Object.values(filteredSuggestions),
        totalSuggestions: Object.values(suggestedPublications).length
      };
    },
  }
})
