<template>
  <form @submit.prevent="sessionStore.updateScores"
    v-tippy="`Boost by factors of 2 the score of publications that contain the following keyword(s) in their title.`">
    <v-text-field class="boost" density="compact" v-model="sessionStore.boostKeywordString" label="Boost keywords"
      variant="solo" append-inner-icon="mdi-close" @click:append-inner="sessionStore.setBoostKeywordString('')"
      hint="Use ',' to separate keywords, use '|' to discern alternatives/synonyms.">
      <template v-slot:append>
        <v-btn class="has-background-warning" @click="sessionStore.updateScores" v-on:click="sessionStore.logKeywordUpdate"
 height="47">
          <v-icon>mdi-chevron-double-up</v-icon>
        </v-btn>
      </template>
    </v-text-field>
  </form>
</template>

<script>
import { useSessionStore } from "@/stores/session.js";

export default {
  name: "BoostKeywordsComponent",

  setup() {
    const sessionStore = useSessionStore();
    return { sessionStore };
  },

};
</script>

<style lang="scss" scoped>
@include v-input-details;

:deep(input) {
  text-transform: lowercase;
}

:deep(.v-input__append) {
  margin-inline-start: 0.5rem !important;

  & button {
    padding: 0 !important;
    min-width: 2rem;
  }
}
</style>