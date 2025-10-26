<script setup>
import { ref, computed, watch } from 'vue'

import { useAppState } from '@/composables/useAppState.js'
import { ConceptService } from '@/services/ConceptService.js'
import { useAuthorStore } from '@/stores/author.js'
import { useConceptStore } from '@/stores/concept.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'
import { calculateAuthorColor } from '@/utils/authorColor.js'

const sessionStore = useSessionStore()
const conceptStore = useConceptStore()
const modalStore = useModalStore()
const authorStore = useAuthorStore()
const { updateScores } = useAppState()

function openAuthorDialog(authorId) {
  authorStore.setActiveAuthor(authorId)
  modalStore.isConceptConfigModalDialogShown = false
  modalStore.isAuthorModalDialogShown = true
}

const includeKeywords = ref(true)
const includeCitations = ref(true)
const includeAuthors = ref(true)
const isEnabled = ref(false)

const conceptsPreview = computed(() => conceptStore.previewConcepts)
const sortedConceptsPreview = computed(() => conceptStore.previewSortedConcepts)
const conceptMetadataPreview = computed(() => conceptStore.previewConceptMetadata)

const canCompute = computed(() => {
  return (includeKeywords.value || includeCitations.value || includeAuthors.value) &&
         sessionStore.selectedPublicationsCount > 0
})

const hasPreview = computed(() => {
  return conceptsPreview.value && conceptsPreview.value.length > 0
})

const hasFilteredConcepts = computed(() => {
  return sortedConceptsPreview.value && sortedConceptsPreview.value.length > 0
})

const conceptsToShow = computed(() => {
  if (!hasFilteredConcepts.value) return []
  return sortedConceptsPreview.value
})

const totalConceptCount = computed(() => {
  return sortedConceptsPreview.value?.length || 0
})

const previewTitle = computed(() => {
  if (totalConceptCount.value > 0) {
    return `${totalConceptCount.value} concept${totalConceptCount.value > 1 ? 's' : ''} found`
  }
  return ''
})

function getConceptKeywords(concept) {
  return concept.attributes.filter((attr) => attr.type === 'keyword').map((attr) => attr.value)
}

function getConceptCitations(concept) {
  return concept.attributes.filter((attr) => attr.type === 'citation').map((attr) => attr.value)
}

function getConceptAuthors(concept) {
  return concept.attributes.filter((attr) => attr.type === 'author').map((attr) => attr.value)
}

function getAuthorDisplayName(authorId) {
  // Find the author in sessionStore's computed authors
  const authors = sessionStore.selectedPublications
    .flatMap((pub) => {
      if (!pub.authorOrcid) return []
      return pub.authorOrcid.split('; ').map((authorString) => {
        const cleaned = authorString.replace(/(,\s+)(\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx])/g, '')
        return { id: authorId, name: cleaned }
      })
    })
    .find((author) => {
      // Normalize the author name to match the ID
      const normalizedName = author.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[øØ]/g, 'o')
        .replace(/[åÅ]/g, 'a')
        .replace(/[æÆ]/g, 'ae')
        .replace(/[ðÐ]/g, 'd')
        .replace(/[þÞ]/g, 'th')
        .replace(/[ßẞ]/g, 'ss')
        .toLowerCase()
      return normalizedName === authorId
    })

  return authors?.name || authorId
}

function getAuthorChipStyle(authorId) {
  const author = authorStore.selectedPublicationsAuthors.find(a => a.id === authorId)

  if (!author) {
    return {
      backgroundColor: 'hsla(270, 70%, 85%, 0.3)'
    }
  }

  const authorColor = calculateAuthorColor(author.score, authorStore)
  const lightnessMatch = authorColor.match(/hsl\(0, 0%, (\d+)%\)/)
  const lightness = lightnessMatch ? parseInt(lightnessMatch[1], 10) : 70

  return {
    backgroundColor: `hsla(0, 0%, ${lightness}%, 0.8)`,
    color: '#ffffff'
  }
}

function getCitationTooltip(doi) {
  const pub = sessionStore.selectedPublications.find((p) => p.doi === doi)
  if (!pub) return doi

  const authorInfo = pub.authorShort || 'Unknown authors'
  const year = pub.year || 'n.d.'
  return `<b>${pub.title || 'Untitled'}</b> (${authorInfo}, ${year})`
}

function getConceptName(index) {
  const metadata = conceptMetadataPreview.value.get(index)
  return metadata?.name || `C${index + 1}`
}

function getConceptCharacteristicTerms(index) {
  const metadata = conceptMetadataPreview.value.get(index)
  return metadata?.exclusivityTerms || []
}

function formatTermScore(term) {
  return term.score.toFixed(2)
}

