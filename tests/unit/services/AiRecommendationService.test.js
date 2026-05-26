import { beforeEach, describe, expect, it, vi } from 'vitest'

import { selectAiRecommendedPublications } from '@/services/AiRecommendationService.js'

const STORAGE_KEY = 'pureSuggest.openaiApiKey'

function createPublication(overrides) {
  return {
    doi: '10.1000/default',
    title: 'Default Publication',
    year: 2024,
    author: 'Doe, Jane',
    container: 'Test Journal',
    abstract: 'A publication abstract.',
    score: 4,
    citationCount: 2,
    referenceCount: 2,
    boostKeywords: [],
    referenceDois: [],
    citationDois: [],
    isHighlyCited: false,
    isSurvey: false,
    isNew: false,
    isUnnoted: false,
    ...overrides
  }
}

describe('AiRecommendationService', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    global.fetch = vi.fn()
    window.prompt = vi.fn()
  })

  it('asks for a key, sends one contextual OpenAI request, and normalizes recommendations', async () => {
    window.prompt.mockReturnValue('sk-test')
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          output_text: JSON.stringify({
            recommendations: [
              {
                doi: '10.2000/suggested-a',
                explanation: 'It directly matches the visualization keyword. Extra detail.'
              }
            ]
          })
        })
    })

    const selectedPublications = [
      createPublication({
        doi: '10.1000/seed',
        title: 'Seed Paper',
        boostKeywords: ['VISUALIZATION']
      })
    ]
    const suggestedPublications = [
      createPublication({
        doi: '10.2000/suggested-a',
        title: 'Suggested Paper A',
        boostKeywords: ['VISUALIZATION'],
        referenceDois: ['10.1000/seed']
      }),
      createPublication({
        doi: '10.2000/suggested-b',
        title: 'Suggested Paper B'
      })
    ]

    const recommendations = await selectAiRecommendedPublications({
      selectedPublications,
      suggestedPublications,
      boostKeywordString: 'visualization, survey',
      keywords: ['VISUALIZATION', 'SURVEY'],
      steeringComment: 'Prefer recent survey papers that bridge the seed papers.'
    })

    expect(window.prompt).toHaveBeenCalledOnce()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('sk-test')
    expect(global.fetch).toHaveBeenCalledOnce()

    const [, request] = global.fetch.mock.calls[0]
    expect(request.headers.Authorization).toBe('Bearer sk-test')

    const requestBody = JSON.parse(request.body)
    const context = JSON.parse(requestBody.input)
    expect(requestBody.model).toBe('gpt-5.4-mini')
    expect(context.userKeywords).toEqual(['VISUALIZATION', 'SURVEY'])
    expect(context.rawKeywordQuery).toBe('visualization, survey')
    expect(context.userSteeringComment).toBe(
      'Prefer recent survey papers that bridge the seed papers.'
    )
    expect(context.selectedSeedPapers[0].doi).toBe('10.1000/seed')
    expect(context.suggestedPapers.map((publication) => publication.doi)).toEqual([
      '10.2000/suggested-a',
      '10.2000/suggested-b'
    ])
    expect(context.suggestedPapers[0].linksToSelectedPapers.candidateCitesSelected[0].doi).toBe(
      '10.1000/seed'
    )

    expect(recommendations).toEqual([
      {
        doi: '10.2000/suggested-a',
        explanation: 'It directly matches the visualization keyword.'
      }
    ])
  })

  it('uses a stored key without prompting again', async () => {
    localStorage.setItem(STORAGE_KEY, 'sk-stored')
    window.prompt.mockReturnValue('sk-other')
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ output_text: '{"recommendations":[]}' })
    })

    await selectAiRecommendedPublications({
      selectedPublications: [],
      suggestedPublications: [createPublication({ doi: '10.2000/suggested-a' })],
      boostKeywordString: '',
      keywords: []
    })

    const [, request] = global.fetch.mock.calls[0]
    expect(window.prompt).not.toHaveBeenCalled()
    expect(request.headers.Authorization).toBe('Bearer sk-stored')
  })

  it('does not call OpenAI when the key prompt is cancelled', async () => {
    window.prompt.mockReturnValue('')

    const recommendations = await selectAiRecommendedPublications({
      selectedPublications: [],
      suggestedPublications: [createPublication({ doi: '10.2000/suggested-a' })],
      boostKeywordString: '',
      keywords: []
    })

    expect(recommendations).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('clears a rejected stored key', async () => {
    localStorage.setItem(STORAGE_KEY, 'sk-invalid')
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Invalid key' } })
    })

    await expect(
      selectAiRecommendedPublications({
        selectedPublications: [],
        suggestedPublications: [createPublication({ doi: '10.2000/suggested-a' })],
        boostKeywordString: '',
        keywords: []
      })
    ).rejects.toThrow('The OpenAI API key was rejected')

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
