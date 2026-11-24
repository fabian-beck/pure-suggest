import { describe, expect, it } from 'vitest'

import Filter from '@/core/Filter.js'
import {
  buildChatRequest,
  parseChatAnswer,
  parsePartialChatAnswer
} from '@/services/AiChatService.js'

const publication = (doi, overrides) => ({
  doi,
  title: `Paper ${doi}`,
  year: 2021,
  author: 'Doe, Jane',
  container: 'Test Journal',
  abstract: 'An abstract about citation networks. '.repeat(20),
  score: 5,
  boostKeywords: [],
  ...overrides
})

const sessionData = (overrides = {}) => {
  const filter = new Filter()
  filter.string = 'survey'
  filter.yearStart = '2015'
  filter.tags = ['isNew']
  return {
    selectedPublications: [publication('seed', { isSurvey: 'has "survey" in title' })],
    suggestedPublications: Array.from({ length: 30 }, (_, index) => publication(`s${index + 1}`)),
    totalSuggestions: 420,
    boostKeywordString: 'VISUAL|VIS, NETWORK',
    filter,
    ...overrides
  }
}

const context = (request) => JSON.parse(request.messages[0].content.split('Session data:\n')[1])

describe('AiChatService', () => {
  describe('buildChatRequest', () => {
    it('describes the session, its keywords and filters, and the possible actions', () => {
      const request = buildChatRequest(
        sessionData(),
        [{ role: 'user', text: 'Which papers are surveys?' }],
        64000
      )

      expect(request.messages[0].role).toBe('system')
      expect(request.messages[0].content).toContain('setKeywords replaces the boost keywords')
      expect(context(request)).toMatchObject({
        keywords: 'VISUAL|VIS, NETWORK',
        filters: { text: 'survey', years: '2015-', tags: ['isNew'], isActive: true },
        counts: { selected: 1, suggestionsLoaded: 30, suggestionsTotal: 420 }
      })
      expect(context(request).availableTags).toContainEqual({
        id: 'isSurvey',
        name: 'Literature survey'
      })
      expect(context(request).selectedPapers[0]).toMatchObject({
        title: 'Paper seed',
        authors: 'Doe, Jane',
        tags: [{ name: 'Literature survey' }]
      })
      expect(context(request).suggestedPapers).toHaveLength(30)
      // Papers are numbered across both lists, for the model to single some of them out
      expect(context(request).selectedPapers[0].id).toBe(1)
      expect(
        context(request)
          .suggestedPapers.map((paper) => paper.id)
          .slice(0, 2)
      ).toEqual([2, 3])
      expect(request.papers.map((paper) => paper.doi).slice(0, 3)).toEqual(['seed', 's1', 's2'])
      expect(request.messages[0].content).toContain('marks them as "AI recommended"')
      expect(Object.keys(request.jsonSchema.schema.properties)).toEqual([
        'answer',
        'papers',
        'actions'
      ])
      expect(request.messages.at(-1)).toEqual({
        role: 'user',
        content: 'Which papers are surveys?'
      })
      expect(request.jsonSchema.schema.properties.actions.items.properties.type.enum).toEqual([
        'setKeywords',
        'setFilterText',
        'setFilterYears',
        'setFilterTags',
        'clearFilters'
      ])
    })

    it('passes the conversation on, with earlier answers in the format the model writes', () => {
      const history = [
        { role: 'user', text: 'Set a keyword.' },
        {
          role: 'assistant',
          text: 'Done.',
          actions: [{ type: 'setKeywords', value: 'network', label: 'Keywords set' }]
        },
        { role: 'user', text: 'Thanks. And now?' }
      ]

      const { messages } = buildChatRequest(sessionData(), history, 64000)

      expect(messages.slice(1)).toEqual([
        { role: 'user', content: 'Set a keyword.' },
        {
          role: 'assistant',
          content:
            '{"answer":"Done.","papers":[],"actions":[{"type":"setKeywords","value":"network"}]}'
        },
        { role: 'user', content: 'Thanks. And now?' }
      ])
    })

    it('fits the session data to small context windows, keeping the selected papers', () => {
      const request = buildChatRequest(sessionData(), [{ role: 'user', text: 'Hi' }], 2200)
      const { selectedPapers, suggestedPapers, counts } = context(request)

      expect(selectedPapers).toHaveLength(1)
      expect(selectedPapers[0].abstract).toBeUndefined()
      expect(suggestedPapers.length).toBeGreaterThan(0)
      expect(suggestedPapers.length).toBeLessThan(30)
      expect(counts.suggestionsListed).toBe(suggestedPapers.length)
      expect(request.papers).toHaveLength(1 + suggestedPapers.length)
    })
  })

  describe('parseChatAnswer', () => {
    const listed = [publication('seed'), publication('s1'), publication('s2')]

    it('reads the answer, the papers it singles out, and the valid actions', () => {
      const text = JSON.stringify({
        answer: ' Two surveys are selected. ',
        papers: [
          { id: 3, reason: 'Surveys the field. More detail.' },
          { id: 1, reason: 'A classic survey' },
          { id: 3, reason: 'Duplicate' },
          { id: 9, reason: 'Not listed' }
        ],
        actions: [
          { type: 'setFilterTags', value: 'isSurvey' },
          { type: 'deleteEverything', value: '' },
          { type: 'setKeywords' }
        ]
      })

      expect(parseChatAnswer(text, listed)).toEqual({
        answer: 'Two surveys are selected.',
        papers: [
          { doi: 's2', explanation: 'Surveys the field.' },
          { doi: 'seed', explanation: 'A classic survey' }
        ],
        actions: [
          { type: 'setFilterTags', value: 'isSurvey' },
          { type: 'setKeywords', value: '' }
        ]
      })
    })

    it('takes plain text of models that ignore the format as the answer', () => {
      expect(parseChatAnswer('Your selection is about networks.', listed)).toEqual({
        answer: 'Your selection is about networks.',
        papers: [],
        actions: []
      })
      expect(() => parseChatAnswer('  ', listed)).toThrow('empty answer')
    })
  })

  it('reads the answer text while it is still being written', () => {
    expect(parsePartialChatAnswer('{"answer":"Two surv')).toBe('Two surv')
    expect(parsePartialChatAnswer('{"answer":"Done.","actions":[{"ty')).toBe('Done.')
    expect(parsePartialChatAnswer('Your selection')).toBe('Your selection')
    expect(parsePartialChatAnswer('{"ans')).toBe('')
  })
})
