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
            feedbackInvitationShown: false,
        }
    },
    getters: {

    },
    actions: {
        clear() {
            this.isOverlay = false;
            this.isNetworkExpanded = false;
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

        updateLoadingToast: function (message, type) {
            if (!this.loadingToast) {
                this.loadingToast = Toast.open({
                    indefinite: true,
                });
            }
            this.loadingToast.message = message;
            this.loadingToast.type = type;
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


    }
})

function showToastMessage(data, log = console.log) {
    if (!data.message) return;
    log(data.message);
    Toast.open(data);
}