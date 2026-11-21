import { watch } from 'vue'

// Recently used sessions, stored automatically in the browser's localStorage
const STORAGE_KEY = 'recentSessions'
const MAX_RECENT_SESSIONS = 3

export function loadRecentSessions() {
  try {
    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(sessions) ? sessions : []
  } catch {
    return []
  }
}

function storeRecentSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch (error) {
    console.warn('Could not store recent sessions:', error)
  }
  return sessions
}

export function saveRecentSession(session) {
  // A session loaded again from a link or file gets a new id, but should not be listed twice
  // (the order of its publications differs until they are ranked)
  const getContent = ({ name, selected, excluded, boost }) =>
    JSON.stringify([name, [...selected].sort(), [...excluded].sort(), boost])
  storeRecentSessions(
    [
      { ...session, timestamp: Date.now() },
      ...loadRecentSessions().filter(
        (stored) => stored.id !== session.id && getContent(stored) !== getContent(session)
      )
    ].slice(0, MAX_RECENT_SESSIONS)
  )
}

export function removeRecentSession(id) {
  return storeRecentSessions(loadRecentSessions().filter((stored) => stored.id !== id))
}

export function trackRecentSession(sessionStore) {
  watch(
    () => ({ ...sessionStore.sessionData, title: sessionStore.selectedPublications[0]?.title }),
    (session) => {
      if (!session.selected.length) return
      sessionStore.sessionId ||= crypto.randomUUID()
      saveRecentSession({ id: sessionStore.sessionId, ...session })
    }
  )
}
