import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAiChat } from '@/composables/useAiChat.js'
import { useLlmStore } from '@/stores/llm.js'
import { useSessionStore } from '@/stores/session.js'

const appState = vi.hoisted(() => ({ updateScores: vi.fn() }))

vi.mock('@/composables/useAppState.js', () => ({ useAppState: () => appState }))

const publication = (doi) => ({ doi, title: `Paper ${doi}`, year: 2021, score: 1 })

const answer = (text, ...actions) => ({
  text: JSON.stringify({
    answer: text,
    actions: actions.map(([type, value]) => ({ type, value }))
  })
})

describe('useAiChat', () => {
  let sessionStore
  let llmStore
  let chat

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    sessionStore = useSessionStore()
    llmStore = useLlmStore()
    llmStore.settings.mode = 'browser'
    llmStore.modelId = 'onnx-community/gemma-4-E2B-it-ONNX'
    vi.spyOn(llmStore, 'refreshModels').mockResolvedValue()
    vi.spyOn(llmStore, 'generate')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    appState.updateScores.mockReset()
    sessionStore.selectedPublications = [publication('seed')]
    sessionStore.suggestion = { totalSuggestions: 50, publications: [publication('a')] }
    chat = useAiChat()
  })

  it('answers questions on the session, showing the answer while it is written', async () => {
    const written = []
    llmStore.generate.mockImplementation(async (request, onStatus) => {
      onStatus({ phase: 'load' })
      onStatus({ phase: 'generate', text: '{"answer":"One paper is sel', reasoning: '' })
      written.push(sessionStore.aiChatMessages.at(-1).text)
      return answer('One paper is selected.')
    })

    await chat.sendChatMessage('How many papers are selected?')

    const [request] = llmStore.generate.mock.calls[0]
    expect(request.messages[0].content).toContain('"title":"Paper seed"')
    expect(request.messages.at(-1)).toEqual({
      role: 'user',
      content: 'How many papers are selected?'
    })
    expect(written).toEqual(['One paper is sel'])
    expect(sessionStore.aiChatMessages).toEqual([
      { role: 'user', text: 'How many papers are selected?' },
      { role: 'assistant', text: 'One paper is selected.', actions: [], isWriting: false }
    ])

    llmStore.generate.mockResolvedValue(answer('And one is suggested.'))
    await chat.sendChatMessage('And suggested?')

    // Follow-up questions build on the conversation
    expect(llmStore.generate.mock.calls[1][0].messages.slice(1).map(({ role }) => role)).toEqual([
      'user',
      'assistant',
      'user'
    ])
  })

  it('sets keywords and filters the model asks for and describes the changes', async () => {
    sessionStore.filter.isActive = false
    llmStore.generate.mockResolvedValue(
      answer(
        'I set keywords and filters.',
        ['setKeywords', 'visual|vis, network'],
        ['setFilterText', 'survey'],
        ['setFilterYears', '2015-'],
        ['setFilterTags', 'isSurvey, isNew, unknownTag']
      )
    )

    await chat.sendChatMessage('Focus on visualization surveys since 2015.')

    expect(sessionStore.boostKeywordString).toBe('VISUAL|VIS, NETWORK')
    expect(appState.updateScores).toHaveBeenCalled()
    expect(sessionStore.filter).toMatchObject({
      string: 'survey',
      yearStart: '2015',
      yearEnd: '',
      tags: ['isSurvey', 'isNew'],
      isActive: true
    })
    expect(sessionStore.aiChatMessages.at(-1).actions.map((action) => action.label)).toEqual([
      'Keywords set to VISUAL|VIS, NETWORK',
      'Filter set: text “survey”',
      'Filter set: years 2015–',
      'Filter set: literature survey or new'
    ])
  })

  it('understands single years and removals, and skips changes it cannot interpret', async () => {
    sessionStore.setBoostKeywordString('old')
    sessionStore.filter.string = 'old'
    llmStore.generate.mockResolvedValue(
      answer(
        'Done.',
        ['setFilterYears', '2020'],
        ['setFilterYears', 'recent ones'],
        ['setKeywords', ''],
        ['setFilterText', '']
      )
    )

    await chat.sendChatMessage('Only 2020, no keywords.')

    expect(sessionStore.filter).toMatchObject({ yearStart: '2020', yearEnd: '2020', string: '' })
    expect(sessionStore.boostKeywordString).toBe('')
    expect(sessionStore.aiChatMessages.at(-1).actions.map((action) => action.label)).toEqual([
      'Filter set: years 2020–2020',
      'Keywords removed',
      'Text filter removed'
    ])
  })

  it('undoes the changes of an answer', async () => {
    sessionStore.setBoostKeywordString('citation')
    sessionStore.filter.string = 'network'
    sessionStore.filter.tags = ['isNew']
    llmStore.generate.mockResolvedValue(
      answer('Cleared.', ['clearFilters', ''], ['setKeywords', 'survey'])
    )

    await chat.sendChatMessage('Start over with surveys.')
    expect(sessionStore.filter).toMatchObject({ string: '', tags: [] })
    expect(sessionStore.boostKeywordString).toBe('SURVEY')

    const message = sessionStore.aiChatMessages.at(-1)
    chat.undoActions(message)

    expect(sessionStore.filter).toMatchObject({ string: 'network', tags: ['isNew'] })
    expect(sessionStore.filter.matches).toBeTypeOf('function')
    expect(sessionStore.boostKeywordString).toBe('CITATION')
    expect(message.undo).toBeNull()
  })

  it('keeps the conversation usable when the answer is stopped or fails', async () => {
    llmStore.generate.mockImplementation(
      ({ signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('cancelled'), { code: 'aborted' }))
          )
        })
    )
    const sending = chat.sendChatMessage('A long question')
    await vi.waitFor(() => expect(llmStore.generate).toHaveBeenCalled())
    chat.stopAnswer()
    await sending
    expect(sessionStore.aiChatMessages.at(-1)).toMatchObject({ isStopped: true, isWriting: false })

    llmStore.generate.mockRejectedValue(new Error('Server unavailable.'))
    await chat.sendChatMessage('Again')
    expect(sessionStore.aiChatMessages.at(-1)).toMatchObject({
      error: 'Server unavailable.',
      isWriting: false
    })
  })

  it('is reset together with the session', async () => {
    llmStore.generate.mockResolvedValue(answer('Hello.'))
    await chat.sendChatMessage('Hi')

    sessionStore.clear()

    expect(sessionStore.aiChatMessages).toEqual([])
  })
})
