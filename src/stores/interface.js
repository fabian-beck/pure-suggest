import { defineStore } from 'pinia'

import { ToastProgrammatic as Toast } from 'buefy'

export const useInterfaceStore = defineStore('interface', {
    state: () => {
        return {
        }
    },
    getters: {

    },
    actions: {
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