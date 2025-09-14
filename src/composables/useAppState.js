import { computed } from 'vue'

import { PAGINATION } from '@/constants/config.js'
import { clearCache as clearCacheUtil } from '@/lib/Cache.js'
import { SuggestionService } from '@/services/SuggestionService.js'
import { useAuthorStore } from '@/stores/author.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'

export function useAppState() {
  // This composable will gradually receive functionality from the session store

  const sessionStore = useSessionStore()
  const interfaceStore = useInterfaceStore()
  const authorStore = useAuthorStore()
  const queueStore = useQueueStore()

  /**
   * Computes whether the session is empty (no publications selected/excluded/queued)
   * @returns {ComputedRef<boolean>} True if session is empty
   */
  const isEmpty = computed(
    () =>
      sessionStore.selectedPublicationsCount === 0 &&
      sessionStore.excludedPublicationsCount === 0 &&
      queueStore.selectedQueue.length === 0 &&
      !queueStore.isUpdatable
  )

  /**
   * Clears all session data and resets to initial state
   */
  const clear = () => {
    sessionStore.clear()
    queueStore.clear()
    // Clear author store
    authorStore.selectedPublicationsAuthors = []
    // do not reset read publications as the user might to carry this information to the next session
    interfaceStore.clear()
    // Network will naturally clear when it detects empty state, no need for expensive replot
  }

  /**
   * Shows confirmation dialog and clears session if confirmed
   */
  const clearSession = () => {
    interfaceStore.showConfirmDialog(
      'You are going to clear all selected and excluded articles and jump back to the initial state.',
      clear
    )
  }

  /**
   * Shows confirmation dialog and clears both session and cache if confirmed
   */
  const clearCache = () => {
    interfaceStore.showConfirmDialog(
      'You are going to clear the cache, as well as all selected and excluded articles and jump back to the initial state.',
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
      console.log(
        `[PERF] 🎯 END-TO-END WORKFLOW COMPLETED: ${totalDuration.toFixed(0)}ms (${(totalDuration / 1000).toFixed(2)}s)`
      )

      // Reset tracking flags
      sessionStore._isTrackingWorkflow = false
      sessionStore._workflowStartTime = null
    }
  }

  /**
   * Updates both publication and author scores in the correct sequence
   * Also triggers network visualization updates
   */
  const updateScores = () => {
    sessionStore.updatePublicationScores()
    authorStore.computeSelectedPublicationsAuthors(sessionStore.selectedPublications)
    interfaceStore.triggerNetworkReplot()
  }

  /**
   * Computes suggestions based on selected publications
   */
  const computeSuggestions = async () => {
    console.log(
      `Starting to compute new suggestions based on ${sessionStore.selectedPublicationsCount} selected (and ${sessionStore.excludedPublicationsCount} excluded).`
    )
    sessionStore.clearActivePublication('updating suggestions')

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

    updateScores()
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
    interfaceStore.loadingMessage = 'Retrying to load metadata'
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
      interfaceStore.showErrorMessage('Cannot read session state from JSON.')
      return
    }

    // Clear current session before loading new one
    clear()

    if (session.boost) {
      sessionStore.setBoostKeywordString(session.boost)
    }
    if (session.excluded) {
      sessionStore.excludedPublicationsDois = session.excluded
    }
    if (session.name !== undefined && session.name !== null) {
      sessionStore.setSessionName(session.name)
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
    console.log('[PERF] Starting session import workflow')

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
   * Shows import session confirmation dialog with file input
   */
  const importSessionWithConfirmation = () => {
    const warningMessage = isEmpty.value
      ? ''
      : '<p style="color: #d32f2f; margin-bottom: 16px;"><strong>This will clear and replace the current session.</strong></p>'

    interfaceStore.showConfirmDialog(
      `${warningMessage}<label>Choose an exported session JSON file:&nbsp;</label>
      <input type="file" id="import-json-input" accept="application/JSON"/>`,
      () => {
        const fileInput = document.getElementById('import-json-input')
        if (fileInput && fileInput.files && fileInput.files[0]) {
          importSession(fileInput.files[0])
        }
      },
      'Import session'
    )
  }

  /**
   * Loads more suggestions incrementally
   */
  const loadMoreSuggestions = () => {
    console.log('Loading more suggestions.')
    updateSuggestions(sessionStore.maxSuggestions + PAGINATION.LOAD_MORE_INCREMENT)
  }

  /**
   * Updates queued publications (add/exclude) and recomputes suggestions
   */
  const updateQueued = async () => {
    const startTime = performance.now()
    console.log(
      `[PERF] Starting queue update workflow (${queueStore.selectedQueue.length} to add, ${queueStore.excludedQueue.length} to exclude)`
    )

    // Store the start time for end-to-end measurement
    sessionStore._workflowStartTime = startTime
    sessionStore._isTrackingWorkflow = true

    sessionStore.clearActivePublication()
    if (queueStore.excludedQueue.length) {
      sessionStore.excludedPublicationsDois = sessionStore.excludedPublicationsDois.concat(
        queueStore.excludedQueue
      )
    }
    sessionStore.selectedPublications = sessionStore.selectedPublications.filter(
      (publication) => !queueStore.excludedQueue.includes(publication.doi)
    )
    if (sessionStore.suggestion) {
      sessionStore.suggestion.publications = sessionStore.suggestion.publications.filter(
        (publication) =>
          !queueStore.selectedQueue.includes(publication.doi) &&
          !queueStore.excludedQueue.includes(publication.doi)
      )
    }
    if (queueStore.selectedQueue.length) {
      sessionStore.addPublicationsToSelection(queueStore.selectedQueue)
    }
    await updateSuggestions()
    queueStore.clear()
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

    dois.forEach((doi) => queueStore.removeFromQueues(doi))
    await sessionStore.addPublicationsToSelection(dois)
    await updateSuggestions()
  }

  /**
   * Loads example session
   */
  const loadExample = () => {
    const startTime = performance.now()
    console.log('[PERF] Starting example load workflow')

    const session = {
      selected: [
        '10.1109/tvcg.2015.2467757',
        '10.1109/tvcg.2015.2467621',
        '10.1002/asi.24171',
        '10.2312/evp.20221110'
      ],
      boost: 'cit, visual, publi|literat'
    }

    // Store the start time for end-to-end measurement
    sessionStore._workflowStartTime = startTime
    loadSession(session)
  }

  /**
   * Queues publications for selection (coordinates between queue and session stores)
   */
  const queueForSelected = (dois) => {
    if (!Array.isArray(dois)) dois = [dois]
    queueStore.excludedQueue = queueStore.excludedQueue.filter(
      (excludedDoi) => !dois.includes(excludedDoi)
    )
    dois.forEach((doi) => {
      if (sessionStore.isSelected(doi) || queueStore.selectedQueue.includes(doi)) return
      queueStore.selectedQueue.push(doi)
    })
  }

  /**
   * Queues publications for exclusion (coordinates between queue and session stores)
   */
  const queueForExcluded = (doi) => {
    if (sessionStore.isExcluded(doi) || queueStore.excludedQueue.includes(doi)) return
    queueStore.selectedQueue = queueStore.selectedQueue.filter((seletedDoi) => doi != seletedDoi)
    queueStore.excludedQueue.push(doi)
  }

  /**
   * Checks if publications need score updates
   */
  const publicationsNeedScoreUpdate = (publications) => {
    // Check if publications have default/uninitialized scores
    // Publications with score=0 and empty boostKeywords likely haven't had updatePublicationScores() called
    return publications.some(
      (pub) =>
        pub.score === 0 &&
        (!pub.boostKeywords || pub.boostKeywords.length === 0) &&
        // Make sure it's not legitimately a zero score (has citation/reference data but calculated to 0)
        (pub.citationCount === undefined || pub.referenceCount === undefined)
    )
  }

  /**
   * Gets publications filtered by the active author
   * @returns {Array} Publications authored by the active author
   */
  const selectedPublicationsForAuthor = computed(() => {
    if (!authorStore.activeAuthorId) return []

    return sessionStore.selectedPublications.filter((publication) => {
      if (!publication.author) return false
      // Check if the active author is mentioned in the publication's author list
      // Split only on semicolons, not commas (commas are part of "Last, First" format)
      const authorNames = publication.author.split(';').map((name) => name.trim())
      const activeAuthor = authorStore.selectedPublicationsAuthors.find(
        (author) => author.id === authorStore.activeAuthorId
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
  })

  /**
   * Opens author modal dialog with proper data coordination
   */
  const openAuthorModalDialog = (authorId) => {
    // Check if we need to compute author data
    if (sessionStore.selectedPublications?.length > 0) {
      // Only recompute if no authors exist OR publications need score updates
      const needsRecomputation =
        authorStore.selectedPublicationsAuthors.length === 0 ||
        publicationsNeedScoreUpdate(sessionStore.selectedPublications)

      if (needsRecomputation) {
        // IMPORTANT: Publications need to have their scores updated before computing author data
        // Otherwise authors will have score=0 and no keywords
        if (publicationsNeedScoreUpdate(sessionStore.selectedPublications)) {
          sessionStore.updatePublicationScores()
        }

        authorStore.computeSelectedPublicationsAuthors(sessionStore.selectedPublications)
      }
    }

    interfaceStore.openAuthorModalDialog()

    // If authorId is provided, try to activate that author
    if (authorId) {
      // Check if author exists in the computed authors list
      const authorExists = authorStore.selectedPublicationsAuthors.some(
        (author) => author.id === authorId
      )
      if (authorExists) {
        authorStore.setActiveAuthor(authorId)
      }
    }
  }

  return {
    isEmpty,
    clear,
    clearSession,
    clearCache,
    updateSuggestions,
    updateScores,
    computeSuggestions,
    activatePublicationComponentByDoi,
    retryLoadingPublication,
    loadSession,
    importSession,
    importSessionWithConfirmation,
    loadMoreSuggestions,
    updateQueued,
    addPublicationsAndUpdate,
    loadExample,
    queueForSelected,
    queueForExcluded,
    openAuthorModalDialog,
    publicationsNeedScoreUpdate,
    selectedPublicationsForAuthor
  }
}
