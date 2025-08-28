import { computed } from 'vue'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useAuthorStore } from '@/stores/author.js'
import Filter from '@/Filter.js'
import { PAGINATION } from '@/constants/ui.js'
import { clearCache as clearCacheUtil } from '@/Cache.js'
import { SuggestionService } from '@/services/SuggestionService.js'

export function useAppState() {
  // This composable will gradually receive functionality from the session store
  
  const sessionStore = useSessionStore()
  const interfaceStore = useInterfaceStore()
  const authorStore = useAuthorStore()
  
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
    sessionStore.selectedQueue = []
    sessionStore.excludedPublicationsDois = []
    sessionStore.excludedQueue = []
    sessionStore.suggestion = ""
    sessionStore.maxSuggestions = PAGINATION.INITIAL_SUGGESTIONS_COUNT
    sessionStore.boostKeywordString = ""
    sessionStore.activePublication = ""
    sessionStore.filter = new Filter()
    sessionStore.addQuery = ""
    // Clear author store
    authorStore.selectedPublicationsAuthors = []
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

  /**
   * Updates suggestions based on selected publications
   */
  const updateSuggestions = async (maxSuggestions = PAGINATION.INITIAL_SUGGESTIONS_COUNT) => {
    sessionStore.maxSuggestions = maxSuggestions
    interfaceStore.startLoading()
    let publicationsLoaded = 0
    interfaceStore.loadingMessage = `${publicationsLoaded}/${sessionStore.selectedPublicationsCount} selected publications loaded`
    
    await Promise.all(
      sessionStore.selectedPublications.map(async (publication) => {
        await publication.fetchData()
        publication.isSelected = true
        publicationsLoaded++
        interfaceStore.loadingMessage = `${publicationsLoaded}/${sessionStore.selectedPublicationsCount} selected publications loaded`
      })
    )
    
    await computeSuggestions()
    interfaceStore.endLoading()
    
    // Log end-to-end workflow timing if we're tracking one
    if (sessionStore._isTrackingWorkflow && sessionStore._workflowStartTime) {
      const totalDuration = performance.now() - sessionStore._workflowStartTime
      console.log(`[PERF] 🎯 END-TO-END WORKFLOW COMPLETED: ${totalDuration.toFixed(0)}ms (${(totalDuration/1000).toFixed(2)}s)`)
      
      // Reset tracking flags
      sessionStore._isTrackingWorkflow = false
      sessionStore._workflowStartTime = null
    }
  }

  /**
   * Computes suggestions based on selected publications
   */
  const computeSuggestions = async () => {
    console.log(`Starting to compute new suggestions based on ${sessionStore.selectedPublicationsCount} selected (and ${sessionStore.excludedPublicationsCount} excluded).`)
    sessionStore.clearActivePublication("updating suggestions")
    
    sessionStore.suggestion = await SuggestionService.computeSuggestions({
      selectedPublications: sessionStore.selectedPublications,
      isExcluded: sessionStore.isExcluded,
      isSelected: sessionStore.isSelected,
      getSelectedPublicationByDoi: sessionStore.getSelectedPublicationByDoi,
      maxSuggestions: sessionStore.maxSuggestions,
      readPublicationsDois: sessionStore.readPublicationsDois,
      updateLoadingMessage: (message) => {
        interfaceStore.loadingMessage = message
      }
    })
    
    sessionStore.updateScores()
    authorStore.computeSelectedPublicationsAuthors(sessionStore.selectedPublications)
  }

  /**
   * Activates publication component by DOI
   */
  const activatePublicationComponentByDoi = (doi) => {
    if (doi !== sessionStore.activePublication?.doi) {
      interfaceStore.activatePublicationComponent(document.getElementById(doi))
      sessionStore.setActivePublication(doi)
    }
  }

  /**
   * Retries loading publication metadata
   */
  const retryLoadingPublication = async (publication) => {
    interfaceStore.startLoading()
    interfaceStore.loadingMessage = "Retrying to load metadata"
    await publication.fetchData(true)
    await updateSuggestions()
    activatePublicationComponentByDoi(publication.doi)
  }

  /**
   * Loads session from JSON data
   */
  const loadSession = (session) => {
    console.log(`Loading session ${JSON.stringify(session)}`)
    if (!session || !session.selected) {
      interfaceStore.showErrorMessage(
        "Cannot read session state from JSON."
      )
      return
    }
    if (session.boost) {
      sessionStore.setBoostKeywordString(session.boost)
    }
    if (session.excluded) {
      sessionStore.excludedPublicationsDois = session.excluded
    }
    sessionStore.addPublicationsToSelection(session.selected)
    
    // Mark that we're tracking a workflow
    sessionStore._isTrackingWorkflow = true
    updateSuggestions()
  }

  /**
   * Imports session from file
   */
  const importSession = (file) => {
    const startTime = performance.now()
    console.log("[PERF] Starting session import workflow")
    
    const fileReader = new FileReader()
    fileReader.onload = () => {
      let content
      try {
        content = fileReader.result
        const session = JSON.parse(content)
        // Store the start time for end-to-end measurement
        sessionStore._workflowStartTime = startTime
        loadSession(session)
      } catch (error) {
        console.error('Session import error:', error)
        console.error('File content preview:', content?.substring(0, 200))
        interfaceStore.showErrorMessage(`Cannot read JSON from file: ${error.message}`)
      }
    }
    fileReader.readAsText(file)
  }

  /**
   * Loads more suggestions incrementally
   */
  const loadMoreSuggestions = () => {
    console.log("Loading more suggestions.")
    updateSuggestions(
      sessionStore.maxSuggestions + PAGINATION.LOAD_MORE_INCREMENT
    )
  }

  /**
   * Updates queued publications (add/exclude) and recomputes suggestions
   */
  const updateQueued = async () => {
    const startTime = performance.now()
    console.log(`[PERF] Starting queue update workflow (${sessionStore.selectedQueue.length} to add, ${sessionStore.excludedQueue.length} to exclude)`)
    
    // Store the start time for end-to-end measurement
    sessionStore._workflowStartTime = startTime
    sessionStore._isTrackingWorkflow = true
    
    sessionStore.clearActivePublication()
    if (sessionStore.excludedQueue.length) {
      sessionStore.excludedPublicationsDois = sessionStore.excludedPublicationsDois.concat(sessionStore.excludedQueue)
    }
    sessionStore.selectedPublications = sessionStore.selectedPublications.filter(
      publication => !sessionStore.excludedQueue.includes(publication.doi)
    )
    if (sessionStore.suggestion) {
      sessionStore.suggestion.publications = sessionStore.suggestion.publications.filter(
        publication => (!sessionStore.selectedQueue.includes(publication.doi) && !sessionStore.excludedQueue.includes(publication.doi))
      )
    }
    if (sessionStore.selectedQueue.length) {
      sessionStore.addPublicationsToSelection(sessionStore.selectedQueue)
    }
    await updateSuggestions()
    sessionStore.clearQueues()
  }

  /**
   * Adds publications and updates suggestions
   */
  const addPublicationsAndUpdate = async (dois) => {
    const startTime = performance.now()
    console.log(`[PERF] Starting manual publication add workflow for ${dois.length} publications`)
    
    // Store the start time for end-to-end measurement
    sessionStore._workflowStartTime = startTime
    sessionStore._isTrackingWorkflow = true
    
    dois.forEach((doi) => sessionStore.removeFromQueues(doi))
    await sessionStore.addPublicationsToSelection(dois)
    await updateSuggestions()
  }

  /**
   * Loads example session
   */
  const loadExample = () => {
    const startTime = performance.now()
    console.log("[PERF] Starting example load workflow")
    
    const session = {
      selected: [
        "10.1109/tvcg.2015.2467757",
        "10.1109/tvcg.2015.2467621",
        "10.1002/asi.24171",
        "10.2312/evp.20221110"
      ],
      boost: "cit, visual, map, publi|literat",
    }
    
    // Store the start time for end-to-end measurement
    sessionStore._workflowStartTime = startTime
    loadSession(session)
  }
  
  return {
    isEmpty,
    clear,
    clearSession,
    clearCache,
    updateSuggestions,
    computeSuggestions,
    activatePublicationComponentByDoi,
    retryLoadingPublication,
    loadSession,
    importSession,
    loadMoreSuggestions,
    updateQueued,
    addPublicationsAndUpdate,
    loadExample
  }
}