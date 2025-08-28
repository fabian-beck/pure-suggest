import { useSessionStore } from "./stores/session.js";
import { useInterfaceStore } from "./stores/interface.js";
import { useAppState } from "./composables/useAppState.js";

/**
 * Find the next or previous publication component, skipping section headers
 * @param {Element} currentElement - The current publication's parent element
 * @param {string} direction - 'next' or 'previous'
 * @returns {Element|null} - The next/previous publication component or null if not found
 */
function findAdjacentPublicationComponent(currentElement, direction) {
    let sibling = direction === 'next' 
        ? currentElement.nextElementSibling 
        : currentElement.previousElementSibling;
    
    while (sibling) {
        // Look for publication-component within this sibling
        const publicationComponent = sibling.getElementsByClassName("publication-component")[0];
        if (publicationComponent) {
            return publicationComponent;
        }
        
        // Move to the next/previous sibling if no publication found
        sibling = direction === 'next' 
            ? sibling.nextElementSibling 
            : sibling.previousElementSibling;
    }
    
    return null;
}

export function onKey(e) {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    const { clearSession } = useAppState();
    if (
        e.ctrlKey ||
        e.shiftKey ||
        e.metaKey ||
        (e.repeat && !(e.key === "ArrowDown" || e.key === "ArrowUp"))
    ) {
        return;
    }
    if (
        interfaceStore.isAnyOverlayShown &&
        document.activeElement.nodeName != "INPUT"
    ) {
        e.preventDefault();
        return;
    }
    if ((document.activeElement.nodeName === "INPUT" && document.activeElement.type === "text")
        || document.activeElement.className.includes("input")) {
        if (e.key === "Escape") {
            document.activeElement.blur();
        }
        return;
    }
    if (e.key === "s") {
        e.preventDefault();
        interfaceStore.isSearchModalDialogShown = true;
        return;
    }
    if (sessionStore.isEmpty) return;
    if (e.key === "a") {
        e.preventDefault();
        interfaceStore.isAuthorModalDialogShown = true;
        return;
    }
    if (e.key === "c") {
        e.preventDefault();
        clearSession();
    } else if (e.key === "Escape") {
        e.preventDefault();
        document.activeElement.blur();
        sessionStore.clearActivePublication("escape key");
    } else if (e.key === "b") {
        e.preventDefault();
        sessionStore.clearActivePublication("setting focus on text field");
        document.getElementsByClassName("boost")[0].getElementsByTagName("input")[0].focus();
    } else if (e.key === "u") {
        e.preventDefault();
        sessionStore.updateQueued();
    } else if (e.key === "f") {
        e.preventDefault();
        // Open filter menu and focus on it
        interfaceStore.openFilterMenu();
    } else if (e.key === "m") {
        e.preventDefault();
        interfaceStore.isNetworkClusters = !interfaceStore.isNetworkClusters;
    } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        // Close filter menu when navigating to publications
        interfaceStore.closeFilterMenu();
        interfaceStore.activatePublicationComponent(
            document
                .getElementById("selected")
                .getElementsByClassName("publication-component")[0]
        );
    } else if (e.key === "ArrowRight") {
        e.preventDefault();
        // Close filter menu when navigating to publications
        interfaceStore.closeFilterMenu();
        interfaceStore.activatePublicationComponent(
            document
                .getElementById("suggested")
                .getElementsByClassName("publication-component")[0]
        );
    } else if (sessionStore.activePublication) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const activePublicationComponent = document.getElementsByClassName(
                "publication-component is-active"
            )[0];
            try {
                const direction = e.key === "ArrowDown" ? 'next' : 'previous';
                const nextPublicationComponent = findAdjacentPublicationComponent(
                    activePublicationComponent.parentNode, 
                    direction
                );
                if (nextPublicationComponent) {
                    interfaceStore.activatePublicationComponent(nextPublicationComponent);
                }
            } catch {
                console.log("Could not activate next/previous publication.")
            }
        } else if (e.key === "+") {
            e.preventDefault();
            const doi = sessionStore.activePublication.doi;
            sessionStore.queueForSelected(doi);
        } else if (e.key === "-") {
            e.preventDefault();
            const doi = sessionStore.activePublication.doi;
            sessionStore.queueForExcluded(doi);
        } else if (e.key === "d") {
            e.preventDefault();
            window.open(sessionStore.activePublication.doiUrl);
        } else if (
            e.key === "t" &&
            sessionStore.activePublication.abstract
        ) {
            e.preventDefault();
            interfaceStore.showAbstract(sessionStore.activePublication);
        } else if (e.key === "g") {
            e.preventDefault();
            window.open(sessionStore.activePublication.gsUrl);
        } else if (e.key === "x") {
            e.preventDefault();
            sessionStore.exportSingleBibtex(
                sessionStore.activePublication
            );
        } else if (e.key === "i") {
            e.preventDefault();
            const doi = sessionStore.activePublication.doi;
            // Only allow DOI filtering for selected publications, not suggested ones
            if (sessionStore.isSelected(doi)) {
                sessionStore.filter.toggleDoi(doi);
                // Ensure filters are active when adding DOI
                sessionStore.filter.isActive = true;
            }
        }
    }
}