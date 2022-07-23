import { defineStore } from 'pinia'

import Publication from "./../Publication.js";
import { shuffle, saveAsFile } from "./../Util.js"

export const useSessionStore = defineStore('session', {
  state: () => {
    return {
      selectedPublications: [],
      excludedPublicationsDois: [],
      suggestion: undefined,
      maxSuggestions: 50,
      boostKeywords: [],
      activePublication: undefined,
      readPublicationsDois: new Set(),
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
      this.readPublicationsDois = new Set();
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
      this.clearActivePublication("updating suggestions");
      const suggestedPublications = {};
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
      filteredSuggestions.forEach((publication) => {
        publication.updateScore(this.boostKeywords);
        publication.isRead = this.readPublicationsDois.has(publication.doi);
    });
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

    setActivePublication: function (doi) {
      this.clearActivePublication("setting active publication");
      this.selectedPublications.forEach((selectedPublication) => {
        selectedPublication.isActive = selectedPublication.doi === doi;
        if (selectedPublication.isActive) {
          this.activePublication = selectedPublication;
          this.selectedPublications.forEach((publication) => {
            publication.isLinkedToActive =
              selectedPublication.citationDois.indexOf(publication.doi) >= 0 ||
              selectedPublication.referenceDois.indexOf(publication.doi) >= 0;
          });
          this.suggestion.publications.forEach((publication) => {
            publication.isLinkedToActive =
              selectedPublication.citationDois.indexOf(publication.doi) >= 0 ||
              selectedPublication.referenceDois.indexOf(publication.doi) >= 0;
          });
        }
      });
      this.suggestion.publications.forEach((suggestedPublication) => {
        suggestedPublication.isActive = suggestedPublication.doi === doi;
        if (suggestedPublication.isActive) {
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

    clearActivePublication: function (source) {
      this.activePublication = undefined;
      this.selectedPublications
        .concat(this.suggestion ? this.suggestion.publications : [])
        .forEach((publication) => {
          publication.isActive = false;
          publication.isLinkedToActive = false;
        });
      console.log(
        `Cleared any highlighted active publication, triggered by "${source}".`
      );
    },

    exportSession: function () {
      let data = {
        selected: this.selectedPublicationsDois,
        excluded: this.excludedPublicationsDois,
        boost: this.boostKeywords.join(", "),
      };
      saveAsFile("session.json", "application/json", JSON.stringify(data));
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
        (publication) => (bib += publication.toBibtex() + "\n\n")
      );
      saveAsFile("publications.bib", "application/x-bibtex", bib);
    },
  }
})
