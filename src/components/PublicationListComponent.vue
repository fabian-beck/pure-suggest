<template>
  <ul class="publication-list has-background-white">
    <PublicationComponent
      v-for="publication in publications"
      :key="publication.doi"
      :publication="publication"
      v-on:activate="activatePublication"
    ></PublicationComponent>
  </ul>
</template>

<script>
import { scrollToTargetAdjusted } from "@/Util.js";

export default {
  name: "PublicationListComponent",
  props: {
    publications: Array,
  },
  watch: {
    publications: {
      deep: true,
      handler: function () {
        this.$nextTick(this.scrollToActivated);
      },
    },
  },
  data() {
    return {
      onNextActivatedScroll: true,
    };
  },
  methods: {
    activatePublication: function () {
      this.onNextActivatedScroll = false;
    },
    scrollToActivated() {
      if (this.onNextActivatedScroll) {
        const publicationComponent =
          this.$el.getElementsByClassName("active")[0];
        if (publicationComponent) {
          if (window.innerWidth <= 1023)
            scrollToTargetAdjusted(publicationComponent, 65);
          else {
            publicationComponent.scrollIntoView({
              behavior: "smooth",
              block: "start",
              inline: "nearest",
            });
          }
        }
      } else {
        this.onNextActivatedScroll = true;
      }
    },
  },
};
</script>
