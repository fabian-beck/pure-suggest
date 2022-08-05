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
    } else if (
        interfaceStore.isLoading ||
        interfaceStore.isOverlay ||
        interfaceStore.isSearchPanelShown &
        (document.activeElement.nodeName != "INPUT") ||
        interfaceStore.isAboutPageShown ||
        interfaceStore.isKeyboardControlsShown
    ) {
        e.preventDefault();
        return;
    } else if (document.activeElement.nodeName === "INPUT") {
        if (e.key === "Escape") {
            document.activeElement.blur();
        } else {
            return;
        }
    } else if (e.key === "c") {
        e.preventDefault();
        sessionStore.clearSession();
    } else if (e.key === "Escape") {
        e.preventDefault();
        document.activeElement.blur();
        sessionStore.clearActivePublication("escape key");
    } else if (e.key === "a") {
        e.preventDefault();
        sessionStore.clearActivePublication("setting focus on text field");
        document.getElementsByClassName("input add-publication")[0].focus();
    } else if (e.key === "s") {
        e.preventDefault();
        interfaceStore.isSearchPanelShown = true;
    } else if (e.key === "b") {
        e.preventDefault();
        sessionStore.clearActivePublication("setting focus on text field");
        document.getElementsByClassName("input boost")[0].focus();
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
                "publication-component active"
            )[0];
            interfaceStore.activatePublicationComponent(
                e.key === "ArrowDown"
                    ? activePublicationComponent.nextSibling
                    : activePublicationComponent.previousSibling
            );
        } else if (e.key === "+") {
            e.preventDefault();
            const doi = sessionStore.activePublication.doi;
            sessionStore.activateNextPublication();
            sessionStore.queueForSelected(doi);
        } else if (e.key === "-") {
            e.preventDefault();
            const doi = sessionStore.activePublication.doi;
            sessionStore.activateNextPublication();
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
        } else if (
            e.key === "o" &&
            sessionStore.activePublication.oaLink
        ) {
            e.preventDefault();
            window.open(sessionStore.activePublication.oaLink);
        } else if (e.key === "g") {
            e.preventDefault();
            window.open(sessionStore.activePublication.gsUrl);
        } else if (e.key === "x") {
            e.preventDefault();
            sessionStore.exportSingleBibtex(
                sessionStore.activePublication
            );
        }
    }
}