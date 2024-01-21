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
            isExcludeModalDialogShown: false,
            isAboutModalDialogShown: false,
            isKeyboardControlsModalDialogShown: false,
            isFeedbackSnackbarShown: false,
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
                || this.isAboutModalDialogShown
                || this.isKeyboardControlsModalDialogShown
                || this.isFeedbackSnackbarShown;
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

        showFeedbackInvitation() {
            this.isFeedbackSnackbarShown = true;
            this.feebackInvitationWasShown = true;
        },

        openSearchModalDialog(query) {
            this.searchQuery = query ? query : "";
            this.isSearchModalDialogShown = true;
        },

        openAuthorModalDialog() {
            this.isAuthorModalDialogShown = true;
        },

        openFeedback() {
            this.showConfirmDialog("<p>What you like and do not like, what features are missing, how you are using the tool, bugs, criticism, ... anything.</p><p>&nbsp;</p><p>We invite you to provide feedback publicly. Clicking 'OK' will open a GitHub discussion in another tab where you can post a comment (account required). Alternatively, you can always send a private message to <a href='mailto:fabian.beck@uni-bamberg.de'>fabian.beck@uni-bamberg.de</a>.</p>", () => {
                window.open(
                    "https://github.com/fabian-beck/pure-suggest/discussions/214"
                )
            },
                "We are interested in your opinion!")
        },

        activatePublicationComponent: function (publicationComponent) {
            if (publicationComponent) {
                publicationComponent.focus();
            }
        },

    }
})