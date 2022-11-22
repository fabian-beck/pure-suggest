<template>
  <div class="field has-addons">
    <p class="control has-icons-right is-expanded">
      <input
        class="input boost has-background-white"
        type="text"
        v-model="sessionStore.boostKeywordString"
        placeholder="keyword(s)"
        @keyup.enter="sessionStore.updateScores"
        data-tippy-content="Boost by factors of 2 the score of publications that contain the following keyword(s) in their title.<br><br>Use commas to separate multiple keywords."
        v-tippy
      />
      <span class="icon is-small is-right is-clickable">
        <i
          class="delete"
          @click.stop="sessionStore.setBoostKeywordString('')"
        ></i>
      </span>
    </p>
    <p class="control">
      <b-button
        class="button has-background-warning"
        type="submit"
        icon-left="chevron-double-up"
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

export default {
  name: "BoostKeywordsComponent",
  
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
  },
};
</script>

<style lang="scss" scoped>
input.boost {
  text-transform: lowercase;
}
</style>