function getCharacteristicTooltip(term) {
  return `Characteristic score of <b>${term.score.toFixed(2)} = ${term.inCount} / (${term.outCount} + 1)</b>, ` +
         `where <b>${term.inCount}</b> occurrences in concept titles ` +
         `and <b>${term.outCount}</b> occurrences outside concept`
}

function computeConcepts() {
  if (!canCompute.value) return

  const publications = sessionStore.selectedPublications
  const boostKeywords = includeKeywords.value ? sessionStore.uniqueBoostKeywords : []

  const concepts = ConceptService.computeConcepts(publications, boostKeywords, {
    includeCitations: includeCitations.value,
    includeAuthors: includeAuthors.value
  })

  conceptStore.previewConcepts = concepts
  conceptStore.previewSortedConcepts = ConceptService.sortConceptsByImportance(concepts, publications.length)
  conceptStore.previewConceptMetadata = ConceptService.generateConceptNames(
    conceptStore.previewSortedConcepts,
    publications
  )
}

function applyConcepts() {
  if (conceptsPreview.value.length === 0) return

  // Move preview to active concepts
  conceptStore.concepts = conceptStore.previewConcepts
  conceptStore.sortedConcepts = conceptStore.previewSortedConcepts
  conceptStore.conceptMetadata = conceptStore.previewConceptMetadata

  // Clear preview after applying
  conceptStore.clearPreview()

  // Apply tags to publications
  conceptStore.assignConceptTagsToPublications(sessionStore.selectedPublications)

  if (sessionStore.suggestedPublications.length > 0) {
    conceptStore.assignConceptTagsToPublications(sessionStore.suggestedPublications)
  }

  // Update scores to reflect new concept tags (keep preview during this operation)
  updateScores(true)

  isEnabled.value = true
  modalStore.isConceptConfigModalDialogShown = false
}

function disableConcepts() {
  conceptStore.clear()
  conceptStore.clearPreview()

  // Clear concept tags from all publications
  sessionStore.selectedPublications.forEach((pub) => {
    pub.concepts = null
    pub.conceptMetadata = null
  })

  sessionStore.suggestedPublications.forEach((pub) => {
    pub.concepts = null
    pub.conceptMetadata = null
  })

  updateScores(true)

  isEnabled.value = false
  modalStore.isConceptConfigModalDialogShown = false
}

// Initialize state from existing concepts
watch(
  () => modalStore.isConceptConfigModalDialogShown,
  (newValue) => {
    if (newValue) {
      isEnabled.value = conceptStore.hasConcepts
      // If concepts are applied but no preview exists, show them in preview
      if (conceptStore.hasConcepts && !conceptStore.hasPreview) {
        conceptStore.previewConcepts = conceptStore.concepts
        conceptStore.previewSortedConcepts = conceptStore.sortedConcepts
        conceptStore.previewConceptMetadata = conceptStore.conceptMetadata
      }
      // Preview state persists automatically via store
    }
  }
)
</script>

