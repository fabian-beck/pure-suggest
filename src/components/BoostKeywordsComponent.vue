<template>
  <v-menu v-if="!sessionStore.isEmpty" location="bottom" transition="slide-y-transition" :close-on-content-click="false">
    <template v-slot:activator="{ props }">
      <v-btn class="boost-button p-1 pl-4" v-bind="props" :icon="interfaceStore.isMobile" @click="handleMenuInput(true)"
        :density="interfaceStore.isMobile ? 'compact' : 'default'">
        <v-icon size="18">mdi-chevron-double-up</v-icon>
        <span class="is-hidden-touch ml-2">
          <span v-html="boostKeywordStringHtml ? boostKeywordStringHtml : '[Set keywords]'"
            :class="{ 'has-text-warning-dark': !boostKeywordStringHtml }"></span>
          <v-icon class="ml-2">
            mdi-menu-down
          </v-icon>
        </span>
      </v-btn>
    </template>
    <v-sheet class="has-background-warning-light p-2 pt-4">
      <form @submit.prevent="sessionStore.logAndUpdateScores"
        v-tippy="`Boost by factors of 2 the score of publications that contain the following keyword(s) in their title.`">
        <v-text-field ref="boost" class="boost" density="compact" v-model="sessionStore.boostKeywordString"
          label="Keywords" variant="solo" append-inner-icon="mdi-close"
          @click:append-inner="sessionStore.setBoostKeywordString('')"
          hint="Use ',' to separate keywords, use '|' to discern alternatives/synonyms." persistent-hint>
          <template v-slot:append>
            <v-btn class="has-background-warning" @click="sessionStore.logAndUpdateScores" height="47">
              <v-icon>mdi-chevron-double-up</v-icon>
            </v-btn>
          </template>
        </v-text-field>
        <v-checkbox v-model="sessionStore.isBoost" label="Boost scores" density="compact"
          hint="Each matched keyword in a title will double the score of a publication" persistent-hint
          @change="sessionStore.updateScores"></v-checkbox>
      </form>
    </v-sheet>
  </v-menu>
</template>

<script>
import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";

export default {
  name: "BoostKeywordsComponent",

  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
  },

  computed: {
    boostKeywordStringHtml() {
      let html = this.sessionStore.boostKeywordString;
      // wrap comma seperated words in span.word
      html = html.replace(/\s*([^,|]+)/g, "<span class='word'>$1</span>");
      // wrap | in span.alt
      html = html.replace(/\|/g, "<span class='alt'>|</span>");
      // wrap , in span.comma
      html = html.replace(/,/g, "<span class='comma'>,</span>");
      return html;
    },
  },

  methods: {
    handleMenuInput(value) {
      if (value) {
        this.$nextTick(() => {
          this.$refs.boost.focus();
        });
      }
    },
  },

};
</script>

<style lang="scss" scoped>
:deep(input) {
  text-transform: uppercase;
}

:deep(.v-input__append) {
  margin-inline-start: 0.5rem !important;

  & button {
    padding: 0 !important;
    min-width: 2rem;
  }
}

:deep(.word) {
  text-decoration: underline;
  text-decoration-color: hsl(48, 100%, 67%);
  text-decoration-thickness: 0.2rem;
}

:deep(.alt) {
  color: #aaa;
  margin-left: 0.1rem;
  margin-right: 0.1rem;
  font-weight: bold;
}

:deep(.comma) {
  color: #aaa;
  margin-left: 0.2rem;
  margin-right: 0.3rem;
  font-weight: bold;
}
</style>