import { defineStore } from 'pinia'

import { ToastProgrammatic as Toast } from 'buefy'
import { SnackbarProgrammatic as Snackbar } from 'buefy'
import { DialogProgrammatic as Dialog } from 'buefy'

export const useInterfaceStore = defineStore('interface', {
    state: () => {
        return {
            isLoading: false,
            loadingToast: undefined,
            isNetworkExpanded: false,
            isNetworkClusters: true,
            searchQuery: "",
            isFilterPanelShown: false,
            isDialogShown: false,
            isSearchPanelShown: false,
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
        }
    },
    getters: {
        isMobile() {
            return window.innerWidth <= 1023;
        },
        isAnyOverlayShown() {
            return this.isDialogShown || this.confirmDialog.isShown || this.isSearchPanelShown || this.isAuthorModalDialogShown || this.isAboutModalDialogShown || this.isKeyboardControlsModalDialogShown || this.isfeedbackInvitationShown;
        }
    },
    actions: {
        clear() {
            this.isDialogShown = false;
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
                this.loadingToast.close();
                this.loadingToast = null;
            }
        },

        updateLoadingToast(message, type) {
            if (!this.loadingToast) {
                this.loadingToast = Toast.open({
                    indefinite: true,
                });
            }
            this.loadingToast.message = message;
            this.loadingToast.type = type;
        },

        showAbstract(publication) {
            const _this = this;
            const onClose = function () {
                _this.isDialogShown = false;
                _this.activatePublicationComponent(
                    document.getElementById(publication.doi)
                );
            };
            this.isDialogShown = true;
            Dialog.alert({
                message: `<div><b>${publication.title}</b></div><div><i>${publication.abstract}</i></div>`,
                type: "is-dark",
                hasIcon: true,
                icon: "text",
                confirmText: "Close",
                canCancel: ["escape", "outside"],
                onConfirm: onClose,
                onCancel: onClose,
            });
        },

        showMessage(message) {
            showToastMessage({
                message: message,
            });
        },

        showImportantMessage(message) {
            ({
                duration: 5000,
                message: message,
                type: "is-primary",
            });
        },

        showErrorMessage(errorMessage) {
            showToastMessage({
                duration: 5000,
                message: errorMessage,
                type: "is-danger",
            }, console.error);
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

        openSearchPanel(query) {
            this.searchQuery = query ? query : "";
            this.isSearchPanelShown = true;
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

function showToastMessage(data, log = console.log) {
    if (!data.message) return;
    log(data.message);
    Toast.open(data);
}