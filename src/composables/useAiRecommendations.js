import { useAppState } from '@/composables/useAppState.js'
import { PAGINATION } from '@/constants/config.js'
import { formatBytes } from '@/lib/Util.js'
import {
  buildRecommendationRequest,
  parseRecommendationAnswer
} from '@/services/AiRecommendationService.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useLlmStore } from '@/stores/llm.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'

// Auto-select reaches the expected number of papers in about this many steps
const AUTO_SELECT_STEPS = 5
const AUTO_SELECT_MAX_STEPS = 10
// How often the model may ask for more suggestions within one run
const MAX_LOADS_OF_MORE_SUGGESTIONS = 2

/**
 * AI recommendations on the suggested publications: either tagging the recommended
 * suggestions, or auto-selecting them in steps with refined suggestions in between. The
 * model may ask for more suggestions to be loaded; each run ends with a report dialog.
 */
export function useAiRecommendations() {
  const sessionStore = useSessionStore()
  const interfaceStore = useInterfaceStore()
  const modalStore = useModalStore()
  const llmStore = useLlmStore()
  const { addPublicationsAndUpdate, updateSuggestions } = useAppState()

  function describeStatus(status) {
    const { name } = llmStore.activeModel
    if (status.phase === 'download' && status.totalBytes) {
      return `Downloading ${name}: ${formatBytes(status.loadedBytes)} of ${formatBytes(status.totalBytes)}...`
    }
    if (status.phase === 'generate') {
      return `${name} (${llmStore.location === 'remote' ? 'cloud' : 'on this device'}) is writing recommendations...`
    }
    return `Loading ${name}...`
  }

  /**
   * Asks the model once for recommendations among the current suggestions and records the
   * answer in the run. The request can be cancelled through the loading overlay;
   * `progressNote` precedes the loading messages.
   */
  async function askModel(run, minCount, maxCount, progressNote) {
    const controller = new AbortController()
    interfaceStore.setLoadingCancelable(true)
    interfaceStore.loadingCancelToken.promise.then(() => controller.abort())
    interfaceStore.loadingMessage = `${progressNote}Asking ${llmStore.activeModel.name} for recommendations...`

    // The context window of the model determines how much of the session fits the request
    if (!llmStore.models.length) await llmStore.refreshModels()
    const suggestedPublications = sessionStore.suggestedPublicationsFiltered
    const { candidates, canLoadMore, ...request } = buildRecommendationRequest(
      {
        selectedPublications: sessionStore.selectedPublications,
        suggestedPublications,
        totalSuggestions: sessionStore.suggestion.totalSuggestions,
        addedDois: run.publications.map(({ doi }) => doi),
        isLoadMoreAllowed:
          sessionStore.isAiLoadMoreAllowed && run.loadCount < MAX_LOADS_OF_MORE_SUGGESTIONS,
        boostKeywordString: sessionStore.boostKeywordString,
        keywords: sessionStore.uniqueBoostKeywords,
        steeringComment: sessionStore.aiRecommendationComment
      },
      Math.min(minCount, maxCount),
      maxCount,
      llmStore.usableContextWindow
    )
    const result = await llmStore.generate({ ...request, signal: controller.signal }, (status) => {
      interfaceStore.loadingMessage = progressNote + describeStatus(status)
    })
    const answer = parseRecommendationAnswer(result.text, candidates, maxCount)

    run.steps++
    run.text = answer.report
    run.contextNote =
      candidates.length < suggestedPublications.length
        ? `Only the top ${candidates.length} of ${suggestedPublications.length} suggestions fit the context window of the model and were considered.`
        : ''
    const recommendations = answer.recommendations.map(({ doi, explanation }) => {
      const { title, authorShort, year } = candidates.find((candidate) => candidate.doi === doi)
      return { doi, explanation, title, authorShort, year }
    })
    return { recommendations, isLoadingMore: answer.loadMore && canLoadMore }
  }

  /**
   * Tags the recommended suggestions; the expected range limits their number. If the model
   * asks for more suggestions, they are loaded and the model is asked again.
   */
  async function tagRecommendations(run) {
    const [minCount, maxCount] = sessionStore.aiRecommendationRange
    try {
      for (;;) {
        const answer = await askModel(
          run,
          minCount,
          Math.min(maxCount, sessionStore.suggestedPublicationsFiltered.length),
          ''
        )
        run.publications = answer.recommendations
        if (!answer.isLoadingMore) break
        run.loadCount++
        await updateSuggestions(sessionStore.maxSuggestions + PAGINATION.LOAD_MORE_INCREMENT, true)
        run.isCancelled = interfaceStore.loadingCancelToken.isCancelled
        if (run.isCancelled) break
      }
    } finally {
      // Recomputed suggestions lost their tags; the last answer still applies to them
      if (run.steps) sessionStore.applyAiRecommendations(run.publications)
    }
  }

  /**
   * Adds recommended suggestions to the selection in steps until the expected range is
   * reached or the model finds nothing fitting anymore. Suggestions are recomputed after each
   * step, so that later steps build on the expanded selection instead of the initial one.
   */
  async function autoSelect(run) {
    const [minCount, maxCount] = sessionStore.aiRecommendationRange
    const stepSize = Math.max(2, Math.ceil(maxCount / AUTO_SELECT_STEPS))
    const remainingCount = () =>
      Math.min(maxCount - run.publications.length, sessionStore.suggestedPublicationsFiltered.length)
    try {
      while (run.steps < AUTO_SELECT_MAX_STEPS && remainingCount() > 0) {
        const { recommendations, isLoadingMore } = await askModel(
          run,
          run.publications.length < minCount ? 1 : 0,
          Math.min(stepSize, remainingCount()),
          `Step ${run.steps + 1}, ${run.publications.length} of ${minCount}–${maxCount} selected: `
        )
        if (!recommendations.length && !isLoadingMore) break
        if (isLoadingMore) {
          run.loadCount++
          sessionStore.maxSuggestions += PAGINATION.LOAD_MORE_INCREMENT
        }
        if (recommendations.length) {
          await addPublicationsAndUpdate(
            recommendations.map(({ doi }) => doi),
            true
          )
          sessionStore.tagAiSelectedPublications(recommendations)
          run.publications.push(...recommendations)
        } else await updateSuggestions(sessionStore.maxSuggestions, true)
        // Cancelling while suggestions were recomputed also ends the selection
        run.isCancelled = interfaceStore.loadingCancelToken.isCancelled
        if (run.isCancelled) break
      }
    } finally {
      sessionStore.markPublicationsAsNewlyAdded(run.publications.map(({ doi }) => doi))
    }
  }

  /**
   * Runs the AI recommendations as set in the session (tagging or auto-select) and shows the
   * report of the run. A run that fails or is cancelled before its first answer has nothing
   * to report.
   */
  async function requestAiRecommendations() {
    const run = {
      isAutoSelect: sessionStore.isAiAutoSelect,
      // Report written by the model with its last answer
      text: '',
      publications: [],
      steps: 0,
      loadCount: 0,
      contextNote: '',
      failure: '',
      isCancelled: false
    }
    interfaceStore.startLoading()
    try {
      if (run.isAutoSelect) await autoSelect(run)
      else await tagRecommendations(run)
    } catch (error) {
      if (error.code === 'aborted') run.isCancelled = true
      else {
        console.error('Error requesting AI recommendations:', error)
        run.failure = error.message || 'Failed to get AI recommendations.'
      }
    } finally {
      interfaceStore.endLoading()
    }
    if (run.steps) {
      modalStore.aiReport = { ...run, suggestionCount: sessionStore.suggestedPublications.length }
      modalStore.isAiReportModalDialogShown = true
    } else if (run.failure) interfaceStore.showErrorMessage(run.failure)
  }

  return { requestAiRecommendations }
}
