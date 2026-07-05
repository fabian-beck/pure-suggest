import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionStore } from '@/stores/session.js'

vi.mock('idb-keyval', () => ({
  keys: vi.fn(() => Promise.resolve([])),
  get: vi.fn(() => Promise.resolve(null)),
  getMany: vi.fn((requestedKeys) => Promise.resolve(requestedKeys.map(() => undefined))),
  set: vi.fn(() => Promise.resolve()),
  setMany: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve())
}))

function createPublication(doi, overrides = {}) {
  return {
    doi,
    isActive: false,
    isLinkedToActive: false,
    isSelected: false,
    isRead: false,
    citationDois: new Set(),
    referenceDois: new Set(),
    ...overrides
  }
}

function createPublications(prefix, count, overrides = {}) {
  return Array.from({ length: count }, (_, index) =>
    createPublication(`${prefix}-${index}`, overrides)
  )
}

describe('Session Store Activation Performance', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('activates publications with dense citation neighborhoods quickly', () => {
    const sessionStore = useSessionStore()
    const selectedPublications = createPublications('selected', 2_000, { isSelected: true })
    const suggestedPublications = createPublications('suggested', 2_000)
    const allDois = [...selectedPublications, ...suggestedPublications].map(
      (publication) => publication.doi
    )
    const activePublication = selectedPublications[0]

    activePublication.citationDois = new Set(allDois)
    activePublication.referenceDois = new Set([...allDois].reverse())

    sessionStore.selectedPublications = selectedPublications
    sessionStore.suggestion = {
      publications: suggestedPublications,
      totalSuggestions: suggestedPublications.length
    }

    const start = performance.now()
    sessionStore.setActivePublication(activePublication.doi)
    const activationTime = performance.now() - start

    expect(activePublication.isActive).toBe(true)
    expect(selectedPublications[1].isLinkedToActive).toBe(true)
    expect(suggestedPublications.at(-1).isLinkedToActive).toBe(true)
    expect(activationTime).toBeLessThan(150)
  })
})
