import { defineStore } from 'pinia'
import Author from '@/Author.js'

export const useAuthorStore = defineStore('author', {
  state: () => {
    return {
      isAuthorScoreEnabled: true,
      isFirstAuthorBoostEnabled: true,
      isAuthorNewBoostEnabled: true,
      selectedPublicationsAuthors: [],
    }
  },
  actions: {
    computeSelectedPublicationsAuthors(selectedPublications) {
      this.selectedPublicationsAuthors = Author.computePublicationsAuthors(
        selectedPublications, 
        this.isAuthorScoreEnabled, 
        this.isFirstAuthorBoostEnabled, 
        this.isAuthorNewBoostEnabled
      )
    },

    updateSettings(settings) {
      if (Object.prototype.hasOwnProperty.call(settings, 'isAuthorScoreEnabled')) {
        this.isAuthorScoreEnabled = settings.isAuthorScoreEnabled
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'isFirstAuthorBoostEnabled')) {
        this.isFirstAuthorBoostEnabled = settings.isFirstAuthorBoostEnabled
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'isAuthorNewBoostEnabled')) {
        this.isAuthorNewBoostEnabled = settings.isAuthorNewBoostEnabled
      }
    }
  }
})