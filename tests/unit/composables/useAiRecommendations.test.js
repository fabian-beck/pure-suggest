import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAiRecommendations } from '@/composables/useAiRecommendations.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useLlmStore } from '@/stores/llm.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'

const appState = vi.hoisted(() => ({
  addPublicationsAndUpdate: vi.fn(),
  updateSuggestions: vi.fn()
}))

vi.mock('@/composables/useAppState.js', () => ({ useAppState: () => appState }))

const publication = (doi) => ({
  doi,
  title: `Paper ${doi}`,
  authorShort: 'Doe et al.',
  year: 2024,
  referenceDois: new Set(),
  citationDois: new Set()
})

// Answer of the model recommending the suggestions with the given ids
const answer = (ids, loadMoreSuggestions = false) => ({
  text: JSON.stringify({
    reasoning: `Looking for ${ids.length} fitting papers.`,
    recommendations: ids.map((id) => ({ id, explanation: `Reason ${id}.` })),
    loadMoreSuggestions,
    report: `Report after ${ids.length} picks.`
  })
})

describe('useAiRecommendations', () => {
  let sessionStore
  let llmStore
  let interfaceStore
  let modalStore
  let requestAiRecommendations

  const contexts = () =>
    llmStore.generate.mock.calls.map(([request]) => JSON.parse(request.messages[1].content))
  const expectedCounts = () => contexts().map((context) => context.selectionTarget.split('.')[0])

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    sessionStore = useSessionStore()
    llmStore = useLlmStore()
    interfaceStore = useInterfaceStore()
    modalStore = useModalStore()
    llmStore.settings.mode = 'browser'
    llmStore.modelId = 'onnx-community/gemma-4-E2B-it-ONNX'
    vi.spyOn(llmStore, 'refreshModels').mockResolvedValue()
    vi.spyOn(llmStore, 'generate')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    sessionStore.selectedPublications = [publication('seed')]
    sessionStore.maxSuggestions = 8
    sessionStore.suggestion = {
      totalSuggestions: 300,
      publications: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(publication)
    }
    // Stands in for adding to the selection and recomputing suggestions: the added
    // publications leave the suggestions, and a new one shows up
    let round = 0
    appState.addPublicationsAndUpdate.mockReset()
    appState.addPublicationsAndUpdate.mockImplementation(async (dois) => {
      round++
      sessionStore.selectedPublications.push(...dois.map(publication))
      sessionStore.suggestion.publications = [
        publication(`new-${round}`),
        ...sessionStore.suggestion.publications.filter((suggested) => !dois.includes(suggested.doi))
      ]
    })
    // Stands in for loading more suggestions: two further ones show up at the end
    appState.updateSuggestions.mockReset()
    appState.updateSuggestions.mockImplementation(async (maxSuggestions) => {
      sessionStore.maxSuggestions = maxSuggestions
      sessionStore.suggestion.publications = [
        ...sessionStore.suggestion.publications,
        publication(`more-${maxSuggestions}-1`),
        publication(`more-${maxSuggestions}-2`)
      ]
    })
    ;({ requestAiRecommendations } = useAiRecommendations())
  })

  describe('tagging recommendations', () => {
    it('tags the recommended suggestions within the expected range and reports on the run', async () => {
      sessionStore.aiRecommendationRange = [2, 4]
      sessionStore.aiRecommendationComment = 'Prefer surveys'
      llmStore.generate.mockResolvedValue(answer([2, 3]))

      await requestAiRecommendations()

      const [request] = llmStore.generate.mock.calls[0]
      expect(contexts()[0]).toMatchObject({
        selectionTarget: expect.stringContaining('Recommend 2 to 4 papers.'),
        userSteeringComment: 'Prefer surveys',
        suggestionsTotal: 300,
        canLoadMoreSuggestions: true
      })
      expect(request.signal).toBeInstanceOf(AbortSignal)
      expect(sessionStore.suggestion.publications.map((suggested) => suggested.isAiRecommended)).toEqual([
        false, 'Reason 2.', 'Reason 3.', false, false, false, false, false
      ])
      expect(sessionStore.filter.tags).toContain('isAiRecommended')
      expect(appState.addPublicationsAndUpdate).not.toHaveBeenCalled()
      expect(appState.updateSuggestions).not.toHaveBeenCalled()
      expect(interfaceStore.isLoading).toBe(false)

      expect(modalStore.isAiReportModalDialogShown).toBe(true)
      expect(modalStore.aiReport).toMatchObject({
        isAutoSelect: false,
        text: 'Report after 2 picks.',
        steps: 1,
        loadCount: 0,
        suggestionCount: 8,
        publications: [
          { doi: 'b', title: 'Paper b', authorShort: 'Doe et al.', year: 2024, explanation: 'Reason 2.' },
          { doi: 'c', explanation: 'Reason 3.' }
        ]
      })
    })

    it('lets the user follow the reasoning and choices of the model while it answers', async () => {
      const written = answer([2, 3]).text
      const snapshots = []
      llmStore.generate.mockImplementation(async (request, onStatus) => {
        onStatus({ phase: 'load' })
        for (const length of [40, written.indexOf('},{') + 1, written.length]) {
          onStatus({ phase: 'generate', text: written.slice(0, length), reasoning: 'Thinking…' })
          snapshots.push(JSON.parse(JSON.stringify(interfaceStore.aiRun.log)))
        }
        return { text: written }
      })

      await requestAiRecommendations()

      expect(snapshots[0]).toEqual([
        {
          considered: 'Reading 8 suggestions and 1 selected publication',
          thinking: 'Thinking…',
          reasoning: 'Looking for 2 fitting pape',
          picks: [],
          action: ''
        }
      ])
      expect(snapshots[1][0].picks).toEqual([
        { doi: 'b', title: 'Paper b', authorShort: 'Doe et al.', year: 2024, explanation: 'Reason 2.' }
      ])
      expect(snapshots[2][0].picks).toHaveLength(2)
      // The run is only shown as in progress while it lasts; its log goes into the report
      expect(interfaceStore.aiRun).toBeNull()
      expect(modalStore.aiReport.log).toEqual([
        expect.objectContaining({
          reasoning: 'Looking for 2 fitting papers.',
          action: 'Tagging 2 suggestions as recommended'
        })
      ])
    })

    it('limits the range to the available suggestions and the answer to its maximum', async () => {
      sessionStore.aiRecommendationRange = [10, 30]
      llmStore.generate.mockResolvedValue(answer([1, 2, 3, 4, 5, 6, 7, 8, 8, 1]))

      await requestAiRecommendations()

      expect(expectedCounts()).toEqual(['Recommend 8 papers'])

      sessionStore.aiRecommendationRange = [1, 2]
      await requestAiRecommendations()

      expect(
        sessionStore.suggestion.publications.filter((suggested) => suggested.isAiRecommended)
      ).toHaveLength(2)
    })

    it('loads more suggestions when the model asks for them and asks again', async () => {
      sessionStore.aiRecommendationRange = [2, 4]
      llmStore.generate
        .mockResolvedValueOnce(answer([1], true))
        .mockResolvedValueOnce(answer([1, 10]))

      await requestAiRecommendations()

      expect(appState.updateSuggestions).toHaveBeenCalledExactlyOnceWith(108, true)
      expect(contexts()[1].suggestedPapers).toHaveLength(10)
      expect(
        sessionStore.suggestion.publications
          .filter((suggested) => suggested.isAiRecommended)
          .map((suggested) => suggested.doi)
      ).toEqual(['a', 'more-108-2'])
      expect(modalStore.aiReport).toMatchObject({ steps: 2, loadCount: 1, suggestionCount: 10 })
      expect(modalStore.aiReport.log.map((entry) => entry.action)).toEqual([
        'Too few suggestions fit: loading more (up to 108) and asking again',
        'Tagging 2 suggestions as recommended'
      ])
    })

    it('does not load more suggestions if the user disallows it or none are left', async () => {
      llmStore.generate.mockResolvedValue(answer([1], true))

      sessionStore.isAiLoadMoreAllowed = false
      await requestAiRecommendations()
      sessionStore.isAiLoadMoreAllowed = true
      sessionStore.suggestion.totalSuggestions = 8
      await requestAiRecommendations()

      expect(contexts().map((context) => context.canLoadMoreSuggestions)).toEqual([false, false])
      expect(appState.updateSuggestions).not.toHaveBeenCalled()
    })

    it('stops loading more suggestions after a few rounds', async () => {
      llmStore.generate.mockResolvedValue(answer([1], true))

      await requestAiRecommendations()

      expect(appState.updateSuggestions).toHaveBeenCalledTimes(2)
      expect(contexts().map((context) => context.canLoadMoreSuggestions)).toEqual([true, true, false])
    })

    it('can be cancelled without report or error message', async () => {
      llmStore.generate.mockImplementation(
        ({ signal }) =>
          new Promise((resolve, reject) => {
            signal.addEventListener('abort', () =>
              reject(Object.assign(new Error('cancelled'), { code: 'aborted' }))
            )
          })
      )

      const running = requestAiRecommendations()
      await vi.waitFor(() => expect(llmStore.generate).toHaveBeenCalled())
      expect(interfaceStore.isLoadingCancelable).toBe(true)
      interfaceStore.cancelLoading()
      await running

      expect(interfaceStore.isLoading).toBe(false)
      expect(interfaceStore.errorToast.isShown).toBeFalsy()
      expect(modalStore.isAiReportModalDialogShown).toBe(false)
    })

    it('shows a failure of the first request as error message', async () => {
      llmStore.generate.mockResolvedValue({ text: 'I cannot answer that.' })

      await requestAiRecommendations()

      expect(interfaceStore.errorToast.message).toContain('valid JSON')
      expect(modalStore.isAiReportModalDialogShown).toBe(false)
    })
  })

  describe('auto-select', () => {
    beforeEach(() => {
      sessionStore.isAiAutoSelect = true
      sessionStore.aiRecommendationRange = [3, 5]
    })

    it('selects in steps on refined suggestions until the expected maximum is reached', async () => {
      llmStore.generate
        .mockResolvedValueOnce(answer([1, 2]))
        .mockResolvedValueOnce(answer([1, 4]))
        .mockResolvedValueOnce(answer([2, 3]))

      await requestAiRecommendations()

      // Later steps pick among the recomputed suggestions, including ones that appeared anew
      expect(appState.addPublicationsAndUpdate.mock.calls).toEqual([
        [['a', 'b'], true],
        [['new-1', 'e'], true],
        [['c'], true]
      ])
      // At least one paper is expected while below the minimum; the last step only fills up
      expect(expectedCounts()).toEqual([
        'Recommend 1 to 2 papers',
        'Recommend 1 to 2 papers',
        'Recommend 0 to 1 paper'
      ])
      const [, secondContext] = contexts()
      expect(secondContext.suggestedPapers[0].title).toBe('Paper new-1')
      // The model learns which seeds it added itself, to report on the whole run
      expect(secondContext.selectedSeedPapers.map((seed) => seed.addedInThisRun)).toEqual([
        undefined,
        true,
        true
      ])

      const selected = sessionStore.selectedPublications
      expect(selected.map((selectedPublication) => selectedPublication.doi)).toEqual([
        'seed', 'a', 'b', 'new-1', 'e', 'c'
      ])
      expect(selected[1].isAiRecommended).toBe('Reason 1.')
      expect(selected[0].isAiRecommended).toBeFalsy()
      expect(selected.filter((selectedPublication) => selectedPublication.isNewlyAdded)).toHaveLength(5)
      expect(sessionStore.filter.tags).toContain('isAiRecommended')
      expect(sessionStore.filter.applyToSelected).toBe(true)
      expect(interfaceStore.isLoading).toBe(false)

      expect(modalStore.isAiReportModalDialogShown).toBe(true)
      expect(modalStore.aiReport).toMatchObject({
        isAutoSelect: true,
        text: 'Report after 2 picks.',
        steps: 3,
        loadCount: 0,
        failure: ''
      })
      expect(modalStore.aiReport.publications.map(({ doi }) => doi)).toEqual([
        'a', 'b', 'new-1', 'e', 'c'
      ])
    })

    it('stops as soon as the model finds nothing fitting anymore', async () => {
      llmStore.generate.mockResolvedValueOnce(answer([3])).mockResolvedValueOnce(answer([]))

      await requestAiRecommendations()

      expect(llmStore.generate).toHaveBeenCalledTimes(2)
      expect(appState.addPublicationsAndUpdate).toHaveBeenCalledTimes(1)
      expect(modalStore.aiReport).toMatchObject({ steps: 2, text: 'Report after 0 picks.' })
      expect(modalStore.aiReport.publications).toHaveLength(1)
    })

    it('loads more suggestions on request, together with a step or on its own', async () => {
      llmStore.generate
        .mockResolvedValueOnce(answer([1], true))
        .mockResolvedValueOnce(answer([], true))
        .mockResolvedValueOnce(answer([]))

      await requestAiRecommendations()

      // Selecting recomputes the suggestions anyway, with the raised number
      expect(appState.addPublicationsAndUpdate).toHaveBeenCalledExactlyOnceWith(['a'], true)
      expect(appState.updateSuggestions).toHaveBeenCalledExactlyOnceWith(208, true)
      expect(sessionStore.maxSuggestions).toBe(208)
      expect(contexts().map((context) => context.canLoadMoreSuggestions)).toEqual([true, true, false])
      expect(modalStore.aiReport).toMatchObject({ steps: 3, loadCount: 2 })
      expect(modalStore.aiReport.log.map((entry) => entry.action)).toEqual([
        'Adding 1 publication to the selection and loading more suggestions (up to 108), then recomputing the suggestions',
        'Loading more suggestions (up to 208), then recomputing the suggestions',
        'Nothing else fits clearly: finishing'
      ])
    })

    it('reports when nothing was recommended', async () => {
      llmStore.generate.mockResolvedValue(answer([]))

      await requestAiRecommendations()

      expect(appState.addPublicationsAndUpdate).not.toHaveBeenCalled()
      expect(modalStore.isAiReportModalDialogShown).toBe(true)
      expect(modalStore.aiReport.publications).toEqual([])
    })

    it('keeps and reports what was selected when a later step fails or is cancelled', async () => {
      llmStore.generate
        .mockResolvedValueOnce(answer([1, 2]))
        .mockRejectedValueOnce(new Error('Server unavailable.'))

      await requestAiRecommendations()

      expect(sessionStore.selectedPublications).toHaveLength(3)
      expect(modalStore.aiReport).toMatchObject({
        failure: 'Server unavailable.',
        text: 'Report after 2 picks.'
      })
      expect(modalStore.aiReport.publications).toHaveLength(2)
      expect(interfaceStore.errorToast.isShown).toBeFalsy()

      // Cancelling while the suggestions are recomputed ends the selection after that step
      llmStore.generate.mockReset()
      llmStore.generate.mockResolvedValue(answer([1]))
      appState.addPublicationsAndUpdate.mockImplementationOnce(async () => {
        interfaceStore.setLoadingCancelable(true)
        interfaceStore.cancelLoading()
      })

      await requestAiRecommendations()

      expect(llmStore.generate).toHaveBeenCalledTimes(1)
      expect(modalStore.aiReport).toMatchObject({ isCancelled: true, steps: 1 })
      expect(interfaceStore.isLoading).toBe(false)
    })
  })
})
