import { estimateTokens, parseJsonAnswer, readPartialJsonString } from '@/llm/chat.ts'
import { LlmError } from '@/llm/types.ts'

const TEXT_MAX_LENGTH = 320
const EXPLANATION_MAX_LENGTH = 180
const REPORT_MAX_LENGTH = 600
const REASONING_MAX_LENGTH = 400
const STEERING_COMMENT_MAX_LENGTH = 700
const MIN_ANSWER_TOKENS = 1024
// Room for the reasoning and the report that frame the recommendations
const REPORT_TOKENS = 300
const ANSWER_TOKENS_PER_RECOMMENDATION = 100

// Levels of detail for describing publications, tried from rich to sparse until the prompt
// fits the model's context window; local models often offer only a few thousand tokens
export const DETAIL_LEVELS = [
  { abstractLength: 900, includesMetadata: true },
  { abstractLength: 300, includesMetadata: true },
  { abstractLength: 0, includesMetadata: true },
  { abstractLength: 0, includesMetadata: false }
]

const TAG_FIELDS = [
  { field: 'isHighlyCited', label: 'Highly cited' },
  { field: 'isSurvey', label: 'Literature survey' },
  { field: 'isNew', label: 'New' },
  { field: 'isUnnoted', label: 'Unnoted' }
]

const INSTRUCTIONS = [
  'You are an expert research assistant for citation-based literature discovery.',
  'The requested number of recommendations is an expectation, not a quota: return fewer, including none, if the candidates are weak or off-topic, but never more than the stated maximum.',
  'Follow this priority order: (1) the user steering comment when present, (2) fit to the selected seed papers and user keywords, (3) citation/link evidence, tags, scores, venues, years, and abstracts.',
  'When userSteeringComment is non-empty, treat it as the primary user intent: first identify candidates that satisfy it, then rank those candidates by the other evidence. Do not select a paper that conflicts with the steering comment unless too few supported candidates fit it.',
  'Without a steering comment, prefer papers that are central to the topic, connect multiple seed papers, match the user keywords, or provide strong survey/bridge value.',
  'Ground every choice in the provided candidate evidence; do not invent metadata or recommend papers outside the list.',
  'When the steering comment influenced a selection, reflect that fit in the explanation.',
  'Refer to suggested papers only by their numeric id.',
  'Each explanation must be one brief sentence suitable for a tooltip.',
  'Before choosing, state your reasoning in one or two plain sentences: what you look for among the suggestions in this step and why. As in the report, never mention ids, seed numbers, or field names in it.',
  'Set loadMoreSuggestions to true only if canLoadMoreSuggestions is true and the listed suggestions contain too few fitting papers for the expected number; otherwise set it to false.',
  'Write the report for the user in two or three plain sentences. The user sees the recommended papers listed next to the report and does not know the numbering used here, so never mention ids, seed numbers, or field names, and do not enumerate individual papers. Instead, describe in everyday words which themes the recommendations of this run cover (including seed papers marked addedInThisRun, which you recommended in earlier steps of the same run), how they extend the selection, and which fitting topics are likely still missing.',
  'Answer with a JSON object of the form {"reasoning":"<one or two sentences>","recommendations":[{"id":<id of a suggested paper>,"explanation":"<one sentence>"}],"loadMoreSuggestions":<true or false>,"report":"<two or three sentences>"} and nothing else.'
].join(' ')

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reasoning', 'recommendations', 'loadMoreSuggestions', 'report'],
  // Models write the fields in this order: reasoning first, the report on the whole last
  properties: {
    reasoning: { type: 'string' },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'explanation'],
        properties: {
          id: { type: 'integer' },
          explanation: { type: 'string' }
        }
      }
    },
    loadMoreSuggestions: { type: 'boolean' },
    report: { type: 'string' }
  }
}

