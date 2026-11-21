import { describe, expect, it } from 'vitest'

import {
  buildRecommendationRequest,
  parseRecommendations
} from '@/services/AiRecommendationService.js'

function createPublication(overrides) {
  return {
    doi: '10.1000/default',
    title: 'Default Publication',
    year: 2024,
    author: 'Doe, Jane',
    container: 'Test Journal',
    abstract: 'A publication abstract. '.repeat(30),
    score: 4,
    boostKeywords: [],
    referenceDois: [],
    citationDois: [],
    isSurvey: false,
    ...overrides
  }
}

const sessionData = (suggestedPublications) => ({
  selectedPublications: [
    createPublication({ doi: '10.1000/seed', title: 'Seed Paper', boostKeywords: ['VISUALIZATION'] })
  ],
  suggestedPublications,
  boostKeywordString: 'visualization, survey',
  keywords: ['VISUALIZATION', 'SURVEY'],
  steeringComment: 'Prefer recent survey papers.'
})

const suggestions = (count) =>
  Array.from({ length: count }, (_, index) =>
    createPublication({ doi: `10.2000/suggested-${index + 1}`, title: `Suggested Paper ${index + 1}` })
  )

describe('AiRecommendationService', () => {
  describe('buildRecommendationRequest', () => {
    it('describes the session to the model and requests schema-conforming JSON', () => {
      const suggested = [
        createPublication({
          doi: '10.2000/a',
          title: 'Suggested Paper A',
          referenceDois: ['10.1000/seed'],
          isSurvey: 'has "survey" in title'
        }),
        createPublication({ doi: '10.2000/b', title: 'Suggested Paper B' })
      ]

      const request = buildRecommendationRequest(sessionData(suggested), 64000)

      expect(request.candidates).toEqual(suggested)
      expect(request.maxOutputTokens).toBe(1024)
      expect(request.jsonSchema.schema.properties.recommendations.items.required).toEqual([
        'id',
        'explanation'
      ])
      expect(request.messages[0].role).toBe('system')
      expect(request.messages[0].content).toContain('Follow this priority order')

      const context = JSON.parse(request.messages[1].content)
      expect(context.selectionTarget).toContain('as a reference count, not a quota')
      expect(context.userKeywords).toEqual(['VISUALIZATION', 'SURVEY'])
      expect(context.rawKeywordQuery).toBe('visualization, survey')
      expect(context.userSteeringComment).toBe('Prefer recent survey papers.')
      expect(context.selectedSeedPapers[0]).toMatchObject({ seed: 1, title: 'Seed Paper' })
      expect(context.suggestedPapers[0]).toMatchObject({
        id: 1,
        title: 'Suggested Paper A',
        citesSeeds: [1],
        tags: [{ name: 'Literature survey', reason: 'has "survey" in title' }]
      })
      expect(context.suggestedPapers[0].abstract.length).toBeGreaterThan(300)
      expect(context.suggestedPapers[1].id).toBe(2)
    })

    it('shortens descriptions to fit small context windows before dropping suggestions', () => {
      const suggested = suggestions(40)

      const shortened = buildRecommendationRequest(sessionData(suggested), 8192)
      const shortenedContext = JSON.parse(shortened.messages[1].content)
      expect(shortened.candidates).toHaveLength(40)
      expect(shortenedContext.suggestedPapers[0].abstract.length).toBeLessThanOrEqual(300)

      const medium = buildRecommendationRequest(sessionData(suggested), 5000)
      const mediumContext = JSON.parse(medium.messages[1].content)
      expect(medium.candidates).toHaveLength(40)
      expect(mediumContext.suggestedPapers[0].abstract).toBeUndefined()
      expect(mediumContext.suggestedPapers[0].authors).toBe('Doe, Jane')

      const small = buildRecommendationRequest(sessionData(suggested), 3000)
      const smallContext = JSON.parse(small.messages[1].content)
      expect(small.candidates.length).toBeGreaterThan(0)
      expect(small.candidates.length).toBeLessThan(40)
      expect(small.candidates).toEqual(suggested.slice(0, small.candidates.length))
      expect(smallContext.suggestedPapers[0].authors).toBeUndefined()
    })

    it('fails clearly when the context window cannot hold any suggestion', () => {
      expect(() => buildRecommendationRequest(sessionData(suggestions(5)), 1200)).toThrow(
        'context window of the model is too small'
      )
    })
  })

  describe('parseRecommendations', () => {
    it('maps answered ids to publications and tolerates unconstrained output', () => {
      const candidates = suggestions(3)
      const answer = `Here you go:\n\`\`\`json\n${JSON.stringify({
        recommendations: [
          { id: 2, explanation: 'It matches the visualization keyword. Extra detail.' },
          { id: 2, explanation: 'Duplicate.' },
          { id: 9, explanation: 'Not a candidate.' },
          { id: '3', explanation: 'Bridges the seed papers' }
        ]
      })}\n\`\`\``

      expect(parseRecommendations(answer, candidates)).toEqual([
        { doi: '10.2000/suggested-2', explanation: 'It matches the visualization keyword.' },
        { doi: '10.2000/suggested-3', explanation: 'Bridges the seed papers' }
      ])
    })

    it('rejects answers without JSON', () => {
      expect(() => parseRecommendations('Sorry, I cannot help.', suggestions(1))).toThrow(
        'valid JSON'
      )
    })
  })
})
