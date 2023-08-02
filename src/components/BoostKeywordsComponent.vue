<template>
  <div class="field has-addons is-floating-label boost">
    <label class="label">Keywords</label>
    <p class="control has-icons-right is-expanded">
      <highlightable-input
        class="input boost"
        :highlight="highlight"
        v-model="sessionStore.boostKeywordString"
        spellcheck="false"
        type="text"
        data-tippy-content="Boost by factors of 2 the score of publications that contain the following keyword(s) in their title.<br><br>Use ',' to separate multiple keywords, use '|' to separate alternatives/synonyms of the same keywords."
        v-tippy
      />
      <span class="icon is-small is-right is-clickable">
        <i
          class="delete"
          v-show="sessionStore.boostKeywordString"
          @click.stop="sessionStore.setBoostKeywordString('')"
        ></i>
      </span>
    </p>
    <p class="control">
      <b-button
        class="button has-background-warning"
        type="submit"
        icon-left="chevron-double-up"
        @click="sessionStore.logKeywordUpdate"
        v-on:click="sessionStore.updateScores"
      >
        <span><span class="key">B</span>oost</span>
      </b-button>
    </p>
  </div>
</template>

<script>
import { useSessionStore } from "./../stores/session.js";
import { useInterfaceStore } from "./../stores/interface.js";

import HighlightableInput from "vue-highlightable-input";

export default {
  name: "BoostKeywordsComponent",

  components: {
    HighlightableInput,
  },

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