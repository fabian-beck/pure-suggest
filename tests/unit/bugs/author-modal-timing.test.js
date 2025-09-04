import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import AuthorModalDialog from '@/components/modal/AuthorModalDialog.vue'
import { useAuthorStore } from '@/stores/author.js'
import { useSessionStore } from '@/stores/session.js'
import { useInterfaceStore } from '@/stores/interface.js'

const vuetify = createVuetify()

describe('Author Modal Timing Issue', () => {
  let pinia
  let authorStore
  let sessionStore
  let interfaceStore
  let wrapper

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    authorStore = useAuthorStore()
    sessionStore = useSessionStore()
    interfaceStore = useInterfaceStore()

    // Set up test data
    sessionStore.selectedPublications = [
      { 
        doi: '10.1234/test1', 
        title: 'Test Publication 1', 
        year: 2020, 
        author: 'John Doe; Jane Smith',
        authorOrcid: 'John Doe; Jane Smith',
        score: 0.8,
        isNew: false,
        boostKeywords: ['machine learning']
      },
      { 
        doi: '10.1234/test2', 
        title: 'Test Publication 2', 
        year: 2021, 
        author: 'Jane Smith; Bob Wilson',
        authorOrcid: 'Jane Smith; Bob Wilson',
        score: 0.9,
        isNew: true,
        boostKeywords: ['deep learning']
      }
    ]
    sessionStore.uniqueBoostKeywords = ['machine learning', 'deep learning']

    // Mock the computeSelectedPublicationsAuthors to simulate real behavior
    vi.spyOn(authorStore, 'computeSelectedPublicationsAuthors').mockImplementation((publications) => {
      // This simulates the real computation
      authorStore.selectedPublicationsAuthors = [
        {
          id: 'john-doe',
          name: 'John Doe',
          count: 1,
          firstAuthorCount: 1,
          score: 0.8,
          yearMin: 2020,
          yearMax: 2020,
          alternativeNames: ['John Doe'],
          keywords: { 'machine learning': 1 },
          coauthors: { 'jane-smith': 1 },
          orcid: undefined,
          newPublication: false,
          publicationDois: ['10.1234/test1'],
          initials: 'JD'
        },
        {
          id: 'jane-smith',
          name: 'Jane Smith',
          count: 2,
          firstAuthorCount: 1,
          score: 1.7, // higher score due to being in two publications
          yearMin: 2020,
          yearMax: 2021,
          alternativeNames: ['Jane Smith'],
          keywords: { 'machine learning': 1, 'deep learning': 1 },
          coauthors: { 'john-doe': 1, 'bob-wilson': 1 },
          orcid: undefined,
          newPublication: true,
          publicationDois: ['10.1234/test1', '10.1234/test2'],
          initials: 'JS'
        },
        {
          id: 'bob-wilson',
          name: 'Bob Wilson',
          count: 1,
          firstAuthorCount: 0,
          score: 0.9,
          yearMin: 2021,
          yearMax: 2021,
          alternativeNames: ['Bob Wilson'],
          keywords: { 'deep learning': 1 },
          coauthors: { 'jane-smith': 1 },
          orcid: undefined,
          newPublication: true,
          publicationDois: ['10.1234/test2'],
          initials: 'BW'
        }
      ]
    })

    wrapper = mount(AuthorModalDialog, {
      global: {
        plugins: [vuetify, pinia],
        stubs: {
          ModalDialog: {
            template: `
              <div class="modal-dialog" :class="{ visible: modelValue }" v-show="modelValue">
                <div class="header">
                  <slot name="header-menu"></slot>
                </div>
                <div class="content">
                  <slot></slot>
                </div>
              </div>
            `,
            props: ['modelValue']
          },
          CompactButton: {
            template: '<button class="compact-button" @click="$emit(\'click\')"><slot></slot></button>'
          },
          AuthorGlyph: {
            template: '<div class="author-glyph" :author="author"></div>',
            props: ['author']
          },
          InlineIcon: {
            template: '<span class="inline-icon"><slot></slot></span>'
          },
          'v-checkbox': {
            template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked); $emit(\'change\', $event.target.checked)" />',
            props: ['modelValue', 'label', 'density', 'hint', 'persistentHint']
          },
          'v-list': {
            template: '<div class="v-list"><slot></slot></div>'
          },
          'v-list-item': {
            template: '<div class="v-list-item"><slot></slot></div>'
          },
          'v-menu': {
            template: '<div class="v-menu"><slot name="activator" :props="{}"></slot><slot></slot></div>',
            props: ['closeOnContentClick']
          },
          'v-chip': {
            template: '<span class="v-chip"><slot></slot></span>',
            props: ['label', 'size', 'style']
          }
        }
      }
    })
  })

  it('should verify that the timing issue is now fixed: modal computes author data automatically when opened', async () => {
    // INITIAL STATE: Author store is empty (simulating fresh page load or before computeSuggestions is called)
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(0)

    // USER ACTION: Open the author modal dialog (this happens when user clicks author button)
    interfaceStore.openAuthorModalDialog()
    await nextTick()

    // FIX: Modal automatically computes author data when opened
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
    expect(wrapper.vm.authorStore.selectedPublicationsAuthors).toHaveLength(3)
    
    // The modal DOM should show the authors immediately
    const authorList = wrapper.findAll('li')
    expect(authorList).toHaveLength(3) // Authors are displayed immediately!
    
    // Verify all expected authors are displayed
    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('Jane Smith')
    expect(wrapper.text()).toContain('Bob Wilson')
  })

  it('should verify that the fix works: opening modal now computes data immediately without requiring settings changes', async () => {
    // Start with empty author store
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(0)

    // Open modal - should compute data automatically now
    interfaceStore.openAuthorModalDialog()
    await nextTick()

    // FIX: Author data is computed immediately when modal opens
    expect(wrapper.findAll('li')).toHaveLength(3)
    expect(authorStore.computeSelectedPublicationsAuthors).toHaveBeenCalled()
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(3)

    // Settings changes should still work, but are no longer required
    const callCount = authorStore.computeSelectedPublicationsAuthors.mock.calls.length
    wrapper.vm.updateAuthorScores()
    await nextTick()

    // updateAuthorScores should still trigger recomputation (for settings changes)
    expect(authorStore.computeSelectedPublicationsAuthors.mock.calls.length).toBe(callCount + 1)
  })

  it('should demonstrate the expected behavior: modal shows correct data when author computation happens before opening', async () => {
    // PROPER FLOW: Compute author data BEFORE opening modal
    authorStore.computeSelectedPublicationsAuthors(sessionStore.selectedPublications)
    
    // Verify author data is available
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(3)

    // NOW open the modal
    interfaceStore.openAuthorModalDialog()
    await nextTick()

    // SUCCESS: Modal shows correct data immediately
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
    const authorList = wrapper.findAll('li')
    expect(authorList).toHaveLength(3)
    
    // Verify all expected authors are displayed
    const modalText = wrapper.text()
    expect(modalText).toContain('John Doe')
    expect(modalText).toContain('Jane Smith') 
    expect(modalText).toContain('Bob Wilson')
    
    // Verify author details are correct
    expect(modalText).toContain('2 selected publications') // Jane Smith has 2 publications
    expect(modalText).toContain('1 selected publication') // John Doe and Bob Wilson have 1 each
    
    // Note: "Co-author of" and "Related to" details are only shown when a specific author is activated
    // This test verifies the list view where these details should be hidden
    expect(modalText).not.toContain('Co-author of')
    expect(modalText).not.toContain('Related to')
  })

  it('should verify that modal automatically displays data without requiring manual updateAuthorScores', async () => {
    // Start with empty state and open modal
    interfaceStore.openAuthorModalDialog()
    await nextTick()
    
    // FIX: Authors are automatically computed and displayed
    expect(wrapper.findAll('li')).toHaveLength(3)

    // Verify that the automatic computation happened
    expect(authorStore.computeSelectedPublicationsAuthors).toHaveBeenCalledWith(sessionStore.selectedPublications)

    // Manual updateAuthorScores should still work for settings changes
    const callCount = authorStore.computeSelectedPublicationsAuthors.mock.calls.length
    wrapper.vm.updateAuthorScores()
    await nextTick()
    expect(authorStore.computeSelectedPublicationsAuthors.mock.calls.length).toBe(callCount + 1)
  })

  it('should verify that the interface store openAuthorModalDialog method now automatically triggers author computation', () => {
    // FIX: Opening the modal now triggers author computation automatically
    interfaceStore.openAuthorModalDialog()
    
    // The modal is shown AND author computation is triggered
    expect(interfaceStore.isAuthorModalDialogShown).toBe(true)
    expect(authorStore.computeSelectedPublicationsAuthors).toHaveBeenCalled()
    expect(authorStore.selectedPublicationsAuthors).toHaveLength(3)
  })

})