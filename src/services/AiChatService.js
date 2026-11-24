import Publication from '@/core/Publication.js'
import { estimateTokens, parseJsonAnswer, readPartialJsonString } from '@/llm/chat.ts'
import { LlmError } from '@/llm/types.ts'
import {
  DETAIL_LEVELS,
  normalizeExplanation,
  serializePublication,
  truncateText
} from '@/services/AiRecommendationService.js'

const ANSWER_TOKENS = 1000
// Earlier messages passed on to the model, and the length each may have
const HISTORY_MESSAGES = 10
const HISTORY_MESSAGE_MAX_LENGTH = 2000
const MAIN_AUTHORS = 10

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
  'In the session data, score is the number of citation links between a paper and the selected papers (citesSelected and citedBySelected; selected papers count one extra), doubled for each matched keyword. citations and references are the numbers of papers known to cite it and to be cited by it. A DOI link has the form https://doi.org/<doi>.',
  'Write the answer for the user in plain text without Markdown, as short as the question allows. Refer to papers by first author and year or by title, never by id, position, or field names.',
  'Whenever your answer singles out some of the listed papers (for example those on a topic, of a kind, or that you recommend), list them in "papers" by id, each with a reason in one brief sentence. The tool marks them as "AI recommended" in its lists and shows them first, so the answer can summarize instead of enumerating them. Leave "papers" empty if the answer is not about specific papers.',
  'You can change the session through actions. Use them only if the user asks for a change, and say in the answer what you changed.',
  'setKeywords replaces the boost keywords; its value is a comma-separated list, with alternatives of one keyword separated by "|" (for example "visual|vis, network"); keywords are matched within paper titles; an empty value removes all keywords.',
  'setFilterText shows only papers whose title, authors, or venue contain the value. setFilterYears restricts the publication years; its value is "<first year>-<last year>", where either year may be left out (for example "2015-"). setFilterTags shows only papers with one of the given tags; its value is a comma-separated list of tag ids from availableTags. An empty value removes the respective filter. clearFilters removes all filters; its value is empty.',
  'Answer with a JSON object of the form {"answer":"<text for the user>","papers":[{"id":<id of a listed paper>,"reason":"<one sentence>"}],"actions":[{"type":"<action type>","value":"<value>"}]} and nothing else; leave the actions empty if nothing is to be changed.'
].join(' ')

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'papers', 'actions'],
  properties: {
    answer: { type: 'string' },
    papers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'reason'],
        properties: {
          id: { type: 'integer' },
          reason: { type: 'string' }
        }
      }
    },
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
  const lists = [
    filter.applyToSelected && 'selected papers',
    filter.applyToSuggested && 'suggested papers'
  ]
  return {
    text: filter.string,
    years: hasYears ? `${filter.yearStart || ''}-${filter.yearEnd || ''}` : '',
    tags: filter.tags,
    authors: filter.authors,
    linkedToPapersWithDoi: filter.dois,
    isActive: filter.isActive,
    appliesTo: lists.filter(Boolean).join(' and ')
  }
}

/**
 * Describes a publication for the chat: beyond the description shared with the
 * recommendations, what is needed to cite it, link it, and judge its role in the session.
 * Details the publication lacks are left out.
 */
function describePaper(publication, id, detail) {
  const paper = { id, ...serializePublication(publication, detail), score: publication.score }
  if (!detail.includesMetadata) return paper
  const details = {
    doi: publication.doi,
    volume: publication.volume,
    issue: publication.issue,
    pages: publication.page,
    citesSelected: publication.citationCount,
    citedBySelected: publication.referenceCount,
    citations: publication.citationDois?.size,
    references: publication.referenceDois?.size,
    isRead: publication.isRead,
    aiRecommended: publication.isAiRecommended,
    concepts: publication.concepts
  }
  for (const [key, value] of Object.entries(details)) {
    if (value && !(Array.isArray(value) && !value.length)) paper[key] = value
  }
  return paper
}

/**
 * Describes the session as detailed as the token budget allows: selected papers first, then
 * as many of the suggested ones (in their ranked order) as fit. Returns the description
 * (`context`) and the publications listed in it (`papers`), whose 1-based position is their id.
 */
