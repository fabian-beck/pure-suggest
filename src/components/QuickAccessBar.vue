<template>
  <div>
    <button
      class="button has-background-primary has-text-white"
      @click="scrollTo('selected')"
    >
      <b-icon icon="water-outline"></b-icon>
    </button>
    <button
      class="button has-background-info has-text-white"
      @click="scrollTo('suggested')"
    >
      <b-icon icon="water-plus-outline"></b-icon>
    </button>
    <button
      class="button has-background-grey has-text-white"
      @click="scrollTo('network')"
    >
      <b-icon icon="chart-bubble"></b-icon>
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

  & .icon {
    height: 2rem !important;
    width: 2rem !important;
  }
}
</style>