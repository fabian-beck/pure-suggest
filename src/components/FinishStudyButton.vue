<template>
    <v-btn
    class="has-background-info-light"
      @click="finishStudyDialog"
    >
      Finish Study
    </v-btn>
  </template>
  
  <script>
  import { logActionEvent} from '@/Logging';
  import { getEventLog } from '@/Logging';
  export default {
    name: "FinishStudyButton",
    methods: {
      finishStudyDialog() {
        logActionEvent("end");
        getEventLog()
      },
    }
  }
  </script>
  
  <style>
  </style>