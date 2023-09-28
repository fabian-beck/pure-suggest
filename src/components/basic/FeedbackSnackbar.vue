<template>
    <v-snackbar v-model="interfaceStore.isFeedbackSnackbarShown" timeout="-1" right :vertical="interfaceStore.isMobile">
        You have added the 10th publication to selected—we invite you to share your <b>feedback</b> on the tool!
        <template v-slot:actions>
            <v-btn color="white" text
                @click="interfaceStore.isFeedbackSnackbarShown = false; interfaceStore.openFeedback()">
                Give feedback
            </v-btn>
            <v-btn color="white" text v-bind="attrs" @click="interfaceStore.isFeedbackSnackbarShown = false">
                Maybe later
            </v-btn>
        </template>
    </v-snackbar>
</template>

<script>
import { useInterfaceStore } from "@/stores/interface.js";

export default {
    name: "FeedbackSnackbar",
    setup: () => {
        const interfaceStore = useInterfaceStore();
        return { interfaceStore };
    },
};
</script>