import { useAppState } from '@/composables/useAppState.js'
import Filter from '@/core/Filter.js'
import Publication from '@/core/Publication.js'
import {
  buildChatRequest,
  parseChatAnswer,
  parsePartialChatAnswer
} from '@/services/AiChatService.js'
import { useAuthorStore } from '@/stores/author.js'
import { useLlmStore } from '@/stores/llm.js'
import { useSessionStore } from '@/stores/session.js'

// Request of the answer being written, to stop it on demand
let answerController = null

/**
 * Chat with the AI model about the session: the model answers questions on the selected and
 * suggested publications and can set keywords and filters; each change can be undone.
 */
export function useAiChat() {
  const sessionStore = useSessionStore()
  const llmStore = useLlmStore()
  const authorStore = useAuthorStore()
  const { updateScores } = useAppState()

  /**
   * Applies a change the model asked for and returns its description for the user; `null`
   * if the action cannot be carried out as given.
   */
  function applyAction({ type, value }) {
    const { filter } = sessionStore
    if (type === 'setKeywords') {
      sessionStore.setBoostKeywordString(value)
      updateScores()
      return value ? `Keywords set to ${sessionStore.boostKeywordString}` : 'Keywords removed'
    }
    if (type === 'clearFilters') {
      sessionStore.filter = new Filter()
      return 'All filters removed'
    }
    filter.isActive = true
    if (type === 'setFilterText') {
      filter.string = value
      return value ? `Filter set: text “${value}”` : 'Text filter removed'
    }
    if (type === 'setFilterYears') {
      // "2015-2020", open ranges like "2015-", or a single year standing for itself
      const [yearStart, yearEnd = yearStart] = value.split(/[-–]/).map((year) => year.trim())
      if (![yearStart, yearEnd].every((year) => /^(\d{4})?$/.test(year))) return null
      filter.yearStart = yearStart
      filter.yearEnd = yearEnd
      return filter.isYearActive()
        ? `Filter set: years ${filter.yearStart}–${filter.yearEnd}`
        : 'Year filter removed'
    }
    const tags = Publication.TAGS.filter((tag) =>
      value
        .split(',')
        .map((id) => id.trim())
        .includes(tag.value)
    )
    filter.tags = tags.map((tag) => tag.value)
    return tags.length
      ? `Filter set: ${tags.map((tag) => tag.name.toLowerCase()).join(' or ')}`
      : 'Tag filter removed'
  }

  /**
   * Sends a message of the user and adds the answer of the model to the conversation,
   * showing it while it is written and applying the changes it asks for.
   */
  async function sendChatMessage(text) {
    const messages = sessionStore.aiChatMessages
    messages.push({ role: 'user', text })
    messages.push({ role: 'assistant', text: '', papers: [], actions: [], isWriting: true })
    const answer = messages.at(-1)
    answerController = new AbortController()
    try {
      if (!llmStore.models.length) await llmStore.refreshModels()
      const { papers: listedPublications, ...request } = buildChatRequest(
        {
          selectedPublications: sessionStore.selectedPublications,
          suggestedPublications: sessionStore.suggestedPublications,
          totalSuggestions: sessionStore.suggestion?.totalSuggestions ?? 0,
          boostKeywordString: sessionStore.boostKeywordString,
          filter: sessionStore.filter,
          sessionName: sessionStore.sessionName,
          excludedCount: sessionStore.excludedPublicationsCount,
          authors: authorStore.selectedPublicationsAuthors
        },
        messages.slice(0, -1),
        llmStore.usableContextWindow
      )
      const result = await llmStore.generate(
        { ...request, signal: answerController.signal },
        (status) => {
          if (status.phase === 'generate') answer.text = parsePartialChatAnswer(status.text)
        }
      )
      const parsed = parseChatAnswer(result.text, listedPublications)
      answer.text = parsed.answer
      if (!parsed.actions.length && !parsed.papers.length) return
      // State to return to if the user undoes the changes
      answer.undo = {
        boostKeywordString: sessionStore.boostKeywordString,
        filter: JSON.parse(JSON.stringify(sessionStore.filter)),
        recommendations: sessionStore.publications
          .filter((publication) => publication.isAiRecommended)
          .map(({ doi, isAiRecommended }) => ({ doi, explanation: isAiRecommended }))
      }
      answer.actions = parsed.actions
        .map((action) => ({ ...action, label: applyAction(action) }))
        .filter((action) => action.label)
      if (parsed.papers.length) {
        // Papers the answer singles out are marked, replacing the marks of earlier answers
        sessionStore.markAiRecommendedPublications(parsed.papers)
        answer.papers = parsed.papers.map(({ doi, explanation }) => {
          const { title, authorShort, year } = listedPublications.find(
            (publication) => publication.doi === doi
          )
          return { doi, title, authorShort, year, explanation }
        })
      }
    } catch (error) {
      if (error.code === 'aborted') answer.isStopped = true
      else {
        console.error('Error in AI chat:', error)
        answer.error = error.message || 'The model could not answer.'
      }
    } finally {
      answer.isWriting = false
    }
  }

  function stopAnswer() {
    answerController?.abort()
  }

  /** Restores keywords, filters, and marked papers as they were before the changes of an answer. */
  function undoActions(answer) {
    sessionStore.markAiRecommendedPublications(answer.undo.recommendations)
    sessionStore.filter = Object.assign(new Filter(), answer.undo.filter)
    sessionStore.setBoostKeywordString(answer.undo.boostKeywordString)
    updateScores()
    answer.undo = null
  }

  return { sendChatMessage, stopAnswer, undoActions }
}
