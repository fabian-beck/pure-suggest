<script setup>
import { computed, nextTick, watch, ref, onMounted, onBeforeUnmount } from 'vue'

import LazyPublicationComponent from './LazyPublicationComponent.vue'

import { scrollToTargetAdjusted } from '@/lib/Util.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useSessionStore } from '@/stores/session.js'

const props = defineProps({
  publications: {
    type: Array,
    default: () => []
  },
  showSectionHeaders: {
    type: Boolean,
    default: false
  },
  publicationType: {
    type: String,
    default: 'general',
    validator: (value) => ['selected', 'suggested', 'general'].includes(value)
  }
})
const emit = defineEmits(['activate'])
const sessionStore = useSessionStore()
const interfaceStore = useInterfaceStore()

const publicationsWithHeaders = computed(() => {
  // Don't show headers if filtering is not active for this publication type
  const isFilteringApplied =
    sessionStore.filter.hasActiveFilters() &&
    ((props.publicationType === 'selected' && sessionStore.filter.applyToSelected) ||
      (props.publicationType === 'suggested' && sessionStore.filter.applyToSuggested))

  if (!props.showSectionHeaders || !isFilteringApplied) {
    return props.publications.map((publication) => ({
      type: 'publication',
      publication,
      key: publication.doi
    }))
  }

  // Optimized: single pass through publications, evaluate filter once per publication
  const result = []
  const filteredPublications = []
  const nonFilteredPublications = []

  // Single iteration with filter evaluation cached
  for (const publication of props.publications) {
    if (sessionStore.filter.matches(publication)) {
      filteredPublications.push(publication)
    } else {
      nonFilteredPublications.push(publication)
    }
  }

  // Add filtered publications with header
  if (filteredPublications.length > 0) {
    result.push({
      type: 'header',
      text: `<i class="mdi mdi-filter"></i> Filtered (${filteredPublications.length})`,
      key: 'filtered-header'
    })

    for (const publication of filteredPublications) {
      result.push({
        type: 'publication',
        publication,
        key: publication.doi
      })
    }
  }

  // Add non-filtered publications with header
  if (nonFilteredPublications.length > 0) {
    result.push({
      type: 'header',
      text: `Other publications (${nonFilteredPublications.length})`,
      key: 'non-filtered-header'
    })

    for (const publication of nonFilteredPublications) {
      result.push({
        type: 'publication',
        publication,
        key: publication.doi
      })
    }
  }

  return result
})

// Reactive data
const onNextActivatedScroll = ref(true)
const lastScrollTime = ref(0)
const userIsScrolling = ref(false)

// Watch for publications changes
watch(
  () => props.publications,
  (newPublications, oldPublications) => {
    if (!oldPublications || newPublications.length !== oldPublications.length) {
      nextTick(scrollToActivated)
    }
  },
  { deep: true }
)
// Lifecycle with cleanup
let scrollTimeout
let scrollHandler

onMounted(() => {
  scrollHandler = () => {
    userIsScrolling.value = true
    lastScrollTime.value = Date.now()

    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      userIsScrolling.value = false
    }, 150)
  }

  window.addEventListener('scroll', scrollHandler)
})

onBeforeUnmount(() => {
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler)
  }
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
})

// Methods
function activatePublication(doi) {
  onNextActivatedScroll.value = false
  emit('activate', doi)
}

function handleDelegatedClick(event) {
  const publicationComponent = findPublicationElement(event.target)
  if (publicationComponent) {
    publicationComponent.click()
  }
}

function handleDelegatedMouseEnter(event) {
  const publicationElement = findPublicationElement(event.target)
  if (publicationElement) {
    const doi = publicationElement.id
    const publication = props.publications.find((p) => p.doi === doi)
    if (publication) {
      sessionStore.hoverPublication(publication, true)
    }
  }
}

function handleDelegatedMouseLeave(event) {
  const publicationElement = findPublicationElement(event.target)
  if (publicationElement) {
    const doi = publicationElement.id
    const publication = props.publications.find((p) => p.doi === doi)
    if (publication) {
      sessionStore.hoverPublication(publication, false)
    }
  }
}

function findPublicationElement(target) {
  let element = target
  while (element) {
    if (element.classList?.contains('publication-component')) {
      return element
    }
    element = element.parentElement
  }
  return null
}

function scrollToActivated() {
  const timeSinceLastScroll = Date.now() - lastScrollTime.value
  if (userIsScrolling.value || timeSinceLastScroll < 1000) {
    onNextActivatedScroll.value = true
    return
  }

  if (onNextActivatedScroll.value) {
    setTimeout(() => {
      const publicationComponent = document.getElementsByClassName('is-active')[0]
      if (publicationComponent) {
        if (window.innerWidth <= 1023) {
          scrollToTargetAdjusted(publicationComponent, 65)
        } else {
          publicationComponent.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        }
      }
    }, 100)
  } else {
    onNextActivatedScroll.value = true
  }
}
</script>

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
        <h3
          class="section-header-text"
          :class="{ 'info-theme': publicationType === 'suggested' }"
          v-html="item.text"
        ></h3>
      </li>
      <LazyPublicationComponent
        v-else
        :publication="item.publication"
        :publication-type="publicationType"
        :is-mobile="interfaceStore.isMobile"
        @activate="activatePublication"
      />
    </template>
  </ul>
</template>

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
  height: 100%;
  flex: 1;
}
</style>
