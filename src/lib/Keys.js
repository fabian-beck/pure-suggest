import { useAppState } from '../composables/useAppState.js'
import { useModalManager } from '../composables/useModalManager.js'
import { useInterfaceStore } from '../stores/interface.js'
import { useQueueStore } from '../stores/queue.js'
import { useSessionStore } from '../stores/session.js'

/**
 * Find the next or previous publication component, skipping section headers
 * @param {Element} currentElement - The current publication's parent element
 * @param {string} direction - 'next' or 'previous'
 * @returns {Element|null} - The next/previous publication component or null if not found
 */
function findAdjacentPublicationComponent(currentElement, direction) {
  let sibling =
    direction === 'next' ? currentElement.nextElementSibling : currentElement.previousElementSibling

  while (sibling) {
    // Look for publication-component within this sibling
    const publicationComponent = sibling.getElementsByClassName('publication-component')[0]
    if (publicationComponent) {
      return publicationComponent
    }

    // Move to the next/previous sibling if no publication found
    sibling = direction === 'next' ? sibling.nextElementSibling : sibling.previousElementSibling
  }

  return null
}

/**
 * Handle global keyboard shortcuts available when app has data
 */
function handleGlobalShortcuts(e) {
  const sessionStore = useSessionStore()
  const interfaceStore = useInterfaceStore()
  const { clearSession, updateQueued } = useAppState()

  if (e.key === 'c') {
    e.preventDefault()
    clearSession()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    document.activeElement.blur()
    sessionStore.clearActivePublication('escape key')
  } else if (e.key === 'b') {
    e.preventDefault()
    sessionStore.clearActivePublication('setting focus on text field')
    // First, try to find and click the boost button to open the menu
    const boostButton = document.querySelector('.boost-button')
    if (boostButton) {
      boostButton.click()
      // Wait a bit for the menu to open, then focus on the input
      setTimeout(() => {
        const boostElements = document.getElementsByClassName('boost')
        if (boostElements.length > 0) {
          const inputs = boostElements[0].getElementsByTagName('input')
          if (inputs.length > 0) {
            inputs[0].focus()
          }
        }
      }, 100) // Small delay to allow menu to open
    }
  } else if (e.key === 'u') {
    e.preventDefault()
    if (useQueueStore().isUpdatable) updateQueued()
  } else if (e.key === 'f') {
    e.preventDefault()
    // Open filter menu and activate filter (same behavior as clicking button)
    const wasOpened = interfaceStore.openFilterMenu()
    if (wasOpened) {
      // Only activate filter when opening the menu (not when closing)
      sessionStore.filter.isActive = true
    }
  } else if (e.key === 'm') {
    e.preventDefault()
    interfaceStore.isNetworkClusters = !interfaceStore.isNetworkClusters
  } else if (e.key === 'p') {
    e.preventDefault()
    // Toggle performance panel in network visualization
    interfaceStore.togglePerformancePanel()
  } else {
    return false // Key not handled
  }
  return true // Key was handled
}

/**
 * Handle navigation shortcuts (arrow keys for panel switching)
 */
function handleNavigationShortcuts(e) {
  const interfaceStore = useInterfaceStore()

  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    // Close filter menu when navigating to publications
    interfaceStore.closeFilterMenu()
    interfaceStore.activatePublicationComponent(
      document.getElementById('selected').getElementsByClassName('publication-component')[0]
    )
    return true
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    // Close filter menu when navigating to publications
    interfaceStore.closeFilterMenu()
    interfaceStore.activatePublicationComponent(
      document.getElementById('suggested').getElementsByClassName('publication-component')[0]
    )
    return true
  }
  return false // Key not handled
}

/**
 * Handle arrow key navigation for active publications
 */
function handleArrowKeyNavigation(e) {
  const interfaceStore = useInterfaceStore()

  e.preventDefault()
  const activePublicationComponent = document.getElementsByClassName(
    'publication-component is-active'
  )[0]
  try {
    const direction = e.key === 'ArrowDown' ? 'next' : 'previous'
    const navigationDirection = e.key === 'ArrowDown' ? 'down' : 'up'
    const nextPublicationComponent = findAdjacentPublicationComponent(
      activePublicationComponent.parentNode,
      direction
    )
    if (nextPublicationComponent) {
      interfaceStore.activatePublicationComponent(nextPublicationComponent, navigationDirection)
    }
  } catch {
    console.log('Could not activate next/previous publication.')
  }
  return true
}

