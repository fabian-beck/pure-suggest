import { defineStore } from 'pinia'

import { SnackbarProgrammatic as Snackbar } from 'buefy'

export const useInterfaceStore = defineStore('interface', {
    state: () => {
        return {
            isLoading: false,
            loadingToast: {
                message: "",
                isShown: false,
                type: "",
            },
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
            isAboutModalDialogShown: false,
            isKeyboardControlsModalDialogShown: false,
            isfeedbackInvitationShown: false,
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
        }
    },
    getters: {
        isMobile() {
            return window.innerWidth <= 1023;
        },
        isAnyOverlayShown() {
            return this.confirmDialog.isShown || this.infoDialog.isShown|| this.isSearchModalDialogShown || this.isAuthorModalDialogShown || this.isAboutModalDialogShown || this.isKeyboardControlsModalDialogShown || this.isfeedbackInvitationShown;
        }
    },
    actions: {
        clear() {
            this.isNetworkExpanded = false;
            this.isNetworkClusters = true;
            this.isFilterPanelShown = false;
            window.scrollTo(0, 0);
        },

        startLoading() {
            this.isLoading = true;
        },

        endLoading() {
            this.isLoading = false;
            if (this.loadingToast) {
                this.loadingToast.isShown = false;
            }
        },

        updateLoadingToast(message, type) {
            this.loadingToast = {
                message: message,
                isShown: true,
                type: type,
            };
        },

        showAbstract(publication) {
            this.infoDialog = {
                title: publication.title,
                message: `<div><b>Abstract:</b> <i>${publication.abstract}</i></div>`,
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
            this.isfeedbackInvitationShown = true;
            Snackbar.open({
                indefinite: true,
                message:
                    "You have added the 10th publication to selected—we invite you to share your <b>feedback</b> on the tool!",
                cancelText: "Maybe later",
                onAction: this.openFeedback,
            });
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