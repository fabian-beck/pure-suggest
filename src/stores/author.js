import { defineStore } from 'pinia'

import Author from '@/core/Author.js'

export const useAuthorStore = defineStore('author', {
  state: () => {
    return {
      isAuthorScoreEnabled: true,
      isFirstAuthorBoostEnabled: true,
      isAuthorNewBoostEnabled: true,
      selectedPublicationsAuthors: [],
      activeAuthorId: null
    }
  },
  getters: {
    activeAuthor: (state) => {
      if (!state.activeAuthorId) return null
      return (
        state.selectedPublicationsAuthors.find((author) => author.id === state.activeAuthorId) ||
        null
      )
    },

    isAuthorActive: (state) => (authorId) => {
      return state.activeAuthorId === authorId
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

    setActiveAuthor(authorId) {
      this.activeAuthorId = authorId
    },

    clearActiveAuthor() {
      this.activeAuthorId = null
    }
  }
})
