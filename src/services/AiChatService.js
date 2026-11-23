import Publication from '@/core/Publication.js'
import { estimateTokens, parseJsonAnswer, readPartialJsonString } from '@/llm/chat.ts'
import { LlmError } from '@/llm/types.ts'
import {
  DETAIL_LEVELS,
  serializePublication,
  truncateText
} from '@/services/AiRecommendationService.js'

const ANSWER_TOKENS = 1000
// Earlier messages passed on to the model, and the length each may have
const HISTORY_MESSAGES = 10
const HISTORY_MESSAGE_MAX_LENGTH = 2000

// Changes to the session the model may ask for
const ACTION_TYPES = [
  'setKeywords',
  'setFilterText',
  'setFilterYears',
  'setFilterTags',
  'clearFilters'
]

const INSTRUCTIONS = [
  'You are the assistant of PUREsuggest, a tool for citation-based literature search: the user selects papers, and the tool suggests papers that cite or are cited by them, ranked by a score that keywords can boost.',
  'Answer questions about the session data given below: the selected and suggested papers, the keywords, and the filters. Ground every statement in that data and say so if it does not contain the answer; of the suggestions, only the top-ranked ones may be listed.',
  'Write the answer for the user in plain text without Markdown, as short as the question allows. Refer to papers by first author and year or by title, never by position or field names.',
  'You can change the session through actions. Use them only if the user asks for a change, and say in the answer what you changed.',
  'setKeywords replaces the boost keywords; its value is a comma-separated list, with alternatives of one keyword separated by "|" (for example "visual|vis, network"); keywords are matched within paper titles; an empty value removes all keywords.',
  'setFilterText shows only papers whose title, authors, or venue contain the value. setFilterYears restricts the publication years; its value is "<first year>-<last year>", where either year may be left out (for example "2015-"). setFilterTags shows only papers with one of the given tags; its value is a comma-separated list of tag ids from availableTags. An empty value removes the respective filter. clearFilters removes all filters; its value is empty.',
  'Answer with a JSON object of the form {"answer":"<text for the user>","actions":[{"type":"<action type>","value":"<value>"}]} and nothing else; leave the actions empty if nothing is to be changed.'
].join(' ')

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'actions'],
  properties: {
    answer: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'value'],
        properties: {
          type: { type: 'string', enum: ACTION_TYPES },
          value: { type: 'string' }
        }
      }
    }
  }
}

function describeFilters(filter) {
  const hasYears = filter.yearStart || filter.yearEnd
  return {
    text: filter.string,
    years: hasYears ? `${filter.yearStart || ''}-${filter.yearEnd || ''}` : '',
    tags: filter.tags,
    isActive: filter.isActive
  }
}

/**
 * Describes the session as detailed as the token budget allows: selected papers first, then
 * as many of the suggested ones (in their ranked order) as fit.
 */
function describeSession(
  { selectedPublications, suggestedPublications, totalSuggestions, boostKeywordString, filter },
  tokenBudget
) {
  let context
  for (const detail of DETAIL_LEVELS) {
    context = {
      keywords: boostKeywordString,
      filters: describeFilters(filter),
      availableTags: Publication.TAGS.map(({ value, name }) => ({ id: value, name })),
      counts: {
        selected: selectedPublications.length,
        suggestionsLoaded: suggestedPublications.length,
        suggestionsListed: 0,
        suggestionsTotal: totalSuggestions
      },
      selectedPapers: [],
      suggestedPapers: []
    }
    let remainingTokens = tokenBudget - estimateTokens(JSON.stringify(context))
    const addPapers = (publications, papers) => {
      for (const publication of publications) {
        const paper = { ...serializePublication(publication, detail), score: publication.score }
        remainingTokens -= estimateTokens(JSON.stringify(paper)) + 1
        if (remainingTokens < 0) return
        papers.push(paper)
      }
    }
    addPapers(selectedPublications, context.selectedPapers)
    addPapers(suggestedPublications, context.suggestedPapers)
    context.counts.suggestionsListed = context.suggestedPapers.length
    if (context.suggestedPapers.length === suggestedPublications.length) break
  }
  return context
}

/**
 * Builds the chat request for the next answer of the assistant.
 * @param {Object} sessionData - Selected and suggested publications (with the total number of
 *   suggestions available), keywords, and filter
 * @param {Array} history - Messages so far ({role, text, actions}), ending with the user's
 * @param {number} contextWindow - Tokens available for prompt and answer
 * @returns {{messages: Array, jsonSchema: Object, maxOutputTokens: number}}
 */
export function buildChatRequest(sessionData, history, contextWindow) {
  const conversation = history.slice(-HISTORY_MESSAGES).map(({ role, text, actions }) => {
    const shortened = truncateText(text, HISTORY_MESSAGE_MAX_LENGTH)
    if (role === 'user') return { role, content: shortened }
    return {
      role,
      content: JSON.stringify({
        answer: shortened,
        actions: (actions ?? []).map(({ type, value }) => ({ type, value }))
      })
    }
  })
  const usedTokens = estimateTokens(INSTRUCTIONS + JSON.stringify(conversation)) + ANSWER_TOKENS
  const context = describeSession(sessionData, contextWindow - usedTokens)
  if (context.selectedPapers.length < sessionData.selectedPublications.length) {
    throw new LlmError(
      'context-overflow',
      'The context window of the model is too small for the selected publications. Choose a model or setting with a larger context window.'
    )
  }
  return {
    messages: [
      { role: 'system', content: `${INSTRUCTIONS}\n\nSession data:\n${JSON.stringify(context)}` },
      ...conversation
    ],
    jsonSchema: { name: 'ai_chat', schema: RESPONSE_SCHEMA },
    maxOutputTokens: ANSWER_TOKENS
  }
}

/**
 * Turns a model answer into the text for the user and the valid actions ({type, value}).
 * Text of models that ignore the requested format counts as answer without actions.
 */
export function parseChatAnswer(answerText) {
  let answer
  try {
    answer = parseJsonAnswer(answerText)
  } catch {
    answer = { answer: answerText }
  }
  const text = String(answer.answer ?? '').trim()
  if (!text) throw new LlmError('invalid-response', 'The model gave an empty answer.')
  const actions = Array.isArray(answer.actions) ? answer.actions : []
  return {
    answer: text,
    actions: actions
      .filter((action) => ACTION_TYPES.includes(action?.type))
      .map(({ type, value }) => ({ type, value: String(value ?? '') }))
  }
}

/** Reads the answer text from a model answer that is still being written. */
export function parsePartialChatAnswer(answerText) {
  return answerText.trimStart().startsWith('{')
    ? readPartialJsonString(answerText, 'answer')
    : answerText
}
