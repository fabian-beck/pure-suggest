import { describe, expect, it } from 'vitest'

import {
  buildRecommendationRequest,
  parsePartialRecommendationAnswer,
  parseRecommendationAnswer
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
    referenceDois: new Set(),
    citationDois: new Set(),
    isSurvey: false,
    ...overrides
  }
}

const sessionData = (suggestedPublications, overrides = {}) => ({
  selectedPublications: [
    createPublication({
      doi: '10.1000/seed',
      title: 'Seed Paper',
      boostKeywords: ['VISUALIZATION']
    })
  ],
  suggestedPublications,
  totalSuggestions: suggestedPublications.length,
  addedDois: [],
  isLoadMoreAllowed: true,
  boostKeywordString: 'visualization, survey',
  keywords: ['VISUALIZATION', 'SURVEY'],
  steeringComment: 'Prefer recent survey papers.',
  ...overrides
})

const suggestions = (count) =>
  Array.from({ length: count }, (_, index) =>
    createPublication({
      doi: `10.2000/suggested-${index + 1}`,
      title: `Suggested Paper ${index + 1}`
    })
  )

describe('AiRecommendationService', () => {
  describe('buildRecommendationRequest', () => {
    it('describes the session to the model and requests schema-conforming JSON', () => {
      const suggested = [
        createPublication({
          doi: '10.2000/a',
          title: 'Suggested Paper A',
          referenceDois: new Set(['10.1000/seed', '10.3000/other']),
          citationDois: new Set(['10.1000/seed']),
          isSurvey: 'has "survey" in title'
        }),
        createPublication({ doi: '10.2000/b', title: 'Suggested Paper B' })
      ]

      const request = buildRecommendationRequest(sessionData(suggested), 1, 2, 64000)

      expect(request.candidates).toEqual(suggested)
      expect(request.maxOutputTokens).toBe(1024)
      // The reasoning comes first, so that it is written (and shown) before the choices
      expect(Object.keys(request.jsonSchema.schema.properties)).toEqual([
        'reasoning',
        'recommendations',
        'loadMoreSuggestions',
        'report'
      ])
      expect(request.jsonSchema.schema.required).toHaveLength(4)
      expect(request.messages[0].role).toBe('system')
      expect(request.messages[0].content).toContain('Follow this priority order')
      // The report is read by people who never see the numbering used in the prompt
      expect(request.messages[0].content).toContain('never mention ids, seed numbers')

      const context = JSON.parse(request.messages[1].content)
      expect(context.selectionTarget).toContain('Recommend 1 to 2 papers.')
      expect(context.selectionTarget).toContain('never return more than 2')
      expect(context.userKeywords).toEqual(['VISUALIZATION', 'SURVEY'])
      expect(context.rawKeywordQuery).toBe('visualization, survey')
      expect(context.userSteeringComment).toBe('Prefer recent survey papers.')
      expect(context.selectedSeedPapers[0]).toMatchObject({ seed: 1, title: 'Seed Paper' })
      expect(context.suggestedPapers[0]).toMatchObject({
        id: 1,
        title: 'Suggested Paper A',
        citesSeeds: [1],
        citedBySeeds: [1],
        tags: [{ name: 'Literature survey', reason: 'has "survey" in title' }]
      })
      expect(context.suggestedPapers[0].abstract.length).toBeGreaterThan(300)
      expect(context.suggestedPapers[1].id).toBe(2)
    })

    it('shortens descriptions to fit small context windows before dropping suggestions', () => {
      const suggested = suggestions(40)

      const shortened = buildRecommendationRequest(sessionData(suggested), 3, 8, 8192)
      const shortenedContext = JSON.parse(shortened.messages[1].content)
      expect(shortened.candidates).toHaveLength(40)
      expect(shortenedContext.suggestedPapers[0].abstract.length).toBeLessThanOrEqual(300)

      const medium = buildRecommendationRequest(sessionData(suggested), 3, 8, 5000)
      const mediumContext = JSON.parse(medium.messages[1].content)
      expect(medium.candidates).toHaveLength(40)
      expect(mediumContext.suggestedPapers[0].abstract).toBeUndefined()
      expect(mediumContext.suggestedPapers[0].authors).toBe('Doe, Jane')

      const small = buildRecommendationRequest(sessionData(suggested), 3, 8, 2500)
      const smallContext = JSON.parse(small.messages[1].content)
      expect(small.candidates.length).toBeGreaterThan(0)
      expect(small.candidates.length).toBeLessThan(40)
      expect(small.candidates).toEqual(suggested.slice(0, small.candidates.length))
      expect(smallContext.suggestedPapers[0].authors).toBeUndefined()
    })

    it('states the expected number of papers and reserves room for the answers', () => {
      const exact = buildRecommendationRequest(sessionData(suggestions(40)), 30, 30, 64000)

      expect(JSON.parse(exact.messages[1].content).selectionTarget).toContain(
        'Recommend 30 papers.'
      )
      expect(exact.maxOutputTokens).toBe(3300)
    })

    it('offers loading more suggestions only if allowed, available, and visible to the model', () => {
      const build = (overrides, contextWindow = 64000) =>
        buildRecommendationRequest(sessionData(suggestions(40), overrides), 3, 8, contextWindow)
      const context = (request) => JSON.parse(request.messages[1].content)

      const offered = build({ totalSuggestions: 500 })
      expect(offered.canLoadMore).toBe(true)
      expect(context(offered)).toMatchObject({
        suggestionsShown: 40,
        suggestionsTotal: 500,
        canLoadMoreSuggestions: true
      })

      expect(build({ totalSuggestions: 40 }).canLoadMore).toBe(false)
      expect(build({ totalSuggestions: 500, isLoadMoreAllowed: false }).canLoadMore).toBe(false)
      // Further suggestions would not fit the prompt anyway
      const cutOff = build({ totalSuggestions: 500 }, 2500)
      expect(cutOff.canLoadMore).toBe(false)
      expect(context(cutOff).canLoadMoreSuggestions).toBe(false)
    })

    it('marks the papers added earlier in the same run', () => {
      const data = sessionData(suggestions(3), { addedDois: ['10.1000/added'] })
      data.selectedPublications.push(createPublication({ doi: '10.1000/added', title: 'Added' }))

      const seeds = JSON.parse(
        buildRecommendationRequest(data, 1, 2, 64000).messages[1].content
      ).selectedSeedPapers

      expect(seeds[0].addedInThisRun).toBeUndefined()
      expect(seeds[1]).toMatchObject({ title: 'Added', addedInThisRun: true })
    })

    it('fails clearly when the context window cannot hold any suggestion', () => {
      expect(() => buildRecommendationRequest(sessionData(suggestions(5)), 1, 2, 1200)).toThrow(
        'context window of the model is too small'
      )
    })
  })

  describe('parseRecommendationAnswer', () => {
    it('maps answered ids to publications and tolerates unconstrained output', () => {
      const candidates = suggestions(3)
      const answer = `Here you go:\n\`\`\`json\n${JSON.stringify({
        recommendations: [
          { id: 2, explanation: 'It matches the visualization keyword. Extra detail.' },
          { id: 2, explanation: 'Duplicate.' },
          { id: 9, explanation: 'Not a candidate.' },
          { id: '3', explanation: 'Bridges the seed papers' }
        ],
        reasoning: 'I look for visualization papers.',
        loadMoreSuggestions: true,
        report: '  Two papers on visualization   fit the seeds.  '
      })}\n\`\`\``

      expect(parseRecommendationAnswer(answer, candidates, 5)).toEqual({
        recommendations: [
          { doi: '10.2000/suggested-2', explanation: 'It matches the visualization keyword.' },
          { doi: '10.2000/suggested-3', explanation: 'Bridges the seed papers' }
        ],
        reasoning: 'I look for visualization papers.',
        loadMore: true,
        report: 'Two papers on visualization fit the seeds.'
      })
    })

    it('never returns more recommendations than asked for and copes with missing fields', () => {
      const answer = JSON.stringify({
        recommendations: [1, 2, 3].map((id) => ({ id, explanation: 'Fits.' }))
      })

      const parsed = parseRecommendationAnswer(answer, suggestions(3), 2)

      expect(parsed.recommendations.map(({ doi }) => doi)).toEqual([
        '10.2000/suggested-1',
        '10.2000/suggested-2'
      ])
      expect(parsed.loadMore).toBe(false)
      expect(parsed.report).toBe('')
      expect(parsed.reasoning).toBe('')
    })

    it('reads reasoning and finished choices from an answer that is still being written', () => {
      const candidates = suggestions(3)
      const written =
        '{"reasoning":"I look for \\"survey\\" papers","recommendations":[{"id":2,"explanation":"A survey."},{"id":3,"explanation":"Brid'

      expect(parsePartialRecommendationAnswer(written.slice(0, 30), candidates)).toEqual({
        reasoning: 'I look for "sur',
        recommendations: []
      })
      expect(parsePartialRecommendationAnswer(written, candidates)).toEqual({
        reasoning: 'I look for "survey" papers',
        recommendations: [{ doi: '10.2000/suggested-2', explanation: 'A survey.' }]
      })
      expect(parsePartialRecommendationAnswer('', candidates)).toEqual({
        reasoning: '',
        recommendations: []
      })
    })

    it('rejects answers without JSON', () => {
      expect(() => parseRecommendationAnswer('Sorry, I cannot help.', suggestions(1), 1)).toThrow(
        'valid JSON'
      )
    })
  })
})
