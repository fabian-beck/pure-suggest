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
  { deep: false }
)

// Detect user scroll
function onUserScroll() {
  lastScrollTime.value = Date.now()
  userIsScrolling.value = true
  setTimeout(() => {
    userIsScrolling.value = false
  }, 1000)
}

// Watch for scroll events to detect user scrolling
onMounted(() => {
  window.addEventListener('scroll', onUserScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onUserScroll)
})

function activatePublication(publication, publicationElement, e) {
  emit('activate', publication, publicationElement, e)
  onNextActivatedScroll.value = true
}

// DOM event handling - find closest publication element
function findPublicationElement(target) {
  let element = target
  while (element && !element.classList.contains('publication-component')) {
    element = element.parentElement
  }
  return element
}

function handleDelegatedClick(event) {
  const publicationElement = findPublicationElement(event.target)
  if (publicationElement) {
    const publicationComponent = publicationElement
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
    }, 150) // Increased delay to account for expansion
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
    background: lighten(#363636, 10%);
    color: white;
    padding: 0.8rem 1rem;
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &.info-theme {
      background: #3e8ed0;
    }

    :deep(.mdi) {
      font-size: 1.1rem;
    }
  }
}

.publication-list.empty-list {
  height: 100%;
  flex: 1;
}
</style>