function describeSession(
  {
    selectedPublications,
    suggestedPublications,
    totalSuggestions,
    boostKeywordString,
    filter,
    sessionName,
    excludedCount,
    authors
  },
  tokenBudget
) {
  let context
  let listed
  for (const detail of DETAIL_LEVELS) {
    listed = []
    context = {
      sessionName,
      keywords: boostKeywordString,
      filters: describeFilters(filter),
      availableTags: Publication.TAGS.map(({ value, name }) => ({ id: value, name })),
      counts: {
        selected: selectedPublications.length,
        suggestionsLoaded: suggestedPublications.length,
        suggestionsListed: 0,
        suggestionsTotal: totalSuggestions,
        excluded: excludedCount
      },
      mainAuthors: authors
        .slice(0, MAIN_AUTHORS)
        .map(({ name, count }) => ({ name, selectedPapers: count })),
      selectedPapers: [],
      suggestedPapers: []
    }
    let remainingTokens = tokenBudget - estimateTokens(JSON.stringify(context))
    const addPapers = (publications, papers) => {
      for (const publication of publications) {
        const paper = describePaper(publication, listed.length + 1, detail)
        remainingTokens -= estimateTokens(JSON.stringify(paper)) + 1
        if (remainingTokens < 0) return
        papers.push(paper)
        listed.push(publication)
      }
    }
    addPapers(selectedPublications, context.selectedPapers)
    addPapers(suggestedPublications, context.suggestedPapers)
    context.counts.suggestionsListed = context.suggestedPapers.length
    if (context.suggestedPapers.length === suggestedPublications.length) break
  }
  return { context, papers: listed }
}

/**
 * Builds the chat request for the next answer of the assistant.
 * @param {Object} sessionData - Selected and suggested publications (with the total number of
 *   suggestions available), keywords, filter, session name, number of excluded publications,
 *   and the authors of the selected publications (most important first)
 * @param {Array} history - Messages so far ({role, text, actions}), ending with the user's
 * @param {number} contextWindow - Tokens available for prompt and answer
 * @returns {{messages: Array, jsonSchema: Object, maxOutputTokens: number, papers: Array}}
 *   the request parts and the publications listed for the model (`papers`, which it refers
 *   to by their 1-based position).
 */
export function buildChatRequest(sessionData, history, contextWindow) {
  const conversation = history.slice(-HISTORY_MESSAGES).map(({ role, text, actions }) => {
    const shortened = truncateText(text, HISTORY_MESSAGE_MAX_LENGTH)
    if (role === 'user') return { role, content: shortened }
    return {
      role,
      content: JSON.stringify({
        answer: shortened,
        // Marked papers are left out: their ids only held for the lists of that moment
        papers: [],
        actions: (actions ?? []).map(({ type, value }) => ({ type, value }))
      })
    }
  })
  const usedTokens = estimateTokens(INSTRUCTIONS + JSON.stringify(conversation)) + ANSWER_TOKENS
  const { context, papers } = describeSession(sessionData, contextWindow - usedTokens)
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
    maxOutputTokens: ANSWER_TOKENS,
    papers
  }
}

/**
 * Turns a model answer into the text for the user, the papers it singles out ({doi,
 * explanation}, among the publications listed in the request), and the valid actions ({type,
 * value}). Text of models that ignore the requested format counts as answer only.
 */
export function parseChatAnswer(answerText, listedPublications) {
  let answer
  try {
    answer = parseJsonAnswer(answerText)
  } catch {
    answer = { answer: answerText }
  }
  const text = String(answer.answer ?? '').trim()
  if (!text) throw new LlmError('invalid-response', 'The model gave an empty answer.')

  const papers = new Map()
  for (const paper of Array.isArray(answer.papers) ? answer.papers : []) {
    const doi = listedPublications[Number(paper?.id) - 1]?.doi
    if (doi && !papers.has(doi)) papers.set(doi, normalizeExplanation(paper.reason))
  }
  const actions = Array.isArray(answer.actions) ? answer.actions : []
  return {
    answer: text,
    papers: [...papers].map(([doi, explanation]) => ({ doi, explanation })),
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
