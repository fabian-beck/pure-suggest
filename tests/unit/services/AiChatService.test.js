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
    sessionName: 'Citation tools',
    excludedCount: 3,
    authors: Array.from({ length: 14 }, (_, index) => ({
      name: `Author ${index + 1}`,
      count: 14 - index
    })),
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

    it('provides what is needed to cite, link, and characterize a paper', () => {
      const data = sessionData({
        selectedPublications: [
          publication('10.1145/1385569.1385584', {
            title: 'Timeline Trees',
            author: 'Burch, Michael; Beck, Fabian; Diehl, Stephan',
            container: 'Proceedings of AVI',
            year: 2008,
            volume: '12',
            issue: '3',
            page: '75-82',
            citationCount: 1,
            referenceCount: 2,
            citationDois: new Set(['a', 'b', 'c']),
            referenceDois: new Set(['d']),
            isRead: true,
            isAiRecommended: 'Introduces the technique.',
            concepts: ['C1 - TREE']
          })
        ]
      })
      data.filter.authors = ['beck, fabian']
      data.filter.applyToSuggested = false

      const request = buildChatRequest(data, [{ role: 'user', text: 'Cite it.' }], 64000)

      expect(context(request).selectedPapers[0]).toMatchObject({
        doi: '10.1145/1385569.1385584',
        authors: 'Burch, Michael; Beck, Fabian; Diehl, Stephan',
        venue: 'Proceedings of AVI',
        year: 2008,
        volume: '12',
        issue: '3',
        pages: '75-82',
        citesSelected: 1,
        citedBySelected: 2,
        citations: 3,
        references: 1,
        isRead: true,
        aiRecommended: 'Introduces the technique.',
        concepts: ['C1 - TREE']
      })
      // Absent details are left out instead of listed as empty
      expect(Object.keys(context(request).suggestedPapers[0])).not.toContain('volume')
      expect(Object.keys(context(request).suggestedPapers[0])).not.toContain('aiRecommended')
      expect(context(request)).toMatchObject({
        sessionName: 'Citation tools',
        filters: { authors: ['beck, fabian'], appliesTo: 'selected papers' },
        counts: { excluded: 3 }
      })
      expect(context(request).mainAuthors).toHaveLength(10)
      expect(context(request).mainAuthors[0]).toEqual({ name: 'Author 1', selectedPapers: 14 })
      expect(request.messages[0].content).toContain('https://doi.org/<doi>')
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

    it('reminds the model which papers its earlier answers marked, by their current ids', () => {
      const history = [
        { role: 'user', text: 'Which papers fit hierarchical time series?' },
        {
          role: 'assistant',
          text: 'Three papers fit closely.',
          papers: [
            { doi: 's2', title: 'Paper s2', explanation: 'A close match.' },
            { doi: 'seed', title: 'Paper seed', explanation: 'The starting point.' },
            { doi: 'gone', title: 'Paper gone', explanation: 'No longer suggested.' }
          ],
          actions: []
        },
        { role: 'user', text: 'Give me references for these.' }
      ]

      const request = buildChatRequest(sessionData(), history, 64000)

      // Ids follow the lists as they are now; a paper that left them is named by its title
      expect(JSON.parse(request.messages[2].content).papers).toEqual([
        { id: 3, reason: 'A close match.' },
        { id: 1, reason: 'The starting point.' },
        { title: 'Paper gone', reason: 'No longer suggested.' }
      ])
      expect(request.messages[0].content).toContain('papers of your earlier answers')
    })

    it('does not present undone changes as made', () => {
      const history = [
        { role: 'user', text: 'Only surveys.' },
        {
          role: 'assistant',
          text: 'Filtered.',
          papers: [{ doi: 's1', explanation: 'A survey.' }],
          actions: [{ type: 'setFilterTags', value: 'isSurvey', label: 'Filter set' }],
          isUndone: true
        },
        { role: 'user', text: 'What now?' }
      ]

      const { messages } = buildChatRequest(sessionData(), history, 64000)

      expect(JSON.parse(messages[2].content)).toEqual({
        answer: 'Filtered. (The user has undone the changes of this answer.)',
        papers: [],
        actions: []
      })
    })

    it('passes a well-formed conversation on, however long or bumpy it was', () => {
      const turn = (index, answer) => [
        { role: 'user', text: `Question ${index}` },
        { role: 'assistant', text: answer, papers: [], actions: [] }
      ]
      const history = [
        ...Array.from({ length: 8 }, (_, index) => turn(index + 1, `Answer ${index + 1}`)).flat(),
        // A question whose answer failed or was stopped before any text
        ...turn(9, ''),
        { role: 'user', text: 'Question 10' }
      ]

      const conversation = buildChatRequest(sessionData(), history, 64000).messages.slice(1)

      // Models require the roles to alternate, starting and ending with the user
      expect(conversation.map(({ role }) => role).join(' ')).toMatch(/^user( assistant user)+$/)
      expect(conversation.at(-1).content).toBe('Question 10')
      expect(conversation.at(-3).content).toBe('Question 8')
      expect(conversation[0].content).not.toBe('Question 1')
    })

    it('keeps line breaks of messages and shortens overlong ones', () => {
      const history = [
        { role: 'user', text: 'Compare:\n- Timeline Trees\n- TimeEdgeTrees' },
        { role: 'assistant', text: 'x'.repeat(5000), actions: [] },
        { role: 'user', text: 'Thanks' }
      ]

      const { messages } = buildChatRequest(sessionData(), history, 64000)

      expect(messages[1].content).toBe('Compare:\n- Timeline Trees\n- TimeEdgeTrees')
      expect(JSON.parse(messages[2].content).answer).toHaveLength(2000)
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
