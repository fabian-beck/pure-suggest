import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', {
  state: () => {
    return {
      selectedPublications: [],
    }
  },
  getters: {
    selectedPublicationsDois: (state) => {
      return state.selectedPublications.map((publication) => publication.doi);
    },
  },
})
