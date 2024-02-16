import { defineStore } from 'pinia'

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
            isNetworkClusters: true,
            searchQuery: "",
            isFilterPanelShown: false,
            isSearchModalDialogShown: false,
            isAuthorModalDialogShown: false,
            isExcludedModalDialogShown: false,
            isQueueModalDialogShown: false,
            isAboutModalDialogShown: false,
            scrollAuthorId: null,
            isKeyboardControlsModalDialogShown: false,
            feebackInvitationWasShown: false,
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
            this.isNetworkClusters = true;
            this.isFilterPanelShown = false;
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
            this.isAuthorModalDialogShown = true;
            if (authorId) {
                this.scrollAuthorId = authorId;
            }
        },

        activatePublicationComponent: function (publicationComponent) {
            if (publicationComponent) {
                publicationComponent.focus();
            }
        },

    }
})