/**
 * Handles shortcuts acting on a publication (queue, open, export, etc.), in the main
 * lists as well as in dialogs listing publications.
 * @param {KeyboardEvent} e - The keyboard event.
 * @param {Object} publication - The publication to act on.
 * @returns {boolean} True if the key was handled.
 */
export function handlePublicationKey(e, publication) {
  const sessionStore = useSessionStore()
  const { showAbstract } = useModalManager()
  const { queueForSelected, queueForExcluded } = useAppState()

  if (e.key === '+') {
    e.preventDefault()
    queueForSelected(publication.doi)
  } else if (e.key === '-') {
    e.preventDefault()
    queueForExcluded(publication.doi)
  } else if (e.key === 'd') {
    e.preventDefault()
    window.open(publication.doiUrl)
  } else if (e.key === 't' && publication.abstract) {
    e.preventDefault()
    showAbstract(publication)
  } else if (e.key === 'g') {
    e.preventDefault()
    window.open(publication.gsUrl)
  } else if (e.key === 'x') {
    e.preventDefault()
    sessionStore.exportSingleBibtex(publication)
  } else if (e.key === 'i') {
    e.preventDefault()
    // Only allow DOI filtering for selected publications, not suggested ones
    if (sessionStore.isSelected(publication.doi)) {
      sessionStore.filter.toggleDoi(publication.doi)
      // Ensure filters are active when adding DOI
      sessionStore.filter.isActive = true
    }
  } else {
    return false // Key not handled
  }
  return true // Key was handled
}

/**
 * Lets the user escape a long-running data loading operation via the Escape key
 * @returns {boolean} True if the key was handled (loading was active)
 */
function handleLoadingEscape(e) {
  if (e.key !== 'Escape') return false

  const interfaceStore = useInterfaceStore()
  if (!interfaceStore.isLoading || !interfaceStore.isLoadingCancelable) return false

  e.preventDefault()
  interfaceStore.cancelLoading()
  return true
}

/**
 * Handle shortcuts that work when a publication is active
 */
function handleActivePublicationShortcuts(e) {
  const sessionStore = useSessionStore()

  if (!sessionStore.activePublication) return false

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    return handleArrowKeyNavigation(e)
  }

  return handlePublicationKey(e, sessionStore.activePublication)
}

/**
 * Opens dialogs via shortcut; search and help work also in an empty session
 * @returns {boolean} True if the key opened a dialog
 */
function handleDialogShortcuts(e, isEmpty) {
  const modalManager = useModalManager()
  const openDialogByKey = {
    s: modalManager.openSearchModal,
    '?': modalManager.openKeyboardControlsModal,
    ...(!isEmpty && {
      a: () => modalManager.openAuthorModal(),
      o: modalManager.openConceptConfigModal,
      q: modalManager.openQueueModal,
      e: modalManager.openExcludedModal
    })
  }
  const openDialog = openDialogByKey[e.key]
  if (!openDialog) return false
  e.preventDefault()
  openDialog()
  return true
}

/**
 * Skips keys handled elsewhere (e.g., by a dialog), with modifiers, or repeated (except for
 * scrolling through publications). Shift is fine for characters such as '+' or '?' (e.key
 * already reflects it), but not for named keys such as arrows.
 */
function isIgnoredKeyEvent(e) {
  return (
    e.defaultPrevented ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    (e.shiftKey && e.key.length > 1) ||
    (e.repeat && !(e.key === 'ArrowDown' || e.key === 'ArrowUp'))
  )
}

export function onKey(e) {
  const { isEmpty } = useAppState()
  const { isAnyOverlayShown } = useModalManager()

  if (isIgnoredKeyEvent(e)) return

  if (handleLoadingEscape(e)) return

  // Dialogs and list menus handle their own keys (Tab, Enter, Space, Escape, arrows, sliders)
  if (isAnyOverlayShown || document.activeElement.closest('.v-overlay .v-list')) return

  // Handle input field focus (the class name of SVG elements, e.g., network nodes, is no string)
  const { nodeName, type, className } = document.activeElement
  if (
    (nodeName === 'INPUT' && type === 'text') ||
    (typeof className === 'string' && className.includes('input'))
  ) {
    if (e.key === 'Escape') {
      document.activeElement.blur()
    }
    return
  }

  if (handleDialogShortcuts(e, isEmpty.value)) return
  if (isEmpty.value) return

  // Try handlers in order: global → navigation → active publication
  if (handleGlobalShortcuts(e)) return
  if (handleNavigationShortcuts(e)) return
  if (handleActivePublicationShortcuts(e)) return
}
