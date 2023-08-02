<template>
    <b-button
      class="is-primary"
      @click="finishStudyDialog"
    >
      Finish Study
    </b-button>
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