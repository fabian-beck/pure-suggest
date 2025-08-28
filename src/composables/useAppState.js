import { computed } from 'vue'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'
import Filter from '@/Filter.js'
import { PAGINATION } from '@/constants/ui.js'
import { clearCache as clearCacheUtil } from '@/Cache.js'

export function useAppState() {
  // This composable will gradually receive functionality from the session store
  
  const sessionStore = useSessionStore()
  const interfaceStore = useInterfaceStore()
  
  /**
   * Computes whether the session is empty (no publications selected/excluded/queued)
   * @returns {ComputedRef<boolean>} True if session is empty
   */
  const isEmpty = computed(() => 
    sessionStore.selectedPublicationsCount === 0
    && sessionStore.excludedPublicationsCount === 0
    && sessionStore.selectedQueue.length === 0
    && !sessionStore.isUpdatable
  )

  /**
   * Clears all session data and resets to initial state
   */
  const clear = () => {
    sessionStore.selectedPublications = []
    sessionStore.selectedPublicationsAuthors = []
    sessionStore.selectedQueue = []
    sessionStore.excludedPublicationsDois = []
    sessionStore.excludedQueue = []
    sessionStore.suggestion = ""
    sessionStore.maxSuggestions = PAGINATION.INITIAL_SUGGESTIONS_COUNT
    sessionStore.boostKeywordString = ""
    sessionStore.activePublication = ""
    sessionStore.filter = new Filter()
    sessionStore.addQuery = ""
    // do not reset read publications as the user might to carry this information to the next session
    interfaceStore.clear()
  }

  /**
   * Shows confirmation dialog and clears session if confirmed
   */
  const clearSession = () => {
    interfaceStore.showConfirmDialog(
      "You are going to clear all selected and excluded articles and jump back to the initial state.", 
      clear
    )
  }

  /**
   * Shows confirmation dialog and clears both session and cache if confirmed
   */
  const clearCache = () => {
    interfaceStore.showConfirmDialog(
      "You are going to clear the cache, as well as all selected and excluded articles and jump back to the initial state.", 
      () => {
        clear()
        clearCacheUtil()
      }
    )
  }
  
  return {
    isEmpty,
    clear,
    clearSession,
    clearCache
  }
}