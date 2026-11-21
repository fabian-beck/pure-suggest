import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAiRecommendations } from '@/composables/useAiRecommendations.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useLlmStore } from '@/stores/llm.js'
import { useSessionStore } from '@/stores/session.js'

const appState = vi.hoisted(() => ({ addPublicationsAndUpdate: vi.fn() }))

vi.mock('@/composables/useAppState.js', () => ({ useAppState: () => appState }))

const publication = (doi) => ({ doi, title: `Paper ${doi}`, referenceDois: new Set(), citationDois: new Set() })

const answer = (...ids) => ({
  text: JSON.stringify({
    recommendations: ids.map((id) => ({ id, explanation: `Reason ${id}.` }))
  })
})

describe('useAiRecommendations', () => {
  let sessionStore
  let llmStore
  let interfaceStore
  let requestAiRecommendations

  const expectedCounts = () =>
    llmStore.generate.mock.calls.map(
      ([request]) => JSON.parse(request.messages[1].content).selectionTarget.split('.')[0]
    )

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    sessionStore = useSessionStore()
    llmStore = useLlmStore()
    interfaceStore = useInterfaceStore()
    llmStore.settings.mode = 'browser'
    llmStore.modelId = 'onnx-community/gemma-4-E2B-it-ONNX'
    vi.spyOn(llmStore, 'refreshModels').mockResolvedValue()
    vi.spyOn(llmStore, 'generate')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    sessionStore.selectedPublications = [publication('seed')]
    sessionStore.suggestion = {
      totalSuggestions: 8,
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
    ;({ requestAiRecommendations } = useAiRecommendations())
  })

  describe('tagging recommendations', () => {
    it('asks for the expected range of papers and tags the recommended suggestions', async () => {
      sessionStore.aiRecommendationRange = [2, 4]
      sessionStore.aiRecommendationComment = 'Prefer surveys'
      llmStore.generate.mockResolvedValue(answer(2, 3))

      await requestAiRecommendations()

      const [request] = llmStore.generate.mock.calls[0]
      expect(JSON.parse(request.messages[1].content)).toMatchObject({
        selectionTarget: expect.stringContaining('Recommend 2 to 4 papers.'),
        userSteeringComment: 'Prefer surveys'
      })
      expect(request.signal).toBeInstanceOf(AbortSignal)
      expect(sessionStore.suggestion.publications.map((suggested) => suggested.isAiRecommended)).toEqual([
        false, 'Reason 2.', 'Reason 3.', false, false, false, false, false
      ])
      expect(sessionStore.filter.tags).toContain('isAiRecommended')
      expect(appState.addPublicationsAndUpdate).not.toHaveBeenCalled()
      expect(interfaceStore.isLoading).toBe(false)
    })

    it('limits the range to the available suggestions and the answer to its maximum', async () => {
      sessionStore.aiRecommendationRange = [10, 30]
      llmStore.generate.mockResolvedValue(answer(1, 2, 3, 4, 5, 6, 7, 8, 8, 1))

      await requestAiRecommendations()

      expect(expectedCounts()).toEqual(['Recommend 8 papers'])

      sessionStore.aiRecommendationRange = [1, 2]
      await requestAiRecommendations()

      expect(
        sessionStore.suggestion.publications.filter((suggested) => suggested.isAiRecommended)
      ).toHaveLength(2)
    })

    it('can be cancelled without an error message', async () => {
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
    })

    it('shows failures of the model as error message', async () => {
      llmStore.generate.mockResolvedValue({ text: 'I cannot answer that.' })

      await requestAiRecommendations()

      expect(interfaceStore.errorToast.message).toContain('valid JSON')
    })
  })

  describe('auto-select', () => {
    beforeEach(() => {
      sessionStore.isAiAutoSelect = true
      sessionStore.aiRecommendationRange = [3, 5]
    })

    it('selects in steps on refined suggestions until the expected maximum is reached', async () => {
      llmStore.generate
        .mockResolvedValueOnce(answer(1, 2))
        .mockResolvedValueOnce(answer(1, 4))
        .mockResolvedValueOnce(answer(2, 3))

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
      const [, secondRequest] = llmStore.generate.mock.calls.map(([request]) => request)
      const secondContext = JSON.parse(secondRequest.messages[1].content)
      expect(secondContext.selectedSeedPapers).toHaveLength(3)
      expect(secondContext.suggestedPapers[0].title).toBe('Paper new-1')

      const selected = sessionStore.selectedPublications
      expect(selected.map((selectedPublication) => selectedPublication.doi)).toEqual([
        'seed', 'a', 'b', 'new-1', 'e', 'c'
      ])
      expect(selected[1].isAiRecommended).toBe('Reason 1.')
      expect(selected[0].isAiRecommended).toBeFalsy()
      expect(selected.filter((selectedPublication) => selectedPublication.isNewlyAdded)).toHaveLength(5)
      expect(sessionStore.filter.tags).toContain('isAiRecommended')
      expect(sessionStore.filter.applyToSelected).toBe(true)
      expect(interfaceStore.errorToast).toMatchObject({
        message: 'AI selected 5 publications.',
        type: 'info'
      })
      expect(interfaceStore.isLoading).toBe(false)
    })

    it('stops as soon as the model finds nothing fitting anymore', async () => {
      llmStore.generate.mockResolvedValueOnce(answer(3)).mockResolvedValueOnce(answer())

      await requestAiRecommendations()

      expect(llmStore.generate).toHaveBeenCalledTimes(2)
      expect(appState.addPublicationsAndUpdate).toHaveBeenCalledTimes(1)
      expect(interfaceStore.errorToast.message).toBe('AI selected 1 publication.')
    })

    it('reports when nothing was recommended', async () => {
      llmStore.generate.mockResolvedValue(answer())

      await requestAiRecommendations()

      expect(appState.addPublicationsAndUpdate).not.toHaveBeenCalled()
      expect(interfaceStore.errorToast.message).toBe(
        'The AI model recommended none of the suggestions.'
      )
    })

    it('keeps what was selected when a later step fails or is cancelled', async () => {
      llmStore.generate
        .mockResolvedValueOnce(answer(1, 2))
        .mockRejectedValueOnce(new Error('Server unavailable.'))

      await requestAiRecommendations()

      expect(sessionStore.selectedPublications).toHaveLength(3)
      expect(interfaceStore.errorToast.message).toBe(
        'Server unavailable. AI selected 2 publications.'
      )

      // Cancelling while the suggestions are recomputed ends the selection after that step
      llmStore.generate.mockReset()
      llmStore.generate.mockResolvedValue(answer(1))
      appState.addPublicationsAndUpdate.mockImplementationOnce(async () => {
        interfaceStore.setLoadingCancelable(true)
        interfaceStore.cancelLoading()
      })

      await requestAiRecommendations()

      expect(llmStore.generate).toHaveBeenCalledTimes(1)
      expect(interfaceStore.isLoading).toBe(false)
    })
  })
})
