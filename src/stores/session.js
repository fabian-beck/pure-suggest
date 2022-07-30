import { defineStore } from 'pinia'

import { useInterfaceStore } from "./interface.js";

import Publication from "./../Publication.js";
import { shuffle, saveAsFile } from "./../Util.js"

export const useSessionStore = defineStore('session', {
  state: () => {
    return {
      selectedPublications: [],
      selectedQueue: [],
      excludedPublicationsDois: [],
      suggestion: undefined,
      maxSuggestions: 50,
      boostKeywordString: "",
      activePublication: undefined,
      readPublicationsDois: new Set(),
    }
  },
  getters: {
    selectedPublicationsDois: (state) => state.selectedPublications.map((publication) => publication.doi),
    selectedPublicationsCount: (state) => state.selectedPublications.length,
    excludedPublicationsCount: (state) => state.excludedPublicationsDois.length,
    suggestedPublications: (state) => state.suggestion ? state.suggestion.publications : [],
    publications: (state) => state.selectedPublications.concat(state.suggestedPublications),
    unreadSuggestionsCount: (state) => state.suggestedPublications.filter(
      (publication) => !publication.isRead
    ).length,
    boostKeywords: (state) => state.boostKeywordString.toLowerCase().split(/,\s*/),
    isUpdatable: (state) => state.selectedQueue.length > 0,
    isEmpty: (state) =>
      state.selectedPublicationsCount === 0
      && state.excludedPublicationsCount === 0
      && state.selectedQueue.length === 0,
    isDoiSelected: (state) => (doi) => state.selectedPublicationsDois.includes(doi),
    isDoiExcluded: (state) => (doi) => state.excludedPublicationsDois.includes(doi),
    getSelectedPublicationByDoi: (state) => (doi) => state.selectedPublications.filter(publication => publication.doi === doi)[0]
  },
  actions: {
    clear() {
      this.selectedPublications = [];
      this.selectedQueue = [],
      this.excludedPublicationsDois = [];
      this.suggestion = undefined;
      this.maxSuggestions = 50;
      this.boostKeywordString = "";
      this.activePublication = undefined;
      // do not reset read publications as the user might to carry this information to the next session
    },

    removeFromExcludedPublicationByDoi(doi) {
      this.excludedPublicationsDois = this.excludedPublicationsDois.filter(excludedDoi => excludedDoi != doi)
    },

    excludePublicationByDoi(doi) {
      this.selectedPublications = this.selectedPublications.filter(publication => publication.doi != doi)
      this.excludedPublicationsDois.push(doi);
    },

    setBoostKeywordString(boostKeywordString) {
      this.boostKeywordString = boostKeywordString;
      this.updateScores();
    },

    queueForSelected(doi) {
      this.selectedQueue.push(doi);
    },

    updateQueued() {
      this.addPublicationsToSelection(this.selectedQueue);
      this.selectedQueue = [];
    },

    addPublicationsToSelection: async function (dois) {
      const interfaceStore = useInterfaceStore();
      console.log(`Adding to selection publications with DOIs: ${dois}.`);
      document.activeElement.blur();
      if (typeof dois === "string") {
        dois = [dois];
      }
      let addedPublicationsCount = 0;
      let addedDoi = "";
      dois.forEach((doi) => {
        doi = doi.toLowerCase();
        if (this.isDoiExcluded(doi)) {
          this.removeFromExcludedPublicationByDoi(doi); // todo
        }
        if (!this.getSelectedPublicationByDoi(doi)) {
          this.selectedPublications.push(new Publication(doi));
          addedDoi = doi;
          addedPublicationsCount++;
        }
      });
      if (addedPublicationsCount > 0) {
        await this.updateSuggestions();
        if (addedPublicationsCount == 1) {
          this.activatePublicationComponentByDoi(addedDoi);
        }
        interfaceStore.showMessage(
          `Added ${addedPublicationsCount === 1
            ? "a publication"
            : addedPublicationsCount + " publications"
          } to selected`
        );
      } else {
        interfaceStore.showMessage(
          `Publication${dois.length > 1 ? "s" : ""} already in selected`
        );
        interfaceStore.endLoading();
      }
      if (
        !interfaceStore.feedbackInvitationShown &&
        this.selectedPublications.length >= 10
      ) {
        interfaceStore.showFeedbackInvitation();
      }
    },

    async updateSuggestions(maxSuggestions = 50) {
      const interfaceStore = useInterfaceStore();
      this.maxSuggestions = maxSuggestions;
      interfaceStore.startLoading();
      let publicationsLoaded = 0;
      interfaceStore.updateLoadingToast(
        `${publicationsLoaded}/${this.selectedPublicationsCount} selected publications loaded`,
        "is-primary"
      );
      await Promise.all(
        this.selectedPublications.map(async (publication) => {
          await publication.fetchData();
          publication.isSelected = true;
          publicationsLoaded++;
          interfaceStore.updateLoadingToast(
            `${publicationsLoaded}/${this.selectedPublicationsCount} selected publications loaded`,
            "is-primary"
          );
        })
      );
      await this.computeSuggestions();
      interfaceStore.endLoading();
    },

    async computeSuggestions() {

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
      const interfaceStore = useInterfaceStore();
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
      interfaceStore.updateLoadingToast(`${publicationsLoadedCount}/${filteredSuggestions.length} suggestions loaded`, "is-info");
      await Promise.all(filteredSuggestions.map(async (suggestedPublication) => {
        await suggestedPublication.fetchData()
        publicationsLoadedCount++;
        interfaceStore.updateLoadingToast(`${publicationsLoadedCount}/${filteredSuggestions.length} suggestions loaded`, "is-info");
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

    setActivePublication: function (doi) {
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
        this.activatePublicationComponent(document.getElementById(doi));
        this.setActivePublication(doi);
      }
    },

    activatePublicationComponent: function (publicationComponent) {
      if (publicationComponent) {
        publicationComponent.focus();
      }
    },

    clearActivePublication: function (source) {
      this.activePublication = undefined;
      this.publications.forEach((publication) => {
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