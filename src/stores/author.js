import { defineStore } from 'pinia'
import Author from '@/core/Author.js'
import { useSessionStore } from './session.js'

export const useAuthorStore = defineStore('author', {
  state: () => {
    return {
      isAuthorScoreEnabled: true,
      isFirstAuthorBoostEnabled: true,
      isAuthorNewBoostEnabled: true,
      selectedPublicationsAuthors: [],
      activeAuthorId: null,
    }
  },
  getters: {
    activeAuthor: (state) => {
      if (!state.activeAuthorId) return null
      return state.selectedPublicationsAuthors.find(author => author.id === state.activeAuthorId) || null
    },

    isAuthorActive: (state) => (authorId) => {
      return state.activeAuthorId === authorId
    },

    selectedPublicationsForAuthor: (state) => {
      if (!state.activeAuthorId) return []
      const sessionStore = useSessionStore()
      
      return sessionStore.selectedPublications.filter(publication => {
        if (!publication.author) return false
        // Check if the active author is mentioned in the publication's author list
        const authorNames = publication.author.split(/[;,]/).map(name => name.trim())
        const activeAuthor = state.selectedPublicationsAuthors.find(author => author.id === state.activeAuthorId)
        if (!activeAuthor) return false
        
        // Check if any of the author's alternative names match
        return activeAuthor.alternativeNames.some(altName => 
          authorNames.some(pubAuthor => pubAuthor.includes(altName) || altName.includes(pubAuthor))
        )
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