<template>
  <ModalDialog
    header-color="primary"
    title="Concept Analysis"
    icon="mdi-group"
    v-model="modalStore.isConceptConfigModalDialogShown"
  >
    <template #sticky>
      <v-sheet class="has-background-primary-95 pa-3">
        <div class="d-flex flex-wrap align-center ga-2">
          <span>Compute concepts based on shared <b>attributes</b>:</span>
          <v-checkbox
            v-model="includeKeywords"
            label="Keywords"
            density="compact"
            hide-details
          ></v-checkbox>
          <v-checkbox
            v-model="includeCitations"
            label="Citations"
            density="compact"
            hide-details
          ></v-checkbox>
          <v-checkbox
            v-model="includeAuthors"
            label="Authors"
            density="compact"
            hide-details
          ></v-checkbox>
          <v-spacer></v-spacer>
          <v-btn
            :disabled="!canCompute"
            @click="computeConcepts"
            size="small"
            prepend-icon="mdi-play"
            class="has-background-primary has-text-white"
          >
            Compute
          </v-btn>

          <v-btn
            :disabled="conceptsPreview.length === 0"
            @click="applyConcepts"
            size="small"
            prepend-icon="mdi-check"
            class="has-background-primary has-text-white"
          >
            Apply
          </v-btn>

          <v-btn
            :disabled="!isEnabled && conceptsPreview.length === 0"
            @click="disableConcepts"
            size="small"
            prepend-icon="mdi-close"
            class="has-background-primary-90"
          >
            Disable
          </v-btn>
        </div>
      </v-sheet>
    </template>

    <div class="content">
      <section>
        <div v-if="!hasPreview" class="pa-3 text-center empty-state">
          <v-icon size="large" class="mb-2">mdi-information-outline</v-icon>
          <p>No concepts to preview. Click "Compute Concepts" to generate results.</p>
        </div>

        <div v-else-if="hasPreview && !hasFilteredConcepts" class="pa-3 text-center empty-state">
          <v-icon size="large" class="mb-2" color="warning">mdi-filter-outline</v-icon>
          <p>
            <strong>No meaningful concepts found.</strong><br>
            <template v-if="sessionStore.selectedPublicationsCount < 6">
              You need at least <b>6 selected publications</b> to form concepts (current: {{ sessionStore.selectedPublicationsCount }}).<br>
              Concepts require 3+ publications and must not exceed half of your selection.
            </template>
            <template v-else>
              Concepts require <b>3-{{ Math.floor(sessionStore.selectedPublicationsCount / 2) }} publications</b> and <b>1+ shared attributes</b>.<br>
              Try enabling additional attribute types or adjusting your boost keywords.
            </template>
          </p>
        </div>

        <div v-else>
          <div class="pa-3 pb-2">
            <h3 class="is-size-6"><b>{{ previewTitle }}</b></h3>
          </div>

          <ul class="concept-list">
            <li
              v-for="(concept, index) in conceptsToShow"
              :key="index"
              class="media p-3 m-0 concept-item"
            >
              <div class="media-left concept-icon">
                <v-icon size="large">mdi-group</v-icon>
              </div>
              <div class="media-content">
                <div class="content">
                  <div class="mb-2">
                    <b class="concept-name">{{ getConceptName(index) }}</b>
                  </div>
                  <div class="mb-2 is-size-7">
                    <b>{{ concept.publications.length }}</b> publication{{ concept.publications.length > 1 ? 's' : '' }}
                    &bull;
                    <b>{{ concept.attributes.length }}</b> attribute{{ concept.attributes.length > 1 ? 's' : '' }}
                    &bull;
                    Importance: <b>{{ concept.importance }}</b>
                    (remaining: <b>{{ concept.remainingImportance }}</b>)
                  </div>

                  <div v-if="getConceptKeywords(concept).length > 0" class="mb-2 is-size-7">
                    <span class="attribute-label">Keywords:</span>
                    <v-chip
                      v-for="keyword in getConceptKeywords(concept)"
                      :key="keyword"
                      size="small"
                      label
                      class="ma-1 keyword-chip"
                    >
                      {{ keyword }}
                    </v-chip>
                  </div>

                  <div v-if="getConceptCitations(concept).length > 0" class="mb-2 is-size-7">
                    <span class="attribute-label">Citations:</span>
                    <v-chip
                      v-for="citation in getConceptCitations(concept)"
                      :key="citation"
                      v-tippy="getCitationTooltip(citation)"
                      size="small"
                      label
                      class="ma-1 citation-chip"
                    >
                      {{ citation }}
                    </v-chip>
                  </div>

                  <div v-if="getConceptAuthors(concept).length > 0" class="mb-2 is-size-7">
                    <span class="attribute-label">Authors:</span>
                    <v-chip
                      v-for="author in getConceptAuthors(concept)"
                      :key="author"
                      size="small"
                      label
                      class="ma-1 author-chip clickable-chip"
                      :style="getAuthorChipStyle(author)"
                      @click.stop="openAuthorDialog(author)"
                    >
                      {{ getAuthorDisplayName(author) }}
                    </v-chip>
                  </div>

                  <div v-if="getConceptCharacteristicTerms(index).length > 0" class="is-size-7">
                    <span class="attribute-label">Characteristic terms:</span>
                    <v-chip
                      v-for="term in getConceptCharacteristicTerms(index)"
                      :key="term.term"
                      v-tippy="getCharacteristicTooltip(term)"
                      size="small"
                      label
                      class="ma-1 term-chip"
                    >
                      {{ term.term.toUpperCase() }} ({{ formatTermScore(term) }})
                    </v-chip>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </ModalDialog>
</template>

<style scoped lang="scss">
.empty-state {
  color: rgba(0, 0, 0, 0.6);
  padding: 3rem 1rem;
}

.concept-list {
  list-style-type: none;
  padding: 0;
  margin: 0;

  .concept-item {
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }

    .media-left {
      min-width: 4rem;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .concept-name {
      font-size: 1rem;
      color: var(--v-primary-base);
    }

    .attribute-label {
      font-weight: 600;
      margin-right: 0.5rem;
    }

    .keyword-chip {
      background-color: hsla(48, 100%, 67%, 0.3) !important;
    }

    .citation-chip {
      background-color: hsla(0, 0%, 70%, 0.3) !important;
      font-family: monospace;
      font-size: 0.7rem;
    }

    .term-chip {
      background-color: hsla(180, 100%, 85%, 0.3) !important;
    }

    .clickable-chip {
      cursor: pointer;

      &:hover {
        opacity: 0.8;
      }
    }
  }
}
</style>
