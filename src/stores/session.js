import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', {
  state: () => {
    return {
      selectedPublications: [],
      excludedPublicationsDois: [],
    }
  },
  getters: {
    selectedPublicationsDois: (state) => state.selectedPublications.map((publication) => publication.doi),
    selectedPublicationsCount: (state) => state.selectedPublications.length,
    excludedPublicationsCount: (state) => state.excludedPublicationsDois.length,
    isDoiExcluded: (state) => (doi) => state.excludedPublicationsDois.includes(doi),
    isEmpty: (state) => state.selectedPublicationsCount === 0,
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
      this.excludedPublicationsDois.push(doi);
    },
  }
})
