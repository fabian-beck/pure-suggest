<template>
  <ul 
    class="publication-list has-background-white"
    @click="handleDelegatedClick"
    @mouseenter="handleDelegatedMouseEnter"
    @mouseleave="handleDelegatedMouseLeave"
  >
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
import { useSessionStore } from "@/stores/session.js";
import LazyPublicationComponent from './LazyPublicationComponent.vue';

export default {
  name: "PublicationListComponent",
  components: {
    LazyPublicationComponent
  },
  props: {
    publications: Array,
  },
  setup() {
    const sessionStore = useSessionStore();
    return { sessionStore };
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
    
    // Event delegation handlers
    handleDelegatedClick(event) {
      const publicationElement = this.findPublicationElement(event.target);
      if (publicationElement) {
        event.stopPropagation();
        const doi = publicationElement.id;
        if (doi) {
          this.sessionStore.activatePublicationComponentByDoi(doi);
          this.activatePublication(doi);
        }
      }
    },
    
    handleDelegatedMouseEnter(event) {
      const publicationElement = this.findPublicationElement(event.target);
      if (publicationElement) {
        const doi = publicationElement.id;
        const publication = this.publications.find(p => p.doi === doi);
        if (publication) {
          this.sessionStore.hoverPublication(publication, true);
        }
      }
    },
    
    handleDelegatedMouseLeave(event) {
      const publicationElement = this.findPublicationElement(event.target);
      if (publicationElement) {
        const doi = publicationElement.id;
        const publication = this.publications.find(p => p.doi === doi);
        if (publication) {
          this.sessionStore.hoverPublication(publication, false);
        }
      }
    },
    
    
    // Helper method to find the publication element from event target
    findPublicationElement(target) {
      // Walk up the DOM tree to find the element with publication-component class
      let element = target;
      while (element && element !== this.$el) {
        if (element.classList && element.classList.contains('publication-component')) {
          return element;
        }
        element = element.parentElement;
      }
      return null;
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