import { estimateTokens, parseJsonAnswer } from '@/llm/chat.ts'
import { LlmError } from '@/llm/types.ts'

const TEXT_MAX_LENGTH = 320
const EXPLANATION_MAX_LENGTH = 180
const STEERING_COMMENT_MAX_LENGTH = 700
const MIN_ANSWER_TOKENS = 1024
const ANSWER_TOKENS_PER_RECOMMENDATION = 100

// Levels of detail for describing publications, tried from rich to sparse until the prompt
// fits the model's context window; local models often offer only a few thousand tokens
const DETAIL_LEVELS = [
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
  'Answer with a JSON object of the form {"recommendations":[{"id":<id of a suggested paper>,"explanation":"<one sentence>"}]} and nothing else.'
].join(' ')

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['recommendations'],
  properties: {
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
    }
  }
}

function truncateText(value, maxLength = TEXT_MAX_LENGTH) {
  if (!value) return ''
  const text = String(value).replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3).trim()}...`
}

function serializePublication(publication, detail) {
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
 * @param {Object} sessionData - Selected and suggested publications, keywords, steering comment
 * @param {number} minCount - Number of recommendations expected at least
 * @param {number} maxCount - Number of recommendations allowed at most
 * @param {number} contextWindow - Tokens available for prompt and answer
 * @returns {{messages: Array, jsonSchema: Object, maxOutputTokens: number, candidates: Array}}
 *   the request parts and the suggested publications the model gets to see (`candidates`,
 *   referred to in the answer by their 1-based position).
 */
export function buildRecommendationRequest(
  { selectedPublications, suggestedPublications, boostKeywordString, keywords, steeringComment = '' },
  minCount,
  maxCount,
  contextWindow
) {
  const expectedCount = minCount === maxCount ? `${maxCount}` : `${minCount} to ${maxCount}`
  const maxOutputTokens = Math.max(MIN_ANSWER_TOKENS, maxCount * ANSWER_TOKENS_PER_RECOMMENDATION)
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
        ...serializePublication(publication, detail)
      })),
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

  return {
    messages: [
      { role: 'system', content: INSTRUCTIONS },
      { role: 'user', content: JSON.stringify(context) }
    ],
    jsonSchema: { name: 'ai_recommendations', schema: RESPONSE_SCHEMA },
    maxOutputTokens,
    candidates
  }
}

function normalizeExplanation(explanation) {
  const text = truncateText(explanation, EXPLANATION_MAX_LENGTH)
  const sentenceMatch = text.match(/^.*?[.!?](?:\s|$)/)
  return sentenceMatch ? sentenceMatch[0].trim() : text
}

/**
 * Turns a model answer into at most `maxCount` recommendations ({doi, explanation}), dropping
 * duplicates and references to publications that were not among the candidates.
 */
export function parseRecommendations(answerText, candidates, maxCount) {
  const seenDois = new Set()
  const recommendations = []
  for (const recommendation of parseJsonAnswer(answerText).recommendations || []) {
    const doi = candidates[Number(recommendation?.id) - 1]?.doi
    if (!doi || seenDois.has(doi)) continue
    seenDois.add(doi)
    recommendations.push({ doi, explanation: normalizeExplanation(recommendation.explanation) })
  }
  return recommendations.slice(0, maxCount)
}
