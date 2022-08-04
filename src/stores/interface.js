import { defineStore } from 'pinia'

import { ToastProgrammatic as Toast } from 'buefy'
import { SnackbarProgrammatic as Snackbar } from 'buefy'
import { DialogProgrammatic as Dialog } from 'buefy'

export const useInterfaceStore = defineStore('interface', {
    state: () => {
        return {
            isLoading: false,
            loadingToast: undefined,
            isOverlay: false,
            isNetworkExpanded: false,
            isNetworkClusters: true,
            isFilterPanelShown: false,
            searchQuery: "",
            isSearchPanelShown: false,
            isAboutPageShown: false,
            isKeyboardControlsShown: false,
            feedbackInvitationShown: false,
        }
    },
    getters: {

    },
    actions: {
        clear() {
            this.isOverlay = false;
            this.isNetworkExpanded = false;
            this.isNetworkClusters = true;
            this.isFilterPanelShown = false;
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
            console.log(publication)
            const _this = this;
            const onClose = function () {
                _this.isOverlay = false;
                _this.activatePublicationComponent(
                    document.getElementById(publication.doi)
                );
            };
            this.isOverlay = true;
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

        showConfirmDialog(message, confirm) {
            this.isOverlay = true;
            Dialog.confirm({
                message: message,
                onConfirm: confirm,
                onCancel: () => {
                    this.isOverlay = false;
                },
            });
        },

        showFeedbackInvitation() {
            this.feedbackInvitationShown = true;
            Snackbar.open({
                indefinite: true,
                message:
                    "You have added the 10th publication to selected—we invite you to share your <b>feedback</b> on the tool!",
                cancelText: "Maybe later",
                onAction: this.openFeedback,
            });
        },

        openFeedback() {
            this.isOverlay = true;
            Dialog.confirm({
                message:
                    "<p><b>We are interested in your opinion!</b></p><p>&nbsp;</p><p>What you like and do not like, what features are missing, how you are using the tool, bugs, criticism, ... anything.</p><p>&nbsp;</p><p>We invite you to provide feedback publicly. Clicking 'OK' will open a GitHub discussion in another tab where you can post a comment (account required). Alternatively, you can always send a private message to <a href='mailto:fabian.beck@uni-bamberg.de'>fabian.beck@uni-bamberg.de</a>.</p>",
                onConfirm: () => {
                    window.open(
                        "https://github.com/fabian-beck/pure-suggest/discussions/214"
                    );
                    this.isOverlay = false;
                },
                onCancel: () => {
                    this.isOverlay = false;
                },
            });
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