import { defineStore } from 'pinia'
import { useAuthorStore } from './author.js'
import { useSessionStore } from './session.js'

export const useInterfaceStore = defineStore('interface', {
    state: () => {
        return {
            isLoading: false,
            loadingMessage: "",
            errorToast: {
                message: "",
                isShown: false,
                type: "",
                duration: 0,
            },
            isNetworkExpanded: false,
            isNetworkCollapsed: false,
            isNetworkClusters: true,
            showPerformancePanel: false,
            searchQuery: "",
            isSearchModalDialogShown: false,
            isAuthorModalDialogShown: false,
            isExcludedModalDialogShown: false,
            isQueueModalDialogShown: false,
            isAboutModalDialogShown: false,
            // Network replot trigger (incremented to notify NetworkVisComponent to replot)
            networkReplotTrigger: 0,
            isKeyboardControlsModalDialogShown: false,
            confirmDialog: {
                message: "",
                action: () => { },
                isShown: false,
                title: "",
            },
            infoDialog: {
                message: "",
                isShown: false,
                title: "",
            },
            isMobile: true,
            isFilterMenuOpen: false,
        }
    },
    getters: {
        isAnyOverlayShown() {
            return this.confirmDialog.isShown
                || this.infoDialog.isShown
                || this.isSearchModalDialogShown
                || this.isAuthorModalDialogShown
                || this.isExcludedModalDialogShown
                || this.isQueueModalDialogShown
                || this.isAboutModalDialogShown
                || this.isKeyboardControlsModalDialogShown;
        }
    },
    actions: {
        clear() {
            this.isNetworkExpanded = false;
            this.isNetworkCollapsed = false;
            this.isNetworkClusters = true;
            window.scrollTo(0, 0);
        },

        checkMobile() {
            this.isMobile = window.innerWidth < 1023;
        },

        startLoading() {
            this.isLoading = true;
        },

        endLoading() {
            this.isLoading = false;
            this.loadingMessage = "";
        },

        showAbstract(publication) {
            this.infoDialog = {
                title: "Abstract",
                message: `<div><i>${publication.abstract}</i></div>`,
                isShown: true,
            }
        },

        showErrorMessage(errorMessage) {
            console.error(errorMessage);
            this.errorToast = {
                isShown: true,
                message: errorMessage,
            };
        },

        showConfirmDialog(message, confirm, title = "Confirm") {
            this.confirmDialog = {
                message: message,
                action: confirm,
                isShown: true,
                title: title,
            }
        },

        openSearchModalDialog(query) {
            this.searchQuery = query ? query : "";
            this.isSearchModalDialogShown = true;
        },

        openAuthorModalDialog(authorId) {
            // Ensure author data is computed before showing the modal
            const authorStore = useAuthorStore()
            const sessionStore = useSessionStore()
            
            // Check if we need to compute author data
            if (sessionStore.selectedPublications?.length > 0 && 
                (authorStore.selectedPublicationsAuthors.length === 0 || 
                 this.isAuthorDataStale(sessionStore.selectedPublications, authorStore.selectedPublicationsAuthors))) {
                
                // IMPORTANT: Publications need to have their scores updated before computing author data
                // Otherwise authors will have score=0 and no keywords
                if (this.publicationsNeedScoreUpdate(sessionStore.selectedPublications)) {
                    sessionStore.updateScores()
                }
                
                authorStore.computeSelectedPublicationsAuthors(sessionStore.selectedPublications)
            }
            
            this.isAuthorModalDialogShown = true;
            
            // If authorId is provided, try to activate that author
            if (authorId) {
                // Check if author exists in the computed authors list
                const authorExists = authorStore.selectedPublicationsAuthors.some(author => author.id === authorId)
                if (authorExists) {
                    authorStore.setActiveAuthor(authorId)
                }
            }
        },

        isAuthorDataStale(selectedPublications, authors) {
            // Check 1: No authors computed despite having publications with authors
            const publicationsWithAuthors = selectedPublications.filter(pub => pub.author || pub.authorOrcid)
            if (publicationsWithAuthors.length > 0 && authors.length === 0) {
                return true
            }
            
            // Check 2: Authors computed from publications with uncomputed scores
            // If publications need score updates, then existing author data is likely stale
            if (authors.length > 0 && this.publicationsNeedScoreUpdate(selectedPublications)) {
                return true
            }
            
            // Check 3: Authors have suspiciously low scores (indicating they were computed from score=0 publications)
            if (authors.length > 0) {
                const authorsWithZeroScore = authors.filter(author => author.score === 0 || author.score === authors.length)
                const percentZeroScore = (authorsWithZeroScore.length / authors.length) * 100
                
                // If more than 80% of authors have zero or minimal scores, likely computed from unscored publications
                if (percentZeroScore > 80) {
                    return true
                }
            }
            
            return false
        },

        publicationsNeedScoreUpdate(publications) {
            // Check if publications have default/uninitialized scores
            // Publications with score=0 and empty boostKeywords likely haven't had updateScores() called
            return publications.some(pub => 
                pub.score === 0 && 
                (!pub.boostKeywords || pub.boostKeywords.length === 0) &&
                // Make sure it's not legitimately a zero score (has citation/reference data but calculated to 0)
                (pub.citationCount === undefined || pub.referenceCount === undefined)
            )
        },

        activatePublicationComponent: function (publicationComponent) {
            if (publicationComponent && typeof publicationComponent.focus === 'function') {
                publicationComponent.focus();
            }
        },

        triggerNetworkReplot() {
            // Increment trigger counter to notify NetworkVisComponent to replot
            this.networkReplotTrigger++;
        },

        openFilterMenu() {
            if (this.isFilterMenuOpen) {
                this.closeFilterMenu()
                return false
            }
            this.isFilterMenuOpen = true
            return true
        },

        closeFilterMenu() {
            this.isFilterMenuOpen = false
        },

        setFilterMenuState(isOpen) {
            this.isFilterMenuOpen = isOpen
        },

        togglePerformancePanel() {
            this.showPerformancePanel = !this.showPerformancePanel
        },

        collapseNetwork() {
            this.isNetworkExpanded = false;
            this.isNetworkCollapsed = true;
        },

        expandNetwork() {
            this.isNetworkExpanded = true;
            this.isNetworkCollapsed = false;
        },

        restoreNetwork() {
            this.isNetworkExpanded = false;
            this.isNetworkCollapsed = false;
        },

    }
})