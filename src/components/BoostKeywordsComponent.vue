<template>
  <form @submit.prevent="sessionStore.updateScores"
    v-tippy="`Boost by factors of 2 the score of publications that contain the following keyword(s) in their title.`">
    <v-text-field class="boost" density="compact" v-model="sessionStore.boostKeywordString" label="Keywords"
      variant="solo" append-inner-icon="mdi-close" @click:append-inner="sessionStore.setBoostKeywordString('')"
      hint="Use ',' to separate keywords, use '|' to discern alternatives/synonyms.">
      <template v-slot:append>
        <v-btn class="has-background-warning" @click="sessionStore.updateScores" height="47">
          <v-icon>mdi-chevron-double-up</v-icon>
          <span class="is-hidden-mobile"><span class="key">B</span>oost</span>
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
.v-input {
  position: relative;

  & :deep(input) {
    text-transform: lowercase;
  }

  & :deep(.v-input__details) {
    position: absolute;
    min-height: 0;
    z-index: 5;
    padding-inline-start: 0;
    padding-inline-end: 0;
    padding: 0;
    margin-top: 0.25rem;
    box-shadow: rgba(0, 0, 0, 0.2) 0px 3px 1px -2px, rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 1px 5px 0px;

    &>div {
      background-color: white;
      padding: 0.5rem !important;
      border-radius: 5px;
      opacity: 1.0;

      &:empty {
        display: none;
      }
    }
  }
}
</style>