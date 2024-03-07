<template>
  <v-list-item prepend-icon="mdi-file-download-outline" @click="finishStudyDialog">
    Download session log
  </v-list-item>
</template>
  
<script>
import { logActionEvent } from '@/Logging';
import { getEventLog } from '@/Logging';
export default {
  methods: {
    finishStudyDialog() {
      logActionEvent("end");
      getEventLog()
    },
  }
}
</script>
  
<style></style>