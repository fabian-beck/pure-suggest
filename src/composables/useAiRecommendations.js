import { useAppState } from '@/composables/useAppState.js'
import { PAGINATION } from '@/constants/config.js'
import { formatBytes } from '@/lib/Util.js'
import {
  buildRecommendationRequest,
  parsePartialRecommendationAnswer,
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

const plural = (count) => (count === 1 ? '' : 's')

/** State of a run: what was asked for, what the model did so far, and how it ended. */
function createRun(isAutoSelect, range) {
  return {
    isAutoSelect,
    range: [...range],
    // Report written by the model with its last answer
    text: '',
    publications: [],
    // What the model considered, concluded, and did in each step
    log: [],
    steps: 0,
    loadCount: 0,
    contextNote: '',
    failure: '',
    isCancelled: false
  }
}

/** Describes what an auto-select step does to the session (`loadedUpTo`: 0 if nothing is loaded). */
function describeSelectionAction(addedCount, loadedUpTo) {
  const actions = []
  if (addedCount)
    actions.push(`Adding ${addedCount} publication${plural(addedCount)} to the selection`)
  if (loadedUpTo) {
    actions.push(`${addedCount ? 'loading' : 'Loading'} more suggestions (up to ${loadedUpTo})`)
  }
  return `${actions.join(' and ')}, then recomputing the suggestions`
}

/**
 * AI recommendations on the suggested publications: either tagging the recommended
 * suggestions, or auto-selecting them in steps with refined suggestions in between. The
 * model may ask for more suggestions to be loaded. While a run is in progress, its log
 * (reasoning, choices, and actions of each step) is available as `interfaceStore.aiRun`;
 * each run ends with a report dialog.
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
      return `${name} (${llmStore.location === 'remote' ? 'cloud' : 'on this device'}) is answering...`
    }
    return `Loading ${name}...`
  }

  /**
   * Asks the model once for recommendations among the current suggestions and logs the step
   * in the run, following the answer while it is written. The request can be cancelled
   * through the loading overlay.
   */
  async function askModel(run, minCount, maxCount) {
    const controller = new AbortController()
    interfaceStore.setLoadingCancelable(true)
    interfaceStore.loadingCancelToken.promise.then(() => controller.abort())
    interfaceStore.loadingMessage = `Asking ${llmStore.activeModel.name} for recommendations...`

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
    const describe = ({ doi, explanation }) => {
      const { title, authorShort, year } = candidates.find((candidate) => candidate.doi === doi)
      return { doi, explanation, title, authorShort, year }
    }

    run.log.push({
      considered: `Reading ${candidates.length} suggestion${plural(candidates.length)} and ${sessionStore.selectedPublicationsCount} selected publication${plural(sessionStore.selectedPublicationsCount)}`,
      // Thoughts of models that reason before answering, and the reasoning stated in the answer
      thinking: '',
      reasoning: '',
      picks: [],
      action: ''
    })
    const entry = run.log.at(-1)
    const result = await llmStore.generate({ ...request, signal: controller.signal }, (status) => {
      interfaceStore.loadingMessage = describeStatus(status)
      if (status.phase !== 'generate') return
      const written = parsePartialRecommendationAnswer(status.text, candidates)
      entry.thinking = status.reasoning
      entry.reasoning = written.reasoning
      entry.picks = written.recommendations.slice(0, maxCount).map(describe)
    })
    const answer = parseRecommendationAnswer(result.text, candidates, maxCount)
    const recommendations = answer.recommendations.map(describe)
    entry.reasoning = answer.reasoning
    entry.picks = recommendations

    run.steps++
    run.text = answer.report
    run.contextNote =
      candidates.length < suggestedPublications.length
        ? `Only the top ${candidates.length} of ${suggestedPublications.length} suggestions fit the context window of the model and were considered.`
        : ''
    return { recommendations, isLoadingMore: answer.loadMore && canLoadMore, entry }
  }

  /**
   * Tags the recommended suggestions; the expected range limits their number. If the model
   * asks for more suggestions, they are loaded and the model is asked again.
   */
  async function tagRecommendations(run) {
    const [minCount, maxCount] = sessionStore.aiRecommendationRange
    try {
      for (;;) {
        const { recommendations, isLoadingMore, entry } = await askModel(
          run,
          minCount,
          Math.min(maxCount, sessionStore.suggestedPublicationsFiltered.length)
        )
        run.publications = recommendations
        if (!isLoadingMore) {
          entry.action = `Tagging ${recommendations.length} suggestion${plural(recommendations.length)} as recommended`
          break
        }
        run.loadCount++
        const maxSuggestions = sessionStore.maxSuggestions + PAGINATION.LOAD_MORE_INCREMENT
        entry.action = `Too few suggestions fit: loading more (up to ${maxSuggestions}) and asking again`
        await updateSuggestions(maxSuggestions, true)
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
      Math.min(
        maxCount - run.publications.length,
        sessionStore.suggestedPublicationsFiltered.length
      )
    try {
      while (run.steps < AUTO_SELECT_MAX_STEPS && remainingCount() > 0) {
        const { recommendations, isLoadingMore, entry } = await askModel(
          run,
          run.publications.length < minCount ? 1 : 0,
          Math.min(stepSize, remainingCount())
        )
        if (!recommendations.length && !isLoadingMore) {
          entry.action = 'Nothing else fits clearly: finishing'
          break
        }
        if (isLoadingMore) {
          run.loadCount++
          sessionStore.maxSuggestions += PAGINATION.LOAD_MORE_INCREMENT
        }
        entry.action = describeSelectionAction(
          recommendations.length,
          isLoadingMore ? sessionStore.maxSuggestions : 0
        )
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
    interfaceStore.aiRun = createRun(
      sessionStore.isAiAutoSelect,
      sessionStore.aiRecommendationRange
    )
    // The store's reactive version, so that the run can be followed while it is in progress
    const run = interfaceStore.aiRun
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
      interfaceStore.aiRun = null
    }
    if (run.steps) {
      modalStore.aiReport = { ...run, suggestionCount: sessionStore.suggestedPublications.length }
      modalStore.isAiReportModalDialogShown = true
    } else if (run.failure) interfaceStore.showErrorMessage(run.failure)
  }

  return { requestAiRecommendations }
}
