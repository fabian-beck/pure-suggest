<template>
  <ul 
    class="publication-list has-background-white"
    :class="{ 'empty-list': publications.length === 0 }"
    @click="handleDelegatedClick"
    @mouseenter="handleDelegatedMouseEnter"
    @mouseleave="handleDelegatedMouseLeave"
  >
    <template v-for="item in publicationsWithHeaders" :key="item.key">
      <li v-if="item.type === 'header'" class="section-header">
        <h3 class="section-header-text" :class="{ 'info-theme': publicationType === 'suggested' }">
          {{ item.text }}
        </h3>
      </li>
      <LazyPublicationComponent
        v-else
        :publication="item.publication"
        v-on:activate="activatePublication"
      />
    </template>
  </ul>
</template>

<script>
import { scrollToTargetAdjusted } from "@/Util.js";
import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";
import LazyPublicationComponent from './LazyPublicationComponent.vue';

export default {
  name: "PublicationListComponent",
  components: {
    LazyPublicationComponent
  },
  props: {
    publications: Array,
    showSectionHeaders: {
      type: Boolean,
      default: false
    },
    publicationType: {
      type: String,
      default: 'general', // 'selected' or 'suggested' or 'general'
      validator: (value) => ['selected', 'suggested', 'general'].includes(value)
    }
  },
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
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
  computed: {
    publicationsWithHeaders() {
      // Don't show headers if filtering is not active for this publication type
      const isFilteringApplied = this.sessionStore.filter.hasActiveFilters() &&
        ((this.publicationType === 'selected' && this.sessionStore.filter.applyToSelected) ||
         (this.publicationType === 'suggested' && this.sessionStore.filter.applyToSuggested));
         
      if (!this.showSectionHeaders || !isFilteringApplied) {
        return this.publications.map(publication => ({
          type: 'publication',
          publication,
          key: publication.doi
        }));
      }

      const result = [];
      let filteredCount = 0;
      let nonFilteredCount = 0;
      let addedFilteredHeader = false;
      let addedNonFilteredHeader = false;

      this.publications.forEach(publication => {
        const matches = this.sessionStore.filter.matches(publication);
        
        if (matches) {
          if (!addedFilteredHeader) {
            if (this.publicationType === 'selected') {
              filteredCount = this.sessionStore.selectedPublicationsFilteredCount;
              result.push({
                type: 'header',
                text: `Filtered publications (${filteredCount})`,
                key: 'filtered-header'
              });
            } else if (this.publicationType === 'suggested') {
              filteredCount = this.sessionStore.suggestedPublicationsFilteredCount;
              result.push({
                type: 'header',
                text: `Filtered publications (${filteredCount})`,
                key: 'filtered-header'
              });
            }
            addedFilteredHeader = true;
          }
          result.push({
            type: 'publication',
            publication,
            key: publication.doi
          });
        } else {
          if (!addedNonFilteredHeader) {
            if (this.publicationType === 'selected') {
              nonFilteredCount = this.sessionStore.selectedPublicationsNonFilteredCount;
              if (nonFilteredCount > 0) {
                result.push({
                  type: 'header',
                  text: `Other publications (${nonFilteredCount})`,
                  key: 'non-filtered-header'
                });
                addedNonFilteredHeader = true;
              }
            } else if (this.publicationType === 'suggested') {
              nonFilteredCount = this.sessionStore.suggestedPublicationsNonFilteredCount;
              if (nonFilteredCount > 0) {
                result.push({
                  type: 'header',
                  text: `Other publications (${nonFilteredCount})`,
                  key: 'non-filtered-header'
                });
                addedNonFilteredHeader = true;
              }
            }
          }
          result.push({
            type: 'publication',
            publication,
            key: publication.doi
          });
        }
      });

      return result;
    }
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

<style lang="scss" scoped>
.section-header {
  position: sticky;
  top: 0;
  z-index: 10;
  margin: 0;
  padding: 0;
  
  .section-header-text {
    margin: 0;
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--bulma-primary-dark);
    background: linear-gradient(135deg, var(--bulma-primary-95) 0%, var(--bulma-primary-90) 100%);
    border-left: 3px solid var(--bulma-primary);
    border-bottom: 1px solid var(--bulma-primary-85);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    @include light-shadow;
    
    &.info-theme {
      color: var(--bulma-info-dark);
      background: linear-gradient(135deg, var(--bulma-info-95) 0%, var(--bulma-info-90) 100%);
      border-left-color: var(--bulma-info);
      border-bottom-color: var(--bulma-info-85);
    }
  }
}

.publication-list.empty-list {
  min-height: 200px;
  height: 100%;
  flex: 1;
}
</style>