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

export function saveRecentSession(session) {
  const sessions = [
    { ...session, timestamp: Date.now() },
    ...loadRecentSessions().filter((stored) => stored.id !== session.id)
  ].slice(0, MAX_RECENT_SESSIONS)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch (error) {
    console.warn('Could not store recent session:', error)
  }
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
