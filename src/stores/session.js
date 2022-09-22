import { defineStore } from 'pinia'

import { useInterfaceStore } from "./interface.js";

import Publication from "./../Publication.js";
import Filter from '../Filter.js';
import { shuffle, saveAsFile } from "./../Util.js"
import { clearCache } from "./../Cache.js";

export const useSessionStore = defineStore('session', {
  state: () => {
    return {
      interfaceStore: useInterfaceStore(),
      selectedPublications: [],
      selectedQueue: [],
      excludedPublicationsDois: [],
      excludedQueue: [],
      suggestion: "",
      maxSuggestions: 50,
      boostKeywordString: "",
      activePublication: "",
      readPublicationsDois: new Set(),
      filter: new Filter(),
    }
  },
  getters: {
    selectedPublicationsDois: (state) => asDois(state.selectedPublications),
    selectedPublicationsCount: (state) => state.selectedPublications.length,
    excludedPublicationsCount: (state) => state.excludedPublicationsDois.length,
    suggestedPublications: (state) => state.suggestion ? state.suggestion.publications : [],
    suggestedPublicationsFiltered: (state) =>
      state.suggestedPublications.filter(publication => state.filter.matches(publication)),
    publications: (state) => state.selectedPublications.concat(state.suggestedPublications),
    publicationsFiltered: (state) => state.selectedPublications.concat(state.suggestedPublicationsFiltered),
    yearMax: (state) => Math.max(...state.publicationsFiltered.filter(publication => publication.year).map(publication => Number(publication.year))),
    yearMin: (state) => Math.min(...state.publicationsFiltered.filter(publication => publication.year).map(publication => Number(publication.year))),
    unreadSuggestionsCount: (state) => state.suggestedPublicationsFiltered.filter(
      (publication) => !publication.isRead
    ).length,
    boostKeywords: (state) => state.boostKeywordString.toLowerCase().split(/,\s*/),
    isKeywordLinkedToActive: (state) => (keyword) => state.activePublication && state.activePublication.boostKeywords.includes(keyword),
    uniqueBoostKeywords: (state) => [...new Set(state.boostKeywords)],
    isUpdatable: (state) => state.selectedQueue.length > 0 || state.excludedQueue.length > 0,
    isEmpty: (state) =>
      state.selectedPublicationsCount === 0
      && state.excludedPublicationsCount === 0
      && state.selectedQueue.length === 0
      && !state.isUpdatable,
    isSelected: (state) => (doi) => state.selectedPublicationsDois.includes(doi),
    isExcluded: (state) => (doi) => state.excludedPublicationsDois.includes(doi),
    isQueuingForSelected: (state) => (doi) => state.selectedQueue.includes(doi),
    isQueuingForExcluded: (state) => (doi) => state.excludedQueue.includes(doi),
    getSelectedPublicationByDoi: (state) => (doi) => state.selectedPublications.filter(publication => publication.doi === doi)[0],
  },
  actions: {
    clear() {
      this.selectedPublications = [];
      this.selectedQueue = [];
      this.excludedPublicationsDois = [];
      this.excludedQueue = [];
      this.suggestion = "";
      this.maxSuggestions = 50;
      this.boostKeywordString = "";
      this.activePublication = "";
      this.filter = new Filter();
      // do not reset read publications as the user might to carry this information to the next session
      this.interfaceStore.clear();
    },

    removeFromExcludedPublication(doi) {
      this.excludedPublicationsDois = this.excludedPublicationsDois.filter(excludedDoi => excludedDoi != doi)
    },

    setBoostKeywordString(boostKeywordString) {
      this.boostKeywordString = boostKeywordString;
      this.updateScores();
    },

    queueForSelected(dois) {
      if (!Array.isArray(dois)) dois = [dois];
      this.excludedQueue = this.excludedQueue.filter(excludedDoi => !dois.includes(excludedDoi));
      dois.forEach(doi => {
        if (this.isSelected(doi) || this.selectedQueue.includes(doi)) return;
        this.selectedQueue.push(doi);
      });
    },

    queueForExcluded(doi) {
      if (this.isExcluded(doi) || this.excludedQueue.includes(doi)) return
      this.selectedQueue = this.selectedQueue.filter(seletedDoi => doi != seletedDoi);
      this.excludedQueue.push(doi);
    },

    removeFromQueues(doi) {
      this.selectedQueue = this.selectedQueue.filter(seletedDoi => doi != seletedDoi);
      this.excludedQueue = this.excludedQueue.filter(excludedDoi => doi != excludedDoi);
    },

    clearQueues() {
      this.excludedQueue = [];
      this.selectedQueue = [];
    },

    async updateQueued() {
      this.clearActivePublication();
      if (this.excludedQueue.length) {
        this.excludedPublicationsDois = this.excludedPublicationsDois.concat(this.excludedQueue);
      }
      this.selectedPublications = this.selectedPublications.filter(
        publication => !this.excludedQueue.includes(publication.doi)
      );
      this.suggestion.publications = this.suggestion.publications.filter(
        publication => (!this.selectedQueue.includes(publication.doi) && !this.excludedQueue.includes(publication.doi))
      );
      if (this.selectedQueue.length) {
        this.addPublicationsToSelection(this.selectedQueue);
      }
      await this.updateSuggestions();
      if (
        !this.interfaceStore.feedbackInvitationShown &&
        this.selectedPublications.length >= 10
      ) {
        this.interfaceStore.showFeedbackInvitation();
      }
      this.excludedQueue = [];
      this.selectedQueue = [];
    },

    async addPublicationsAndUpdate(dois) {
      dois.forEach((doi) => this.removeFromQueues(doi));
      await this.addPublicationsToSelection(dois);
      await this.updateSuggestions();
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

    async updateSuggestions(maxSuggestions = 50) {
      this.maxSuggestions = maxSuggestions;
      this.interfaceStore.startLoading();
      let publicationsLoaded = 0;
      this.interfaceStore.updateLoadingToast(
        `${publicationsLoaded}/${this.selectedPublicationsCount} selected publications loaded`,
        "is-primary"
      );
      await Promise.all(
        this.selectedPublications.map(async (publication) => {
          await publication.fetchData();
          publication.isSelected = true;
          publicationsLoaded++;
          this.interfaceStore.updateLoadingToast(
            `${publicationsLoaded}/${this.selectedPublicationsCount} selected publications loaded`,
            "is-primary"
          );
        })
      );
      await this.computeSuggestions();
      this.interfaceStore.endLoading();
    },

    async computeSuggestions() {

      function incrementSuggestedPublicationCounter(
        _this,
        doi,
        counter,
        doiList,
        sourceDoi
      ) {
        if (!_this.isExcluded(doi)) {
          if (!_this.isSelected(doi)) {
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
      this.interfaceStore.updateLoadingToast(`${publicationsLoadedCount}/${filteredSuggestions.length} suggestions loaded`, "is-info");
      await Promise.all(filteredSuggestions.map(async (suggestedPublication) => {
        await suggestedPublication.fetchData()
        publicationsLoadedCount++;
        this.interfaceStore.updateLoadingToast(`${publicationsLoadedCount}/${filteredSuggestions.length} suggestions loaded`, "is-info");
      }));
      filteredSuggestions.forEach((publication) => {
        publication.isRead = this.readPublicationsDois.has(publication.doi);
      });
      console.log("Completed computing and loading of new suggestions.");
      preloadSuggestions.forEach(publication => {
        publication.fetchData()
      });
      this.suggestion = {
        publications: Object.values(filteredSuggestions),
        totalSuggestions: Object.values(suggestedPublications).length
      };
      this.updateScores();
    },

    updateScores() {
      console.log("Updating scores of publications and reordering them.");
      this.publications.forEach((publication) => {
        publication.updateScore(this.boostKeywords);
      });
      Publication.sortPublications(this.selectedPublications);
      Publication.sortPublications(this.suggestedPublications);
    },

    loadMoreSuggestions() {
      this.updateSuggestions(
        this.maxSuggestions + 50
      );
    },

    setActivePublication(doi) {
      this.selectedPublications.forEach((selectedPublication) => {
        selectedPublication.isActive = selectedPublication.doi === doi;
        if (selectedPublication.isActive) {
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
      this.suggestedPublications.forEach((suggestedPublication) => {
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

    activatePublicationComponentByDoi: function (doi) {
      if (doi !== this.activePublication?.doi) {
        this.interfaceStore.activatePublicationComponent(document.getElementById(doi));
        this.setActivePublication(doi);
      }
    },

    clearActivePublication(source) {
      if (!this.activePublication) return;
      this.activePublication = undefined;
      this.publications.forEach((publication) => {
        publication.isActive = false;
        publication.isLinkedToActive = false;
      });
      console.log(
        `Cleared any highlighted active publication, triggered by "${source}".`
      );
    },

    loadSession(session) {
      console.log(`Loading session ${JSON.stringify(session)}`);
      if (!session || !session.selected) {
        this.interfaceStore.showErrorMessage(
          "Cannot read session state from JSON."
        );
        return;
      }
      if (session.boost) {
        this.boostKeywordString = session.boost;
      }
      if (session.excluded) {
        this.excludedPublicationsDois = session.excluded;
      }
      this.addPublicationsToSelection(session.selected);
      this.updateSuggestions();
    },

    clearSession: function () {
      this.interfaceStore.showConfirmDialog(
        "You are going to clear all selected and excluded articles and jump back to the initial state.", this.clear);
    },

    exportSession: function () {
      let data = {
        selected: this.selectedPublicationsDois,
        excluded: this.excludedPublicationsDois,
        boost: this.boostKeywords.join(", "),
      };
      saveAsFile("session.json", "application/json", JSON.stringify(data));
    },

    importSession: function (file) {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        try {
          const content = fileReader.result;
          const session = JSON.parse(content);
          this.loadSession(session);
        } catch {
          this.interfaceStore.showErrorMessage(`Cannot read JSON from file.`);
        }
      };
      fileReader.readAsText(file);
    },

    loadExample: function () {
      const session = {
        selected: [
          "10.1109/tvcg.2015.2467757",
          "10.1109/tvcg.2015.2467621",
          "10.1002/asi.24171",
          "10.2312/evp.20221110"
        ],
        boost: "cit, visual, map",
      };
      this.loadSession(session);
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

    clearCache: function () {
      this.interfaceStore.showConfirmDialog(
        "You are going to clear the cache, as well as all selected and excluded articles and jump back to the initial state.", () => {
          this.clear();
          clearCache();
        });
    },
  }
})

function asDois(publications) {
  return publications.map((publication) => publication.doi);
}