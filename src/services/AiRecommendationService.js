const OPENAI_API_KEY_STORAGE_KEY = 'pureSuggest.openaiApiKey'
const OPENAI_MODEL = 'gpt-5.4'
const OPENAI_REASONING_EFFORT = 'low'
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const ABSTRACT_MAX_LENGTH = 900
const TEXT_MAX_LENGTH = 320
const EXPLANATION_MAX_LENGTH = 180
const MAX_RECOMMENDATION_MULTIPLIER = 2

const TAG_FIELDS = [
  { field: 'isHighlyCited', label: 'Highly cited' },
  { field: 'isSurvey', label: 'Literature survey' },
  { field: 'isNew', label: 'New' },
  { field: 'isUnnoted', label: 'Unnoted' }
]

function truncateText(value, maxLength = TEXT_MAX_LENGTH) {
  if (!value) return ''
  const text = String(value).replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3).trim()}...`
}

function getStoredOpenAiApiKey() {
  try {
    return localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function storeOpenAiApiKey(apiKey) {
  try {
    localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, apiKey)
  } catch {
    // Continue with the in-memory key for this request if storage is unavailable.
  }
}

function clearStoredOpenAiApiKey() {
  try {
    localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY)
  } catch {
    // Nothing to clear if localStorage is unavailable.
  }
}

function requestOpenAiApiKey() {
  const existingKey = getStoredOpenAiApiKey()
  if (existingKey) return existingKey

  const apiKey = window.prompt(
    'Enter your OpenAI API key. It will be stored in this browser only for future AI recommendations.'
  )

  if (!apiKey?.trim()) return ''

  const trimmedKey = apiKey.trim()
  storeOpenAiApiKey(trimmedKey)
  return trimmedKey
}

function getPublicationTags(publication) {
  return TAG_FIELDS.filter((tag) => publication[tag.field]).map((tag) => ({
    name: tag.label,
    reason: publication[tag.field]
  }))
}

function getLinkedSelectedPublications(dois, selectedPublicationMap) {
  return dois
    .filter((doi) => selectedPublicationMap.has(doi))
    .map((doi) => {
      const publication = selectedPublicationMap.get(doi)
      return {
        doi: publication.doi,
        title: truncateText(publication.title),
        year: publication.year || null,
        keywordMatches: publication.boostKeywords || []
      }
    })
}

function serializeSelectedPublication(publication) {
  return {
    doi: publication.doi,
    title: truncateText(publication.title),
    year: publication.year || null,
    authors: truncateText(publication.author),
    venue: truncateText(publication.container),
    abstract: truncateText(publication.abstract, ABSTRACT_MAX_LENGTH),
    keywordMatches: publication.boostKeywords || [],
    tags: getPublicationTags(publication)
  }
}

function serializeSuggestedPublication(publication, selectedPublicationMap) {
  return {
    doi: publication.doi,
    title: truncateText(publication.title),
    year: publication.year || null,
    authors: truncateText(publication.author),
    venue: truncateText(publication.container),
    abstract: truncateText(publication.abstract, ABSTRACT_MAX_LENGTH),
    score: publication.score,
    citationCount: publication.citationCount,
    referenceCount: publication.referenceCount,
    keywordMatches: publication.boostKeywords || [],
    tags: getPublicationTags(publication),
    linksToSelectedPapers: {
      candidateCitesSelected: getLinkedSelectedPublications(
        publication.referenceDois || [],
        selectedPublicationMap
      ),
      selectedCitesCandidate: getLinkedSelectedPublications(
        publication.citationDois || [],
        selectedPublicationMap
      )
    }
  }
}

function buildRecommendationCountGuidance(suggestedPublicationCount, referenceCount) {
  return {
    referenceCount,
    minCount: 0,
    maxCount: Math.min(
      suggestedPublicationCount,
      Math.max(referenceCount + 2, Math.ceil(referenceCount * MAX_RECOMMENDATION_MULTIPLIER))
    )
  }
}

function buildRecommendationContext({
  selectedPublications,
  suggestedPublications,
  boostKeywordString,
  keywords,
  steeringComment,
  countGuidance
}) {
  const selectedPublicationMap = new Map(
    selectedPublications.map((publication) => [publication.doi, publication])
  )

  return {
    task:
      'Select the suggested papers that are most useful for continuing this literature search.',
    selectionTarget:
      `Use ${countGuidance.referenceCount} paper${countGuidance.referenceCount === 1 ? '' : 's'} as a reference count, not a quota. Return fewer, including zero, when few candidates fit well; return more, up to ${countGuidance.maxCount}, when many candidates are clearly useful.`,
    recommendationCount: countGuidance,
    priorityPolicy:
      'If userSteeringComment is present, satisfying it is the primary ranking criterion. Use the general relevance signals only to evaluate evidence and break ties between papers that fit the steering comment.',
    userKeywords: keywords.filter(Boolean),
    rawKeywordQuery: boostKeywordString || '',
    userSteeringComment: truncateText(steeringComment, 700),
    selectedSeedPapers: selectedPublications.map(serializeSelectedPublication),
    suggestedPapers: suggestedPublications.map((publication) =>
      serializeSuggestedPublication(publication, selectedPublicationMap)
    )
  }
}

function buildResponseSchema(suggestedPublications, countGuidance) {
  return {
    type: 'json_schema',
    name: 'ai_recommendations',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['recommendations'],
      properties: {
        recommendations: {
          type: 'array',
          minItems: countGuidance.minCount,
          maxItems: countGuidance.maxCount,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['doi', 'explanation'],
            properties: {
              doi: {
                type: 'string',
                enum: suggestedPublications.map((publication) => publication.doi)
              },
              explanation: {
                type: 'string'
              }
            }
          }
        }
      }
    }
  }
}

function buildOpenAiRequest(context, suggestedPublications, countGuidance) {
  return {
    model: OPENAI_MODEL,
    reasoning: {
      effort: OPENAI_REASONING_EFFORT
    },
    instructions: [
      'You are an expert research assistant for citation-based literature discovery.',
      'The recommendation count is flexible: use the reference count as a starting point, return fewer if the candidates are weak or off-topic, and return more if many candidates strongly fit the seed papers, keywords, or steering comment.',
      'Follow this priority order: (1) the user steering comment when present, (2) fit to the selected seed papers and user keywords, (3) citation/link evidence, tags, scores, venues, years, and abstracts.',
      'When userSteeringComment is non-empty, treat it as the primary user intent: first identify candidates that satisfy it, then rank those candidates by the other evidence. Do not select a paper that conflicts with the steering comment unless too few supported candidates fit it.',
      'Without a steering comment, prefer papers that are central to the topic, connect multiple seed papers, match the user keywords, or provide strong survey/bridge value.',
      'Ground every choice in the provided candidate evidence; do not invent metadata or recommend papers outside the list.',
      'When the steering comment influenced a selection, reflect that fit in the explanation.',
      'Return only suggested-paper DOIs from the provided candidates.',
      'Each explanation must be one brief sentence suitable for a tooltip.'
    ].join(' '),
    input: JSON.stringify(context, null, 2),
    text: {
      format: buildResponseSchema(suggestedPublications, countGuidance)
    },
    max_output_tokens: Math.max(800, countGuidance.maxCount * 90)
  }
}

function getOutputText(responseData) {
  if (responseData.output_text) return responseData.output_text

  return (responseData.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === 'output_text' || content.type === 'text')
    .map((content) => content.text)
    .join('')
}

function normalizeExplanation(explanation) {
  const text = truncateText(explanation, EXPLANATION_MAX_LENGTH)
  const sentenceMatch = text.match(/^.*?[.!?](?:\s|$)/)
  return sentenceMatch ? sentenceMatch[0].trim() : text
}

function normalizeRecommendations(parsedResponse, suggestedPublications) {
  const suggestedDois = new Set(suggestedPublications.map((publication) => publication.doi))
  const seenDois = new Set()

  return (parsedResponse.recommendations || []).reduce((recommendations, recommendation) => {
    const doi = recommendation.doi?.toLowerCase()
    if (!doi || !suggestedDois.has(doi) || seenDois.has(doi)) return recommendations

    seenDois.add(doi)
    recommendations.push({
      doi,
      explanation: normalizeExplanation(recommendation.explanation)
    })
    return recommendations
  }, [])
}

async function callOpenAi(apiKey, requestBody) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const responseData = await response.json().catch(() => ({}))

  if (response.status === 401) {
    clearStoredOpenAiApiKey()
    throw new Error('The OpenAI API key was rejected. Please try again with a valid key.')
  }

  if (!response.ok) {
    throw new Error(responseData.error?.message || 'OpenAI could not create recommendations.')
  }

  return responseData
}

export async function selectAiRecommendedPublications({
  selectedPublications,
  suggestedPublications,
  boostKeywordString,
  keywords,
  steeringComment = ''
}) {
  if (!suggestedPublications.length) return []

  const apiKey = requestOpenAiApiKey()
  if (!apiKey) return null

  const referenceCount = Math.max(1, Math.round(suggestedPublications.length * 0.1))
  const countGuidance = buildRecommendationCountGuidance(
    suggestedPublications.length,
    referenceCount
  )
  const context = buildRecommendationContext({
    selectedPublications,
    suggestedPublications,
    boostKeywordString,
    keywords,
    steeringComment,
    countGuidance
  })
  const requestBody = buildOpenAiRequest(context, suggestedPublications, countGuidance)
  const responseData = await callOpenAi(apiKey, requestBody)
  const outputText = getOutputText(responseData)

  if (!outputText) {
    throw new Error('OpenAI returned an empty recommendation response.')
  }

  let parsedResponse
  try {
    parsedResponse = JSON.parse(outputText)
  } catch {
    throw new Error('OpenAI returned a recommendation response that could not be parsed.')
  }

  return normalizeRecommendations(parsedResponse, suggestedPublications)
}
