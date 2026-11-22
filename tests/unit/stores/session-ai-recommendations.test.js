import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useSessionStore } from '@/stores/session.js'

describe('session store: AI recommendations', () => {
  let sessionStore

  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStore = useSessionStore()
    sessionStore.selectedPublications = [{ doi: '10.1/seed' }, { doi: '10.1/added' }]
    sessionStore.suggestion = { publications: [{ doi: '10.1/suggested' }] }
  })

  it('tags auto-selected publications and filters the selection for them', () => {
    sessionStore.tagAiSelectedPublications([{ doi: '10.1/added', explanation: 'It is a survey.' }])

    expect(
      sessionStore.selectedPublications.map((publication) => publication.isAiRecommended)
    ).toEqual([undefined, 'It is a survey.'])
    expect(sessionStore.filter.tags).toEqual(['isAiRecommended'])
    expect(sessionStore.filter.applyToSelected).toBe(true)
  })

  it('keeps the tag filter on recomputed suggestions while selected publications carry the tag', () => {
    sessionStore.applyAiRecommendations([{ doi: '10.1/suggested', explanation: 'Fits.' }])
    sessionStore.clearAiRecommendations()
    expect(sessionStore.filter.tags).toEqual([])

    sessionStore.tagAiSelectedPublications([{ doi: '10.1/added', explanation: 'Fits.' }])
    sessionStore.applyAiRecommendations([{ doi: '10.1/suggested', explanation: 'Fits.' }])
    sessionStore.clearAiRecommendations()

    expect(sessionStore.suggestion.publications[0].isAiRecommended).toBe(false)
    expect(sessionStore.selectedPublications[1].isAiRecommended).toBe('Fits.')
    expect(sessionStore.filter.tags).toEqual(['isAiRecommended'])
  })

  it('resets the recommendation settings with the session', () => {
    sessionStore.aiRecommendationRange = [1, 40]
    sessionStore.isAiAutoSelect = true
    sessionStore.isAiLoadMoreAllowed = false

    sessionStore.clear()

    expect(sessionStore.aiRecommendationRange).toEqual([5, 15])
    expect(sessionStore.isAiAutoSelect).toBe(false)
    expect(sessionStore.isAiLoadMoreAllowed).toBe(true)
  })
})
