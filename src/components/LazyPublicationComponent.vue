<template>
  <!-- Skeleton/placeholder when not loaded -->
  <li 
    v-if="!hasLoaded" 
    ref="targetRef"
    class="publication-skeleton-wrapper"
  >
    <div 
      class="publication-skeleton publication-component"
      :class="{
        'is-active': publication.isActive,
        'is-selected': publication.isSelected,
        'is-linked-to-active': publication.isLinkedToActive,
      }"
      :style="{ height: `${estimatedHeight}px` }"
      tabindex="0"
      :id="publication.doi"
      @focus="handleFocus"
      @click="handleClick"
      @keydown="handleKeyDown"
    >
      <div class="skeleton-glyph"></div>
      <div class="skeleton-content">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-author"></div>
        <div class="skeleton-line skeleton-year"></div>
      </div>
    </div>
  </li>
  
  <!-- Actual component when loaded (PublicationComponent has its own <li>) -->
  <PublicationComponent
    v-else
    ref="targetRef"
    :publication="publication"
    v-on:activate="$emit('activate', $event)"
  />
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import PublicationComponent from './PublicationComponent.vue'

const emit = defineEmits(['activate'])
const props = defineProps({
  publication: {
    type: Object,
    required: true
  },
  estimatedHeight: {
    type: Number,
    default: 85 // Based on typical PublicationComponent height
  }
})
    const hasLoaded = ref(false);
    const targetRef = ref(null);
    let observer = null;

    // Load immediately if publication is active/selected to avoid navigation issues
    const shouldLoadImmediately = () => {
      return props.publication.isActive || 
             props.publication.isSelected || 
             props.publication.isLinkedToActive;
    };

    onMounted(() => {
      // Load immediately for active/selected publications or if no IntersectionObserver
      if (shouldLoadImmediately() || !window.IntersectionObserver) {
        hasLoaded.value = true;
        return;
      }

      // Only set up observer if we have a skeleton (not loaded)
      if (!hasLoaded.value && targetRef.value) {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && !hasLoaded.value) {
                hasLoaded.value = true;
                // Stop observing once loaded
                if (observer) {
                  observer.unobserve(entry.target);
                }
              }
            });
          },
          {
            root: null,
            rootMargin: '150px', // Load 150px before entering viewport
            threshold: 0
          }
        );

        observer.observe(targetRef.value);
      }
    });

    // Watch for publication state changes and load if becomes active
    watch(() => [props.publication.isActive, props.publication.isSelected, props.publication.isLinkedToActive], 
      ([isActive, isSelected, isLinkedToActive]) => {
        if ((isActive || isSelected || isLinkedToActive) && !hasLoaded.value) {
          hasLoaded.value = true;
          // Stop observing if we were observing
          if (observer && targetRef.value) {
            observer.unobserve(targetRef.value);
          }
          
        }
      }
    );


    onUnmounted(() => {
      if (observer && targetRef.value) {
        observer.unobserve(targetRef.value);
        observer.disconnect();
      }
    });

    // Force load when user interacts with skeleton
    function forceLoad() {
      if (!hasLoaded.value) {
        const wasFocused = document.activeElement === targetRef.value?.querySelector('.publication-skeleton');
        hasLoaded.value = true;
        // Stop observing if we were observing
        if (observer && targetRef.value) {
          observer.unobserve(targetRef.value);
        }
        
        // If skeleton was focused, transfer focus to real component when it loads
        if (wasFocused) {
          setTimeout(() => {
            // After loading, targetRef.value is a Vue component instance, not a DOM element
            // We need to access its $el property to get the DOM element
            const componentEl = targetRef.value?.$el;
            if (componentEl) {
              const realComponent = componentEl.querySelector('.publication-component');
              if (realComponent) {
                realComponent.focus();
              }
            }
          }, 10);
        }
      }
    }

    // Handle focus on skeleton (should behave like PublicationComponent)
    function handleFocus() {
      forceLoad();
      emit('activate', props.publication.doi);
    }

    // Handle click on skeleton  
    function handleClick(event) {
      event.stopPropagation();
      forceLoad();
      emit('activate', props.publication.doi);
    }

    // Handle keyboard events on skeleton
    function handleKeyDown(event) {
      // For Enter and Space, activate the publication
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!hasLoaded.value) {
          forceLoad();
        }
        emit('activate', props.publication.doi);
        return;
      }

      // For arrow keys, we need to ensure all publications are loaded so navigation works
      if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
        // Load this component if not loaded
        if (!hasLoaded.value) {
          forceLoad();
        }
        
        // Don't prevent default - let Keys.js handle the navigation
        // The Keys.js system should work now that we have the right DOM structure
        return;
      }

      // For any other keys, just load if needed
      if (!hasLoaded.value) {
        forceLoad();
      }
    }

</script>

<style lang="scss" scoped>
.publication-skeleton-wrapper {
  position: relative;
}

.publication-skeleton {
  display: flex;
  padding: 0.6rem;
  background: var(--bulma-white);
  border: 1px solid var(--bulma-border);
  margin-bottom: 0.5rem;
  animation: pulse 1.5s ease-in-out infinite alternate;
  cursor: pointer;
  outline-offset: -0.25rem;
  min-height: 5rem; // Match PublicationComponent min-height

  &:focus {
    outline: 1px solid var(--bulma-dark);
    animation-play-state: paused;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.03);
    animation-play-state: paused;
  }

  // Match PublicationComponent active state styling
  &.is-active {
    background: rgba(0, 0, 0, 0.1) !important;
    outline: 1px solid var(--bulma-dark);
    animation-play-state: paused;
  }

  &.is-selected {
    // Add selected styling if needed
  }

  &.is-linked-to-active {
    // Add linked styling if needed
  }

  .skeleton-glyph {
    width: 5rem;
    height: 5rem;
    background: var(--bulma-background);
    border-radius: 4px;
    margin-right: 0.6rem;
  }

  .skeleton-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  .skeleton-line {
    height: 1rem;
    background: var(--bulma-background);
    border-radius: 4px;

    &.skeleton-title {
      width: 80%;
      height: 1.2rem;
    }

    &.skeleton-author {
      width: 60%;
    }

    &.skeleton-year {
      width: 30%;
    }
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0.7;
  }
}
</style>