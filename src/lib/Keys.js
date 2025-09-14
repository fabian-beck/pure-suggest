import { useAppState } from '../composables/useAppState.js'
import { useInterfaceStore } from '../stores/interface.js'
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
    updateQueued()
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
 * Handle other publication shortcuts (queue, open, export, etc.)
 */
function handlePublicationActions(e) {
  const sessionStore = useSessionStore()
  const interfaceStore = useInterfaceStore()
  const publication = sessionStore.activePublication

  if (e.key === '+') {
    e.preventDefault()
    sessionStore.queueForSelected(publication.doi)
  } else if (e.key === '-') {
    e.preventDefault()
    sessionStore.queueForExcluded(publication.doi)
  } else if (e.key === 'd') {
    e.preventDefault()
    window.open(publication.doiUrl)
  } else if (e.key === 't' && publication.abstract) {
    e.preventDefault()
    interfaceStore.showAbstract(publication)
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
 * Handle shortcuts that work when a publication is active
 */
function handleActivePublicationShortcuts(e) {
  const sessionStore = useSessionStore()

  if (!sessionStore.activePublication) return false

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    return handleArrowKeyNavigation(e)
  }

  return handlePublicationActions(e)
}

export function onKey(e) {
  const interfaceStore = useInterfaceStore()
  const { isEmpty, openAuthorModalDialog } = useAppState()

  // Early returns for modifier keys and repeats
  if (
    e.ctrlKey ||
    e.shiftKey ||
    e.metaKey ||
    (e.repeat && !(e.key === 'ArrowDown' || e.key === 'ArrowUp'))
  ) {
    return
  }

  // Handle overlay states
  if (interfaceStore.isAnyOverlayShown && document.activeElement.nodeName != 'INPUT') {
    e.preventDefault()
    return
  }

  // Handle input field focus
  if (
    (document.activeElement.nodeName === 'INPUT' && document.activeElement.type === 'text') ||
    document.activeElement.className.includes('input')
  ) {
    if (e.key === 'Escape') {
      document.activeElement.blur()
    }
    return
  }

  // Search shortcut (works even when empty)
  if (e.key === 's') {
    e.preventDefault()
    interfaceStore.isSearchModalDialogShown = true
    return
  }

  // Author shortcut (works when not empty)
  if (!isEmpty.value && e.key === 'a') {
    e.preventDefault()
    openAuthorModalDialog()
    return
  }

  // Early return if app is empty
  if (isEmpty.value) return

  // Try handlers in order: global → navigation → active publication
  if (handleGlobalShortcuts(e)) return
  if (handleNavigationShortcuts(e)) return
  if (handleActivePublicationShortcuts(e)) return
}