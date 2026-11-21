import { useAppState } from '@/composables/useAppState.js'
import { formatBytes } from '@/lib/Util.js'
import {
  buildRecommendationRequest,
  parseRecommendations
} from '@/services/AiRecommendationService.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useLlmStore } from '@/stores/llm.js'
import { useSessionStore } from '@/stores/session.js'

// Auto-select reaches the expected number of papers in about this many steps
const AUTO_SELECT_STEPS = 5
const AUTO_SELECT_MAX_STEPS = 10

/**
 * AI recommendations on the suggested publications: either tagging the recommended
 * suggestions, or auto-selecting them in steps with refined suggestions in between.
 */
export function useAiRecommendations() {
  const sessionStore = useSessionStore()
  const interfaceStore = useInterfaceStore()
  const llmStore = useLlmStore()
  const { addPublicationsAndUpdate } = useAppState()

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
   * Asks the model once for recommendations among the current suggestions. The request can
   * be cancelled through the loading overlay; `progressNote` precedes the loading messages.
   */
  async function askModel(minCount, maxCount, progressNote) {
    const controller = new AbortController()
    interfaceStore.setLoadingCancelable(true)
    interfaceStore.loadingCancelToken.promise.then(() => controller.abort())
    interfaceStore.loadingMessage = `${progressNote}Asking ${llmStore.activeModel.name} for recommendations...`

    // The context window of the model determines how much of the session fits the request
    if (!llmStore.models.length) await llmStore.refreshModels()
    const suggestedPublications = sessionStore.suggestedPublicationsFiltered
    const { candidates, ...request } = buildRecommendationRequest(
      {
        selectedPublications: sessionStore.selectedPublications,
        suggestedPublications,
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
    return {
      recommendations: parseRecommendations(result.text, candidates, maxCount),
      contextNote:
        candidates.length < suggestedPublications.length
          ? ` Only the top ${candidates.length} of ${suggestedPublications.length} suggestions fit the context window of the model and were considered.`
          : ''
    }
  }

  /** Tags the recommended suggestions; the expected range limits their number. */
  async function tagRecommendations() {
    const [minCount, maxCount] = sessionStore.aiRecommendationRange
    const { recommendations, contextNote } = await askModel(
      minCount,
      Math.min(maxCount, sessionStore.suggestedPublicationsFiltered.length),
      ''
    )
    sessionStore.applyAiRecommendations(recommendations)
    if (contextNote) interfaceStore.showInfoMessage(contextNote.trim())
  }

  /**
   * Adds recommended suggestions to the selection in steps until the expected range is
   * reached or the model finds nothing fitting anymore. Suggestions are recomputed after each
   * step, so that later steps build on the expanded selection instead of the initial one.
   */
  async function autoSelect() {
    const [minCount, maxCount] = sessionStore.aiRecommendationRange
    const stepSize = Math.max(2, Math.ceil(maxCount / AUTO_SELECT_STEPS))
    const added = []
    let failure = ''
    let contextNote = ''
    let isCancelled = false
    try {
      const remainingCount = () =>
        Math.min(maxCount - added.length, sessionStore.suggestedPublicationsFiltered.length)
      for (let step = 1; step <= AUTO_SELECT_MAX_STEPS && remainingCount() > 0; step++) {
        const answer = await askModel(
          added.length < minCount ? 1 : 0,
          Math.min(stepSize, remainingCount()),
          `Step ${step}, ${added.length} of ${minCount}–${maxCount} selected: `
        )
        contextNote = answer.contextNote
        if (!answer.recommendations.length) break
        await addPublicationsAndUpdate(
          answer.recommendations.map(({ doi }) => doi),
          true
        )
        sessionStore.tagAiSelectedPublications(answer.recommendations)
        added.push(...answer.recommendations)
        // Cancelling while suggestions were recomputed also ends the selection
        if (interfaceStore.loadingCancelToken.isCancelled) break
      }
    } catch (error) {
      if (error.code === 'aborted') isCancelled = true
      else failure = `${error.message} `
    }
    if (!added.length) {
      if (failure) interfaceStore.showErrorMessage(failure.trim())
      else if (!isCancelled) {
        interfaceStore.showInfoMessage('The AI model recommended none of the suggestions.')
      }
      return
    }
    sessionStore.markPublicationsAsNewlyAdded(added.map(({ doi }) => doi))
    const summary = `AI selected ${added.length} publication${added.length === 1 ? '' : 's'}.`
    if (failure) interfaceStore.showErrorMessage(failure + summary)
    else interfaceStore.showInfoMessage(summary + contextNote)
  }

  /** Runs the AI recommendations as set in the session (tagging or auto-select). */
  async function requestAiRecommendations() {
    interfaceStore.startLoading()
    try {
      if (sessionStore.isAiAutoSelect) await autoSelect()
      else await tagRecommendations()
    } catch (error) {
      if (error.code !== 'aborted') {
        console.error('Error requesting AI recommendations:', error)
        interfaceStore.showErrorMessage(error.message || 'Failed to get AI recommendations.')
      }
    } finally {
      interfaceStore.endLoading()
    }
  }

  return { requestAiRecommendations }
}
