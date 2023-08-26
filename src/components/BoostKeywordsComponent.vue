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
import { useInterfaceStore } from "@/stores/interface.js";

export default {
  name: "BoostKeywordsComponent",

  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
  },

  data() {
    return {
      highlight: [
        {
          text: ",",
          style: "color: #ccc; padding-left: 0.25rem; padding-right: 0.75rem;",
        },
        {
          text: "|",
          style: "color: #ccc; padding-left: 0.25rem; padding-right: 0.25rem;",
        },
        {
          text: /[^,|]+\b/g, // match any character except "," and "|"; last character should not be a whitespace
          style:
            "text-decoration: underline; text-decoration-color: hsl(48, 100%, 67%); text-decoration-thickness: 0.25rem;",
        },
      ],
    };
  },
};
</script>

<style lang="scss">
.boost {
  .is-expanded {
    width: 0;

    & .input {
      text-transform: lowercase;
      text-overflow: inherit;
      overflow: hidden;
      display: inline-block;
      white-space: nowrap;
      user-select: text;

      & br {
        display: none;
      }

      & * {
        display: inline;
        white-space: nowrap;
      }
    }
  }
}
</style>