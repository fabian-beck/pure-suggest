<template>
  <div>
    <button
      class="button has-background-primary has-text-white"
      @click="sessionStore.updateQueued"
      v-show="sessionStore.isUpdatable"
      id="quick-access-update"
    >
      <b-icon icon="update" size="is-small"></b-icon>
      <div class="button-label">Update</div>
    </button>
    <button
      class="button has-background-primary has-text-white"
      @click="scrollTo('selected')"
    >
      <b-icon icon="water-outline"></b-icon>
      <div class="button-label">Selected</div>
    </button>
    <button
      class="button has-background-info has-text-white"
      @click="scrollTo('suggested')"
    >
      <b-icon icon="water-plus-outline"></b-icon>
      <div class="button-label">Suggested</div>
    </button>
    <button
      class="button has-background-grey has-text-white"
      @click="scrollTo('network')"
    >
      <b-icon icon="chart-bubble"></b-icon>
      <div class="button-label">Network</div>
    </button>
  </div>
</template>
<script>
import { useSessionStore } from "./../stores/session.js";

import { scrollToTargetAdjusted } from "./../Util.js";

export default {
  name: "QuickAccessBar",
  setup() {
    const sessionStore = useSessionStore();
    return { sessionStore };
  },
  methods: {
    scrollTo(id) {
      scrollToTargetAdjusted(document.getElementById(id), 55);
    },
  },
};
</script>
<style lang="scss" scoped>
@import "~bulma/sass/utilities/_all";

button {
  margin: 0.5rem;
  box-shadow: 0.25rem 0.25rem 0.75rem grey;
  width: 4.5rem;
  height: 3.5rem;
  display: inline;
  padding: 0.25rem;
  filter: brightness(90%);

  &:focus {
    border-color: black;
    filter: brightness(100%);
    box-shadow: 0.1rem 0.1rem 0.5rem grey !important;
  }

  & .icon {
    margin: 0 !important;
  }

  & .button-label {
    font-size: 0.7rem;
  }
}

#quick-access-update {
  position: absolute;
  bottom: 4rem;
  filter: brightness(100%);
  display: inline-flex;
  height: auto;

  & .icon {
    margin-right: 0.2rem !important;
  }
}
</style>