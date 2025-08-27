import { defineStore } from 'pinia'

import { useInterfaceStore } from "./interface.js";

import Publication from "@/Publication.js";
import { generateBibtex } from "@/utils/bibtex.js";
import { getFilteredPublications, countFilteredPublications } from "@/utils/filterUtils.js";
import { normalizeBoostKeywordString, parseUniqueBoostKeywords, updatePublicationScores } from "@/utils/scoringUtils.js";
import Filter from '@/Filter.js';
import Author from '@/Author.js';
import { shuffle, saveAsFile } from "@/Util.js"
import { clearCache } from "@/Cache.js";
import { PAGINATION } from "@/constants/ui.js";


export const useSessionStore = defineStore('session', {
  state: () => {
    return {
      interfaceStore: useInterfaceStore(),
      selectedPublications: [],
      selectedPublicationsAuthors: [],
      selectedQueue: [],
      excludedPublicationsDois: [],
      excludedQueue: [],
      suggestion: "",
      maxSuggestions: PAGINATION.INITIAL_SUGGESTIONS_COUNT,
      boostKeywordString: "",
      isBoost: true,
      activePublication: "",
      readPublicationsDois: new Set(),
      filter: new Filter(),
      addQuery: "",
      isAuthorScoreEnabled: true,
      isFirstAuthorBoostEnabled: true,
      isAuthorNewBoostEnabled: true,
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
      this.selectedPublicationsAuthors = [];
      this.selectedQueue = [];
      this.excludedPublicationsDois = [];
      this.excludedQueue = [];
      this.suggestion = "";
      this.maxSuggestions = PAGINATION.INITIAL_SUGGESTIONS_COUNT;
      this.boostKeywordString = "";
      this.activePublication = "";
      this.filter = new Filter();
      this.addQuery = "";
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
      this.hasUpdated(`Queued ${dois.length} publication(s) for selection.`);
    },

    queueForExcluded(doi) {
      if (this.isExcluded(doi) || this.excludedQueue.includes(doi)) return
      this.selectedQueue = this.selectedQueue.filter(seletedDoi => doi != seletedDoi);
      this.excludedQueue.push(doi);
      this.hasUpdated(`Queued ${doi} for exclusion.`);
    },

    removeFromQueues(doi) {
      this.selectedQueue = this.selectedQueue.filter(seletedDoi => doi != seletedDoi);
      this.excludedQueue = this.excludedQueue.filter(excludedDoi => doi != excludedDoi);
      this.hasUpdated(`Removed ${doi} from queues.`);
    },

    clearQueues() {
      this.excludedQueue = [];
      this.selectedQueue = [];
      this.hasUpdated(`Cleared queues.`);
    },

    async updateQueued() {
      const startTime = performance.now();
      console.log(`[PERF] Starting queue update workflow (${this.selectedQueue.length} to add, ${this.excludedQueue.length} to exclude)`);
      
      // Store the start time for end-to-end measurement
      this._workflowStartTime = startTime;
      this._isTrackingWorkflow = true;
      
      this.clearActivePublication();
      if (this.excludedQueue.length) {
        this.excludedPublicationsDois = this.excludedPublicationsDois.concat(this.excludedQueue);
      }
      this.selectedPublications = this.selectedPublications.filter(
        publication => !this.excludedQueue.includes(publication.doi)
      );
      if (this.suggestion) {
        this.suggestion.publications = this.suggestion.publications.filter(
          publication => (!this.selectedQueue.includes(publication.doi) && !this.excludedQueue.includes(publication.doi))
        );
      }
      if (this.selectedQueue.length) {
        this.addPublicationsToSelection(this.selectedQueue);
      }
      await this.updateSuggestions();
      this.clearQueues();
    },

    async addPublicationsAndUpdate(dois) {
      const startTime = performance.now();
      console.log(`[PERF] Starting manual publication add workflow for ${dois.length} publications`);
      
      // Store the start time for end-to-end measurement
      this._workflowStartTime = startTime;
      this._isTrackingWorkflow = true;
      
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

    async updateSuggestions(maxSuggestions = PAGINATION.INITIAL_SUGGESTIONS_COUNT) {
      this.maxSuggestions = maxSuggestions;
      this.interfaceStore.startLoading();
      let publicationsLoaded = 0;
      this.interfaceStore.loadingMessage =
        `${publicationsLoaded}/${this.selectedPublicationsCount} selected publications loaded`;
      await Promise.all(
        this.selectedPublications.map(async (publication) => {
          await publication.fetchData();
          publication.isSelected = true;
          publicationsLoaded++;
          this.interfaceStore.loadingMessage = `${publicationsLoaded}/${this.selectedPublicationsCount} selected publications loaded`;
        })
      );
      await this.computeSuggestions();
      this.interfaceStore.endLoading();
      
      // Log end-to-end workflow timing if we're tracking one
      if (this._isTrackingWorkflow && this._workflowStartTime) {
        const totalDuration = performance.now() - this._workflowStartTime;
        console.log(`[PERF] 🎯 END-TO-END WORKFLOW COMPLETED: ${totalDuration.toFixed(0)}ms (${(totalDuration/1000).toFixed(2)}s)`);
        
        // Reset tracking flags
        this._isTrackingWorkflow = false;
        this._workflowStartTime = null;
      }
    },

    computeSelectedPublicationsAuthors() {
      this.selectedPublicationsAuthors = Author.computePublicationsAuthors(
        this.selectedPublications, this.isAuthorScoreEnabled, this.isFirstAuthorBoostEnabled, this.isAuthorNewBoostEnabled);
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
      
      const preloadSuggestions = filteredSuggestions.slice(this.maxSuggestions, this.maxSuggestions + PAGINATION.LOAD_MORE_INCREMENT);
      filteredSuggestions = filteredSuggestions.slice(0, this.maxSuggestions);
      console.log(`Filtered suggestions to ${filteredSuggestions.length} top candidates, loading metadata for these.`);
      let publicationsLoadedCount = 0;
      this.interfaceStore.loadingMessage = `${publicationsLoadedCount}/${filteredSuggestions.length} suggestions loaded`, "info";
      await Promise.all(filteredSuggestions.map(async (suggestedPublication) => {
        await suggestedPublication.fetchData()
        publicationsLoadedCount++;
        this.interfaceStore.loadingMessage = `${publicationsLoadedCount}/${filteredSuggestions.length} suggestions loaded`;
      }));
      
      filteredSuggestions.forEach((publication) => {
        publication.isRead = this.readPublicationsDois.has(publication.doi);
      });
      console.log("Completed computing and loading of new suggestions.");
      preloadSuggestions.forEach(publication => {
        publication.fetchData()
      });
      this.suggestion = {
        publications: filteredSuggestions,
        totalSuggestions: Object.values(suggestedPublications).length
      };
      
      this.updateScores();
    },

    updateScores() {
      console.log("Updating scores of publications and reordering them.");
      
      // Normalize boost keyword string
      this.boostKeywordString = normalizeBoostKeywordString(this.boostKeywordString);
      
      // Update scores for all publications
      updatePublicationScores(this.publications, this.uniqueBoostKeywords, this.isBoost);
      
      Publication.sortPublications(this.selectedPublications);
      Publication.sortPublications(this.suggestedPublications);
      
      this.computeSelectedPublicationsAuthors();
    },

    loadMoreSuggestions() {
      console.log("Loading more suggestions.");
      this.updateSuggestions(
        this.maxSuggestions + PAGINATION.LOAD_MORE_INCREMENT
      );
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

    activatePublicationComponentByDoi: function (doi) {
      if (doi !== this.activePublication?.doi) {
        this.interfaceStore.activatePublicationComponent(document.getElementById(doi));
        this.setActivePublication(doi);
      }
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

    async retryLoadingPublication(publication) {
      this.interfaceStore.startLoading();
      this.interfaceStore.loadingMessage = "Retrying to load metadata";
      await publication.fetchData(true);
      await this.updateSuggestions();
      this.activatePublicationComponentByDoi(publication.doi);
    },

    // This method can be watched to manually trigger updates 
    hasUpdated() {
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
        this.setBoostKeywordString(session.boost);
      }
      if (session.excluded) {
        this.excludedPublicationsDois = session.excluded;
      }
      this.addPublicationsToSelection(session.selected);
      
      // Mark that we're tracking a workflow
      this._isTrackingWorkflow = true;
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
        boost: this.uniqueBoostKeywords.join(", "),
      };
      saveAsFile("session.json", "application/json", JSON.stringify(data));
    },

    importSession: function (file) {
      const startTime = performance.now();
      console.log("[PERF] Starting session import workflow");
      
      const fileReader = new FileReader();
      fileReader.onload = () => {
        let content;
        try {
          content = fileReader.result;
          const session = JSON.parse(content);
          // Store the start time for end-to-end measurement
          this._workflowStartTime = startTime;
          this.loadSession(session);
        } catch (error) {
          console.error('Session import error:', error);
          console.error('File content preview:', content?.substring(0, 200));
          this.interfaceStore.showErrorMessage(`Cannot read JSON from file: ${error.message}`);
        }
      };
      fileReader.readAsText(file);
    },

    loadExample: function () {
      const startTime = performance.now();
      console.log("[PERF] Starting example load workflow");
      
      const session = {
        selected: [
          "10.1109/tvcg.2015.2467757",
          "10.1109/tvcg.2015.2467621",
          "10.1002/asi.24171",
          "10.2312/evp.20221110"
        ],
        boost: "cit, visual, map, publi|literat",
      };
      
      // Store the start time for end-to-end measurement
      this._workflowStartTime = startTime;
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
        (publication) => (bib += generateBibtex(publication) + "\n\n")
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