function truncateText(value, maxLength = TEXT_MAX_LENGTH) {
  if (!value) return ''
  const text = String(value).replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3).trim()}...`
}

/** Describes a publication for a prompt, at one of the DETAIL_LEVELS. */
export function serializePublication(publication, detail) {
  const serialized = {
    title: truncateText(publication.title),
    year: publication.year || null,
    keywordMatches: publication.boostKeywords || []
  }
  if (detail.includesMetadata) {
    serialized.authors = truncateText(publication.author)
    serialized.venue = truncateText(publication.container)
    serialized.tags = TAG_FIELDS.filter((tag) => publication[tag.field]).map((tag) => ({
      name: tag.label,
      reason: publication[tag.field]
    }))
  }
  if (detail.abstractLength && publication.abstract) {
    serialized.abstract = truncateText(publication.abstract, detail.abstractLength)
  }
  return serialized
}

function serializeSuggestedPublication(publication, id, seedNumberByDoi, detail) {
  const linkedSeeds = (dois) =>
    [...dois].filter((doi) => seedNumberByDoi.has(doi)).map((doi) => seedNumberByDoi.get(doi))
  return {
    id,
    ...serializePublication(publication, detail),
    score: publication.score,
    citesSeeds: linkedSeeds(publication.referenceDois),
    citedBySeeds: linkedSeeds(publication.citationDois)
  }
}

/**
 * Builds the chat request asking a model to pick the most useful suggested publications.
 * Publications are described as detailed as the context window (in tokens) allows; if even
 * the sparsest description does not fit, only the top-ranked suggestions are considered.
 * @param {Object} sessionData - Selected and suggested publications (with the total number of
 *   suggestions available), DOIs added earlier in the same run, whether more suggestions may
 *   be loaded, keywords, and steering comment
 * @param {number} minCount - Number of recommendations expected at least
 * @param {number} maxCount - Number of recommendations allowed at most
 * @param {number} contextWindow - Tokens available for prompt and answer
 * @returns {{messages: Array, jsonSchema: Object, maxOutputTokens: number, candidates: Array,
 *   canLoadMore: boolean}} the request parts, the suggested publications the model gets to see
 *   (`candidates`, referred to in the answer by their 1-based position), and whether the model
 *   was offered to ask for more suggestions.
 */
export function buildRecommendationRequest(
  {
    selectedPublications,
    suggestedPublications,
    totalSuggestions,
    addedDois,
    isLoadMoreAllowed,
    boostKeywordString,
    keywords,
    steeringComment = ''
  },
  minCount,
  maxCount,
  contextWindow
) {
  const expectedCount = minCount === maxCount ? `${maxCount}` : `${minCount} to ${maxCount}`
  const maxOutputTokens = Math.max(
    MIN_ANSWER_TOKENS,
    maxCount * ANSWER_TOKENS_PER_RECOMMENDATION + REPORT_TOKENS
  )
  const seedNumberByDoi = new Map(
    selectedPublications.map((publication, index) => [publication.doi, index + 1])
  )

  let context
  let candidates = []
  for (const detail of DETAIL_LEVELS) {
    context = {
      task: 'Select the suggested papers that are most useful for continuing this literature search.',
      selectionTarget: `Recommend ${expectedCount} paper${maxCount === 1 ? '' : 's'}. Return fewer, including none, when fewer candidates fit well; never return more than ${maxCount}.`,
      priorityPolicy:
        'If userSteeringComment is present, satisfying it is the primary ranking criterion. Use the general relevance signals only to evaluate evidence and break ties between papers that fit the steering comment.',
      userKeywords: keywords.filter(Boolean),
      rawKeywordQuery: boostKeywordString || '',
      userSteeringComment: truncateText(steeringComment, STEERING_COMMENT_MAX_LENGTH),
      selectedSeedPapers: selectedPublications.map((publication, index) => ({
        seed: index + 1,
        ...serializePublication(publication, detail),
        ...(addedDois.includes(publication.doi) ? { addedInThisRun: true } : {})
      })),
      suggestionsShown: suggestedPublications.length,
      suggestionsTotal: totalSuggestions,
      canLoadMoreSuggestions: false,
      suggestedPapers: []
    }
    let remainingTokens =
      contextWindow - maxOutputTokens - estimateTokens(INSTRUCTIONS + JSON.stringify(context))
    candidates = []
    for (const publication of suggestedPublications) {
      const serialized = serializeSuggestedPublication(
        publication,
        candidates.length + 1,
        seedNumberByDoi,
        detail
      )
      remainingTokens -= estimateTokens(JSON.stringify(serialized)) + 1
      if (remainingTokens < 0) break
      context.suggestedPapers.push(serialized)
      candidates.push(publication)
    }
    if (candidates.length === suggestedPublications.length) break
  }

  if (!candidates.length) {
    throw new LlmError(
      'context-overflow',
      'The context window of the model is too small for the selected publications. Choose a model or setting with a larger context window.'
    )
  }

  // Further suggestions only help if the model gets to see them
  const canLoadMore =
    isLoadMoreAllowed &&
    candidates.length === suggestedPublications.length &&
    totalSuggestions > suggestedPublications.length
  context.suggestionsShown = candidates.length
  context.canLoadMoreSuggestions = canLoadMore

  return {
    messages: [
      { role: 'system', content: INSTRUCTIONS },
      { role: 'user', content: JSON.stringify(context) }
    ],
    jsonSchema: { name: 'ai_recommendations', schema: RESPONSE_SCHEMA },
    maxOutputTokens,
    candidates,
    canLoadMore
  }
}

/** Shortens an explanation of the model to one sentence suitable for a tooltip. */
export function normalizeExplanation(explanation) {
  const text = truncateText(explanation, EXPLANATION_MAX_LENGTH)
  const sentenceMatch = text.match(/^.*?[.!?](?:\s|$)/)
  return sentenceMatch ? sentenceMatch[0].trim() : text
}

/**
 * Turns a model answer into at most `maxCount` recommendations ({doi, explanation}), dropping
 * duplicates and references to publications that were not among the candidates, together
 * with the model's `reasoning`, its wish to see more suggestions (`loadMore`), and its brief
 * `report`.
 */
export function parseRecommendationAnswer(answerText, candidates, maxCount) {
  const answer = parseJsonAnswer(answerText)
  const seenDois = new Set()
  const recommendations = []
  for (const recommendation of answer.recommendations || []) {
    const doi = candidates[Number(recommendation?.id) - 1]?.doi
    if (!doi || seenDois.has(doi)) continue
    seenDois.add(doi)
    recommendations.push({ doi, explanation: normalizeExplanation(recommendation.explanation) })
  }
  return {
    reasoning: truncateText(answer.reasoning, REASONING_MAX_LENGTH),
    recommendations: recommendations.slice(0, maxCount),
    loadMore: answer.loadMoreSuggestions === true,
    report: truncateText(answer.report, REPORT_MAX_LENGTH)
  }
}

// A JSON string body, possibly cut off before its closing quote
const STRING_BODY = String.raw`((?:[^"\\]|\\.)*)`
const FINISHED_RECOMMENDATION = new RegExp(
  `\\{\\s*"id"\\s*:\\s*"?(\\d+)"?\\s*,\\s*"explanation"\\s*:\\s*"${STRING_BODY}"\\s*\\}`,
  'g'
)

function unescapeJsonString(body) {
  try {
    return JSON.parse(`"${body}"`)
  } catch {
    return body
  }
}

/**
 * Reads what is already usable from an answer that is still being written: the reasoning as
 * far as it got and the recommendations ({doi, explanation}) that are complete.
 */
export function parsePartialRecommendationAnswer(answerText, candidates) {
  const recommendations = []
  for (const [, id, explanation] of answerText.matchAll(FINISHED_RECOMMENDATION)) {
    const doi = candidates[Number(id) - 1]?.doi
    if (doi) {
      recommendations.push({
        doi,
        explanation: normalizeExplanation(unescapeJsonString(explanation))
      })
    }
  }
  return {
    reasoning: readPartialJsonString(answerText, 'reasoning'),
    recommendations
  }
}
