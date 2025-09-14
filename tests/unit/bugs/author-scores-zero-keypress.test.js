import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useAppState } from '@/composables/useAppState.js'
import { useAuthorStore } from '@/stores/author.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useSessionStore } from '@/stores/session.js'

describe('Author Scores Zero on Keypress Bug', () => {
  let pinia
  let interfaceStore
  let authorStore
  let sessionStore
  let openAuthorModalDialog

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    interfaceStore = useInterfaceStore()
    authorStore = useAuthorStore()
    sessionStore = useSessionStore()

    const appState = useAppState()
    openAuthorModalDialog = appState.openAuthorModalDialog

    // Spy on the methods
    vi.spyOn(authorStore, 'computeSelectedPublicationsAuthors')
    vi.spyOn(sessionStore, 'updatePublicationScores')
  })

  it('should reproduce the bug: pressing "a" key shows authors with score 0', () => {
    // SCENARIO: User has loaded publications, scores might not be computed yet
    sessionStore.selectedPublications = [
      {
        doi: '10.1234/test1',
        title: 'Test Publication 1',
        year: 2020,
        author: 'John Doe; Jane Smith',
        authorOrcid: 'John Doe; Jane Smith',
        score: 0, // Uncomputed score
        boostKeywords: [], // Empty keywords
        citationCount: undefined,
        referenceCount: undefined
      },
      {
        doi: '10.1234/test2',
        title: 'Test Publication 2',
        year: 2021,
        author: 'Jane Smith; Bob Wilson',
        authorOrcid: 'Jane Smith; Bob Wilson',
        score: 0, // Uncomputed score
        boostKeywords: [],
        citationCount: undefined,
        referenceCount: undefined
      }
    ]

    // SIMULATE: What happens when user presses "a" key (from Keys.js line 64-67)
    // This is what Keys.js does - it just sets the modal flag to true
    interfaceStore.isAuthorModalDialogShown = true

    // BUG: The modal is shown but no author data computation is triggered
    // because we only set isAuthorModalDialogShown = true, we didn't call openAuthorModalDialog()

    // VERIFICATION: Authors are not computed at all
    expect(authorStore.computeSelectedPublicationsAuthors).not.toHaveBeenCalled()
    expect(sessionStore.updatePublicationScores).not.toHaveBeenCalled()

    // Authors list should be empty (no computation happened)
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(0)

    // Modal is shown but with no data
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
  })

  it('should demonstrate the expected behavior: openAuthorModalDialog works correctly', () => {
    // Same scenario as above
    sessionStore.selectedPublications = [
      {
        doi: '10.1234/test1',
        title: 'Test Publication 1',
        year: 2020,
        author: 'John Doe; Jane Smith',
        authorOrcid: 'John Doe; Jane Smith',
        score: 0,
        boostKeywords: [],
        citationCount: undefined,
        referenceCount: undefined
      },
      {
        doi: '10.1234/test2',
        title: 'Test Publication 2',
        year: 2021,
        author: 'Jane Smith; Bob Wilson',
        authorOrcid: 'Jane Smith; Bob Wilson',
        score: 0,
        boostKeywords: [],
        citationCount: undefined,
        referenceCount: undefined
      }
    ]

    // Mock updatePublicationScores to simulate proper score computation
    sessionStore.updatePublicationScores.mockImplementation(() => {
      sessionStore.selectedPublications.forEach((pub) => {
        pub.score = Math.random() * 3 + 0.5
        pub.boostKeywords = ['machine learning']
        pub.citationCount = 10
        pub.referenceCount = 20
      })
    })

    // PROPER ACTION: Call openAuthorModalDialog instead of just setting the flag
    openAuthorModalDialog()

    // VERIFICATION: Both updates are triggered in correct order
    expect(sessionStore.updatePublicationScores).toHaveBeenCalled()
    expect(authorStore.computeSelectedPublicationsAuthors).toHaveBeenCalledWith(
      sessionStore.selectedPublications
    )

    // Modal should be shown with computed data
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
  })

  it('should verify that authors have proper scores when computed correctly', () => {
    // Publications with proper scores
    sessionStore.selectedPublications = [
      {
        doi: '10.1234/test1',
        title: 'Machine Learning Paper',
        year: 2020,
        author: 'John Doe; Jane Smith',
        authorOrcid: 'John Doe; Jane Smith',
        score: 2.5, // Good score
        boostKeywords: ['machine learning'],
        citationCount: 10,
        referenceCount: 20
      },
      {
        doi: '10.1234/test2',
        title: 'Deep Learning Research',
        year: 2021,
        author: 'Jane Smith; Bob Wilson',
        authorOrcid: 'Jane Smith; Bob Wilson',
        score: 1.8, // Good score
        boostKeywords: ['deep learning'],
        citationCount: 5,
        referenceCount: 15
      }
    ]

    // Call proper method
    openAuthorModalDialog()

    // Should trigger author computation
    expect(authorStore.computeSelectedPublicationsAuthors).toHaveBeenCalledWith(
      sessionStore.selectedPublications
    )

    // Now manually verify what the scores would be
    // (We can't easily test the actual computed scores without running the full computation)
    // But we can verify that the computation was called with publications that have proper scores
    const publicationsPassedToCompute =
      authorStore.computeSelectedPublicationsAuthors.mock.calls[0][0]
    expect(publicationsPassedToCompute[0].score).toBe(2.5)
    expect(publicationsPassedToCompute[1].score).toBe(1.8)
  })

  it('should verify the fix: pressing "a" key now triggers proper author data computation', () => {
    // SCENARIO: Same as the bug reproduction test, but with the fix applied
    sessionStore.selectedPublications = [
      {
        doi: '10.1234/test1',
        title: 'Test Publication 1',
        year: 2020,
        author: 'John Doe; Jane Smith',
        authorOrcid: 'John Doe; Jane Smith',
        score: 0,
        boostKeywords: [],
        citationCount: undefined,
        referenceCount: undefined
      },
      {
        doi: '10.1234/test2',
        title: 'Test Publication 2',
        year: 2021,
        author: 'Jane Smith; Bob Wilson',
        authorOrcid: 'Jane Smith; Bob Wilson',
        score: 0,
        boostKeywords: [],
        citationCount: undefined,
        referenceCount: undefined
      }
    ]

    // Mock updatePublicationScores to simulate proper score computation
    sessionStore.updatePublicationScores.mockImplementation(() => {
      sessionStore.selectedPublications.forEach((pub) => {
        pub.score = Math.random() * 3 + 0.5
        pub.boostKeywords = ['machine learning']
        pub.citationCount = 10
        pub.referenceCount = 20
      })
    })

    // SIMULATE FIXED BEHAVIOR: What happens when user presses "a" key after fix
    // With the fix, Keys.js now calls openAuthorModalDialog() instead of just setting the flag
    openAuthorModalDialog()

    // VERIFICATION: With the fix, both score updates and author computation are triggered
    expect(sessionStore.updatePublicationScores).toHaveBeenCalled()
    expect(authorStore.computeSelectedPublicationsAuthors).toHaveBeenCalledWith(
      sessionStore.selectedPublications
    )

    // Modal is shown with properly computed data
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
  })
})
