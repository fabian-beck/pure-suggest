<template>
  <ul class="publication-list has-background-white">
    <LazyPublicationComponent
      v-for="publication in publications"
      :key="publication.doi"
      :publication="publication"
      v-on:activate="activatePublication"
    />
  </ul>
</template>

<script>
import { scrollToTargetAdjusted } from "@/Util.js";
import LazyPublicationComponent from './LazyPublicationComponent.vue';

export default {
  name: "PublicationListComponent",
  components: {
    LazyPublicationComponent
  },
  props: {
    publications: Array,
  },
  watch: {
    publications: {
      deep: true,
      handler: function (newPublications, oldPublications) {
        // Only auto-scroll if publications list actually changed (not just state updates)
        if (!oldPublications || newPublications.length !== oldPublications.length) {
          this.$nextTick(this.scrollToActivated);
        }
      },
    },
  },
  data() {
    return {
      onNextActivatedScroll: true,
      lastScrollTime: 0,
      userIsScrolling: false,
    };
  },
  mounted() {
    // Track user scrolling to prevent auto-scroll interference
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      this.userIsScrolling = true;
      this.lastScrollTime = Date.now();
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.userIsScrolling = false;
      }, 150);
    });
  },
  methods: {
    activatePublication: function (doi) {
      this.onNextActivatedScroll = false;
      this.$emit('activate', doi);
    },
    scrollToActivated() {
      // Don't auto-scroll if user is currently scrolling or just scrolled
      const timeSinceLastScroll = Date.now() - this.lastScrollTime;
      if (this.userIsScrolling || timeSinceLastScroll < 1000) {
        this.onNextActivatedScroll = true;
        return;
      }

      if (this.onNextActivatedScroll) {
        // Use setTimeout to avoid conflicts with lazy loading
        setTimeout(() => {
          const publicationComponent =
            this.$el.getElementsByClassName("is-active")[0];
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
        }, 100);
      } else {
        this.onNextActivatedScroll = true;
      }
    },
  },
};
</script>