import { defineStore } from 'pinia'

export const useQueueStore = defineStore('queue', {
  state: () => {
    return {
      selectedQueue: [],
      excludedQueue: [],
    }
  },
  getters: {
    isUpdatable: (state) => state.selectedQueue.length > 0 || state.excludedQueue.length > 0,
    isQueuingForSelected: (state) => (doi) => state.selectedQueue.includes(doi),
    isQueuingForExcluded: (state) => (doi) => state.excludedQueue.includes(doi),
  },
  actions: {

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

    // This method can be watched to manually trigger updates 
    hasUpdated() {
    },
  }
})