<template>
  <div>
    <b-button
      type="has-background-primary has-text-white"
      icon-right="file-export"
      v-on:click="scrollTo('selected')"
    />
    <b-button
      type="has-background-info has-text-white"
      icon-right="file-import"
      v-on:click="scrollTo('suggested')"
    />
    <b-button
      type="has-background-grey has-text-white"
      icon-right="chart-bar"
      v-on:click="scrollTo('network')"
    />
  </div>
</template>
<script>
import { scrollToTargetAdjusted } from "./../Util.js";

export default {
  name: "QuickAccessBar",
  methods: {
    scrollTo(id) {
      scrollToTargetAdjusted(id);
    },
  },
};
</script>
<style lang="scss" scoped>
@import "~bulma/sass/utilities/_all";

button {
  margin: 0.5rem;
  box-shadow: 0.25rem 0.25rem 0.75rem grey;
}
</style>