import { useSessionStore } from "./stores/session.js";
import { useInterfaceStore } from "./stores/interface.js";

export function onKey(e) {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
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
        sessionStore.clearSession();
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
        interfaceStore.isFilterPanelShown = !interfaceStore.isFilterPanelShown;
    } else if (e.key === "m") {
        e.preventDefault();
        interfaceStore.isNetworkClusters = !interfaceStore.isNetworkClusters;
    } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        interfaceStore.activatePublicationComponent(
            document
                .getElementById("selected")
                .getElementsByClassName("publication-component")[0]
        );
    } else if (e.key === "ArrowRight") {
        e.preventDefault();
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
                interfaceStore.activatePublicationComponent(
                    e.key === "ArrowDown"
                        ? activePublicationComponent.parentNode.nextSibling.getElementsByClassName("publication-component")[0]
                        : activePublicationComponent.parentNode.previousSibling.getElementsByClassName("publication-component")[0]
                );
            } catch (error) {
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
                if (!interfaceStore.isFilterPanelShown) {
                    interfaceStore.isFilterPanelShown = true;
                    sessionStore.filter.addDoi(doi);
                } else {
                    sessionStore.filter.toggleDoi(doi);
                }
            }
        }
    }
}