import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import Publication from '@/core/Publication.js'
import {
  loadRecentSessions,
  removeRecentSession,
  saveRecentSession,
  trackRecentSession
} from '@/lib/RecentSessions.js'
import { useSessionStore } from '@/stores/session.js'

const session = (id, selected = ['10.1/a']) => ({
  id,
  name: '',
  title: `Title ${id}`,
  selected,
  excluded: [],
  boost: ''
})

describe('RecentSessions', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns an empty list when nothing is stored or storage is corrupt', () => {
    expect(loadRecentSessions()).toEqual([])
    localStorage.setItem('recentSessions', '{not json')
    expect(loadRecentSessions()).toEqual([])
  })

  it('stores sessions most recent first with a timestamp', () => {
    saveRecentSession(session('a'))
    saveRecentSession(session('b'))
    const sessions = loadRecentSessions()
    expect(sessions.map((s) => s.id)).toEqual(['b', 'a'])
    expect(sessions[0].timestamp).toBeTypeOf('number')
  })

  it('updates an existing session in place and moves it to the top', () => {
    saveRecentSession(session('a'))
    saveRecentSession(session('b'))
    saveRecentSession(session('a', ['10.1/a', '10.1/b']))
    const sessions = loadRecentSessions()
    expect(sessions.map((s) => s.id)).toEqual(['a', 'b'])
    expect(sessions[0].selected).toEqual(['10.1/a', '10.1/b'])
  })

  it('keeps only the most recent sessions', () => {
    ;['a', 'b', 'c', 'd'].forEach((id) => saveRecentSession(session(id)))
    expect(loadRecentSessions().map((s) => s.id)).toEqual(['d', 'c', 'b'])
  })

  it('removes a session and returns the remaining ones', () => {
    saveRecentSession(session('a'))
    saveRecentSession(session('b'))
    expect(removeRecentSession('b').map((s) => s.id)).toEqual(['a'])
    expect(loadRecentSessions().map((s) => s.id)).toEqual(['a'])
  })
})

describe('trackRecentSession', () => {
  let sessionStore

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    sessionStore = useSessionStore()
    trackRecentSession(sessionStore)
  })

  const select = (doi, title) => {
    const publication = new Publication(doi)
    publication.title = title
    sessionStore.selectedPublications.push(publication)
  }

  it('stores the current session whenever it changes, but not an empty one', async () => {
    sessionStore.sessionName = 'Named'
    await nextTick()
    expect(loadRecentSessions()).toEqual([])

    select('10.1/a', 'First paper')
    await nextTick()
    sessionStore.excludedPublicationsDois = ['10.1/x']
    await nextTick()

    const sessions = loadRecentSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      id: sessionStore.sessionId,
      name: 'Named',
      title: 'First paper',
      selected: ['10.1/a'],
      excluded: ['10.1/x']
    })
  })

  it('updates the title once publication metadata has loaded', async () => {
    select('10.1/a', '')
    await nextTick()
    sessionStore.selectedPublications[0].title = 'Loaded title'
    await nextTick()
    expect(loadRecentSessions()[0].title).toBe('Loaded title')
  })

  it('stores a new entry after the session was cleared', async () => {
    select('10.1/a', 'First')
    await nextTick()
    sessionStore.clear()
    select('10.1/b', 'Second')
    await nextTick()
    expect(loadRecentSessions().map((s) => s.title)).toEqual(['Second', 'First'])
  })
})
