import { defineStore } from 'pinia'

import { ToastProgrammatic as Toast } from 'buefy'

export const useInterfaceStore = defineStore('interface', {
    state: () => {
        return {
            isLoading: false,
            loadingToast: undefined,
        }
    },
    getters: {

    },
    actions: {
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
    }
})

function showToastMessage(data, log = console.log) {
    if (!data.message) return;
    log(data.message);
    Toast.open(data);
}