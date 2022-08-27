<template>
  <div>
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
import { scrollToTargetAdjusted } from "./../Util.js";

export default {
  name: "QuickAccessBar",
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

  & .icon {
    margin: 0 !important;
  }

  & .button-label {
    font-size: 0.7rem;
  }
}
</style>