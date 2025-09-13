import { defineStore } from 'pinia'

import { useSessionStore } from './session.js'

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
    },

    selectedPublicationsForAuthor: (state) => {
      if (!state.activeAuthorId) return []
      const sessionStore = useSessionStore()

      return sessionStore.selectedPublications.filter((publication) => {
        if (!publication.author) return false
        // Check if the active author is mentioned in the publication's author list
        // Split only on semicolons, not commas (commas are part of "Last, First" format)
        const authorNames = publication.author.split(';').map((name) => name.trim())
        const activeAuthor = state.selectedPublicationsAuthors.find(
          (author) => author.id === state.activeAuthorId
        )
        if (!activeAuthor) return false

        // Normalize author names using the same method as Author.nameToId for exact matching
        const normalizedPubAuthors = authorNames.map((name) =>
          name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[øØ]/g, 'o')
            .replace(/[åÅ]/g, 'a')
            .replace(/[æÆ]/g, 'ae')
            .replace(/[ðÐ]/g, 'd')
            .replace(/[þÞ]/g, 'th')
            .replace(/[ßẞ]/g, 'ss')
            .toLowerCase()
        )

        const normalizedAltNames = activeAuthor.alternativeNames.map((name) =>
          name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[øØ]/g, 'o')
            .replace(/[åÅ]/g, 'a')
            .replace(/[æÆ]/g, 'ae')
            .replace(/[ðÐ]/g, 'd')
            .replace(/[þÞ]/g, 'th')
            .replace(/[ßẞ]/g, 'ss')
            .toLowerCase()
        )

        // Check for exact matches between normalized IDs
        return normalizedAltNames.some((altName) => normalizedPubAuthors.includes(altName))
      })
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
