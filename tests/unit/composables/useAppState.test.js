import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useAppState } from '@/composables/useAppState.js'
import { useAuthorStore } from '@/stores/author.js'
import { useConceptStore } from '@/stores/concept.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'

// Mock useModalManager
const mockShowConfirmDialog = vi.fn()
vi.mock('@/composables/useModalManager.js', () => ({
  useModalManager: () => ({
    showConfirmDialog: mockShowConfirmDialog
  })
}))

// Mock all the dependencies
vi.mock('@/lib/Cache.js', () => ({
  clearCache: vi.fn()
}))

vi.mock('@/services/SuggestionService.js', () => ({
  SuggestionService: {
    computeSuggestions: vi.fn().mockResolvedValue({
      publications: []
    })
  }
}))

describe('useAppState - Session Loading', () => {
  let sessionStore, interfaceStore, authorStore, queueStore, appState

  beforeEach(() => {
    setActivePinia(createPinia())

    sessionStore = useSessionStore()
    interfaceStore = useInterfaceStore()
    authorStore = useAuthorStore()
    queueStore = useQueueStore()

    appState = useAppState()

    // Mock interface store methods
    interfaceStore.showErrorMessage = vi.fn()
    interfaceStore.startLoading = vi.fn()
    interfaceStore.endLoading = vi.fn()

    // Mock author store methods
    authorStore.computeSelectedPublicationsAuthors = vi.fn()

    // Mock sessionStore methods that have side effects
    sessionStore.addPublicationsToSelection = vi.fn()
  })

  describe('loadSession', () => {
    it('should restore session name when loading session with name property', () => {
      // Arrange: Start with empty session name
      sessionStore.sessionName = ''

      const sessionData = {
        name: 'My Research Project',
        selected: ['10.1234/pub1'],
        excluded: ['10.1234/pub2'],
        boost: 'machine learning'
      }

      // Act: Load the session
      appState.loadSession(sessionData)

      // Assert: Session name should be restored
      expect(sessionStore.sessionName).toBe('My Research Project')
    })

    it('should handle loading session without name property gracefully', () => {
      // Arrange: Set initial session name
      sessionStore.sessionName = 'Current Session'

      const sessionData = {
        selected: ['10.1234/pub1'],
        excluded: ['10.1234/pub2'],
        boost: 'machine learning'
      }

      // Act: Load session without name property
      appState.loadSession(sessionData)

      // Assert: Should clear session name when not provided in import data (complete session replacement)
      expect(sessionStore.sessionName).toBe('')
    })

    it('should set empty session name when name property is empty string', () => {
      // Arrange: Set initial session name
      sessionStore.sessionName = 'Current Session'

      const sessionData = {
        name: '',
        selected: ['10.1234/pub1'],
        excluded: [],
        boost: ''
      }

      // Act: Load session with empty name
      appState.loadSession(sessionData)

      // Assert: Should set session name to empty string
      expect(sessionStore.sessionName).toBe('')
    })

    it('should handle null session name gracefully', () => {
      // Arrange: Set initial session name
      sessionStore.sessionName = 'Current Session'

      const sessionData = {
        name: null,
        selected: ['10.1234/pub1'],
        excluded: [],
        boost: ''
      }

      // Act: Load session with null name
      appState.loadSession(sessionData)

      // Assert: Should clear session name when null (complete session replacement)
      expect(sessionStore.sessionName).toBe('')
    })

    it('should continue a recent session under its id but start a new id otherwise', () => {
      appState.loadSession({ id: 'recent-1', selected: ['10.1234/pub1'] })
      expect(sessionStore.sessionId).toBe('recent-1')

      appState.loadSession({ selected: ['10.1234/pub1'] })
      expect(sessionStore.sessionId).toBe('')
    })

    it('should clear previous session before importing new session', () => {
      // Arrange: Set up an existing session with selected publications
      sessionStore.selectedPublicationsDois = ['10.1234/existing1', '10.1234/existing2']
      sessionStore.excludedPublicationsDois = ['10.1234/excluded1']
      sessionStore.setBoostKeywordString('existing keywords')
      sessionStore.setSessionName('Existing Session')

      // Create a spy for sessionStore.clear to verify it's called
      const clearSpy = vi.spyOn(sessionStore, 'clear')

      const newSessionData = {
        name: 'New Imported Session',
        selected: ['10.1234/new1', '10.1234/new2'],
        excluded: ['10.1234/newexcluded1'],
        boost: 'new keywords'
      }

      // Act: Load the new session
      appState.loadSession(newSessionData)

      // Assert: Clear should be called to ensure previous session is cleared
      expect(clearSpy).toHaveBeenCalled()

      // Assert: Session properties should be set correctly
      expect(sessionStore.sessionName).toBe('New Imported Session')
      expect(sessionStore.boostKeywordString).toBe('NEW KEYWORDS')
      expect(sessionStore.excludedPublicationsDois).toEqual(['10.1234/newexcluded1'])

      // Assert: addPublicationsToSelection should be called with new publications
      expect(sessionStore.addPublicationsToSelection).toHaveBeenCalledWith([
        '10.1234/new1',
        '10.1234/new2'
      ])
    })
  })

  describe('concept tagging on suggestion updates', () => {
    it('should assign concept tags to selected publications after their metadata is fetched', async () => {
      const conceptStore = useConceptStore()
      conceptStore.concepts = [
        { publications: ['10.1234/a'], attributes: [{ type: 'keyword', value: 'VISUAL' }] }
      ]
      conceptStore.sortedConcepts = conceptStore.concepts
      conceptStore.conceptMetadata = new Map([
        [0, { name: 'C1 - VISUAL', exclusivityTerms: [], frequencyTerms: [] }]
      ])

      // Newly added publication: title only becomes available through fetchData
      const publication = {
        doi: '10.1234/new',
        title: '',
        citationDois: [],
        referenceDois: [],
        fetchData: vi.fn().mockImplementation(async function () {
          this.title = 'Visual Analytics'
        })
      }
      sessionStore.selectedPublications = [publication]
      sessionStore.updatePublicationScores = vi.fn()

      await appState.updateSuggestions()

      expect(publication.concepts).toEqual(['C1 - VISUAL'])
    })
  })

  describe('importSessionWithConfirmation', () => {
    it('should be exposed by useAppState', () => {
      expect(appState.importSessionWithConfirmation).toBeDefined()
      expect(typeof appState.importSessionWithConfirmation).toBe('function')
    })

    it('should show confirmation dialog with file input', () => {
      // Mock the showConfirmDialog method
      mockShowConfirmDialog.mockClear()

      appState.importSessionWithConfirmation()

      expect(mockShowConfirmDialog).toHaveBeenCalled()
      const [message, , title] = mockShowConfirmDialog.mock.calls[0]

      expect(message).toContain('Choose an exported session JSON file')
      expect(message).toContain('input type="file"')
      expect(title).toBe('Import session')
    })

    it('should show warning message when session is not empty', () => {
      // Manually add publications to make the session non-empty
      // (We can't use the mocked method as it doesn't actually update state)
      sessionStore.selectedPublications = [{ doi: '10.1234/test1' }, { doi: '10.1234/test2' }]

      mockShowConfirmDialog.mockClear()

      appState.importSessionWithConfirmation()

      expect(mockShowConfirmDialog).toHaveBeenCalled()
      const [message] = mockShowConfirmDialog.mock.calls[0]

      expect(message).toContain('This will clear and replace the current session')
      expect(message).toContain('Choose an exported session JSON file')

      // Clean up
      sessionStore.clear()
    })

    it('should not show warning message when session is empty', () => {
      // Ensure session is empty
      sessionStore.clear()
      queueStore.clear()

      mockShowConfirmDialog.mockClear()

      appState.importSessionWithConfirmation()

      expect(mockShowConfirmDialog).toHaveBeenCalled()
      const [message] = mockShowConfirmDialog.mock.calls[0]

      expect(message).not.toContain('This will clear and replace the current session')
      expect(message).toContain('Choose an exported session JSON file')
    })
  })

  describe('importSession', () => {
    it.each([
      ['vis-survey.puresuggest.json', '', 'vis-survey'],
      ['vis-survey (1).json', undefined, 'vis-survey'],
      ['session.puresuggest (2).json', '', ''],
      ['renamed.puresuggest.json', 'My Research Project', 'My Research Project']
    ])('should import %s with name %j as session "%s"', async (fileName, name, expected) => {
      const content = JSON.stringify({ name, selected: ['10.1234/pub1'] })

      appState.importSession(new File([content], fileName))

      await vi.waitFor(() => expect(sessionStore.addPublicationsToSelection).toHaveBeenCalled())
      expect(sessionStore.sessionName).toBe(expected)
    })
  })

  describe('loadSession with malformed data', () => {
    it('should keep the current session when the selected publications are no list', () => {
      sessionStore.sessionName = 'Current Session'

      appState.loadSession({ selected: '10.1234/pub1' })

      expect(interfaceStore.showErrorMessage).toHaveBeenCalled()
      expect(sessionStore.sessionName).toBe('Current Session')
      expect(sessionStore.addPublicationsToSelection).not.toHaveBeenCalled()
    })

    it('should lowercase excluded DOIs', () => {
      appState.loadSession({ selected: ['10.1234/pub1'], excluded: ['10.1234/PUB2'] })

      expect(sessionStore.excludedPublicationsDois).toEqual(['10.1234/pub2'])
    })
  })

  describe('importBibtex', () => {
    it('should keep the current session when the file contains no DOIs', async () => {
      sessionStore.sessionName = 'Current Session'

      await appState.importBibtex(new File(['@article{key, title = {No DOI}}'], 'no-doi.bib'))

      expect(interfaceStore.showErrorMessage).toHaveBeenCalled()
      expect(sessionStore.sessionName).toBe('Current Session')
      expect(sessionStore.addPublicationsToSelection).not.toHaveBeenCalled()
    })

    it('should read DOIs given as URL or with escaped underscores', async () => {
      const bibtex = `@article{a, doi = {https://doi.org/10.1234/pub1}}
        @article{b, doi = "10.1234/pub\\_2"}`

      await appState.importBibtex(new File([bibtex], 'dois.bib'))

      expect(sessionStore.addPublicationsToSelection).toHaveBeenCalledWith([
        '10.1234/pub1',
        '10.1234/pub_2'
      ])
    })
  })

  describe('importBibtexWithConfirmation', () => {
    it('should be exposed by useAppState', () => {
      expect(appState.importBibtex).toBeDefined()
      expect(typeof appState.importBibtex).toBe('function')
      expect(appState.importBibtexWithConfirmation).toBeDefined()
      expect(typeof appState.importBibtexWithConfirmation).toBe('function')
    })

    it('should show confirmation dialog with BibTeX file input', () => {
      mockShowConfirmDialog.mockClear()

      appState.importBibtexWithConfirmation()

      expect(mockShowConfirmDialog).toHaveBeenCalled()
      const [message, , title] = mockShowConfirmDialog.mock.calls[0]

      expect(message).toContain('Choose a BibTeX file')
      expect(message).toContain('accept=".bib"')
      expect(title).toBe('Import BibTeX')
    })

    it('should show warning message when requested explicitly', () => {
      sessionStore.clear()
      queueStore.clear()
      mockShowConfirmDialog.mockClear()

      appState.importBibtexWithConfirmation(true)

      const [message] = mockShowConfirmDialog.mock.calls[0]
      expect(message).toContain('This will clear and replace the current session')
      expect(message).toContain('Choose a BibTeX file')
    })

    it('should show warning message when session is not empty', () => {
      sessionStore.selectedPublications = [{ doi: '10.1234/test1' }]
      mockShowConfirmDialog.mockClear()

      appState.importBibtexWithConfirmation()

      const [message] = mockShowConfirmDialog.mock.calls[0]
      expect(message).toContain('This will clear and replace the current session')
      expect(message).toContain('Choose a BibTeX file')

      sessionStore.clear()
    })
  })

  describe('updateQueued', () => {
    it('should drop the DOI filter of a publication that is excluded', async () => {
      sessionStore.filter.dois = ['10.1234/kept', '10.1234/excluded']
      queueStore.excludedQueue = ['10.1234/excluded']

      await appState.updateQueued()

      expect(sessionStore.filter.dois).toEqual(['10.1234/kept'])
    })

    it('should scroll the publication lists to the top', async () => {
      document.body.innerHTML = `<div id="selected"><ul class="publication-list"></ul></div>
        <div id="suggested"><ul class="publication-list"></ul></div>`
      const lists = [...document.querySelectorAll('.publication-list')]
      lists.forEach((list) => (list.scrollTop = 100))

      await appState.updateQueued()

      expect(lists.map((list) => list.scrollTop)).toEqual([0, 0])
    })
  })
})
