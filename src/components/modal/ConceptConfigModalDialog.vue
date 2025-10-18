<script setup>
import { ref, computed, watch } from 'vue'

import { useAppState } from '@/composables/useAppState.js'
import { ConceptService } from '@/services/ConceptService.js'
import { useConceptStore } from '@/stores/concept.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'
import { findKeywordMatches } from '@/utils/scoringUtils.js'

const sessionStore = useSessionStore()
const conceptStore = useConceptStore()
const modalStore = useModalStore()
const { updateScores } = useAppState()

const includeKeywords = ref(true)
const includeCitations = ref(true)
const isEnabled = ref(false)

const conceptsPreview = ref([])
const sortedConceptsPreview = ref([])
const conceptMetadataPreview = ref(new Map())

const canCompute = computed(() => {
  return (includeKeywords.value || includeCitations.value) &&
         sessionStore.selectedPublicationsCount > 0
})

const hasPreview = computed(() => {
  return conceptsPreview.value && conceptsPreview.value.length > 0
})

const conceptsToShow = computed(() => {
  if (!hasPreview.value) return []
  return sortedConceptsPreview.value.slice(0, 10)
})

const totalConceptCount = computed(() => {
  return sortedConceptsPreview.value?.length || 0
})

const previewTitle = computed(() => {
  if (totalConceptCount.value > 10) {
    return `Top 10 concepts (${totalConceptCount.value} total)`
  } else if (totalConceptCount.value > 0) {
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

function getCitationTooltip(doi) {
  const pub = sessionStore.selectedPublications.find((p) => p.doi === doi)
  if (!pub) return doi

  const authorInfo = pub.authorShort || 'Unknown authors'
  return `${pub.title || 'Untitled'} (${authorInfo})`
}

function getConceptName(index) {
  const metadata = conceptMetadataPreview.value.get(index)
  return metadata?.name || `C${index + 1}`
}

function getConceptTopTerms(index) {
  const metadata = conceptMetadataPreview.value.get(index)
  return metadata?.topTerms || []
}

function computeConcepts() {
  if (!canCompute.value) return

  // Build context based on selected attributes
  const publications = sessionStore.selectedPublications
  const boostKeywords = includeKeywords.value ? sessionStore.uniqueBoostKeywords : []

  let concepts
  if (includeCitations.value) {
    // Use normal computation with citations
    concepts = ConceptService.computeConcepts(publications, boostKeywords)
  } else {
    // Build context without citations (keywords only)
    const context = {
      publications: publications.map((pub) => pub.doi),
      attributes: boostKeywords,
      matrix: []
    }

    // Build matrix with keywords only
    publications.forEach((publication) => {
      const row = []
      const matches = findKeywordMatches(publication.title, boostKeywords)
      const matchedKeywords = matches.map((match) => match.keyword)

      boostKeywords.forEach((keyword) => {
        row.push(matchedKeywords.includes(keyword))
      })

      context.matrix.push(row)
    })

    concepts = context.attributes.length > 0 ? ConceptService._extractConcepts(context) : []
  }

  conceptsPreview.value = concepts
  sortedConceptsPreview.value = ConceptService.sortConceptsByImportance(concepts)
  conceptMetadataPreview.value = ConceptService.generateConceptNames(
    sortedConceptsPreview.value,
    publications
  )
}

function applyConcepts() {
  if (conceptsPreview.value.length === 0) return

  // Store the computed concepts in the concept store
  conceptStore.concepts = conceptsPreview.value
  conceptStore.sortedConcepts = sortedConceptsPreview.value
  conceptStore.conceptMetadata = conceptMetadataPreview.value

  // Apply tags to publications
  conceptStore.assignConceptTagsToPublications(sessionStore.selectedPublications)

  if (sessionStore.suggestedPublications.length > 0) {
    conceptStore.assignConceptTagsToPublications(sessionStore.suggestedPublications)
  }

  // Update scores to reflect new concept tags
  updateScores()

  isEnabled.value = true
  modalStore.isConceptConfigModalDialogShown = false
}

function disableConcepts() {
  conceptStore.clear()

  // Clear concept tags from all publications
  sessionStore.selectedPublications.forEach((pub) => {
    pub.concepts = null
    pub.conceptMetadata = null
  })

  sessionStore.suggestedPublications.forEach((pub) => {
    pub.concepts = null
    pub.conceptMetadata = null
  })

  updateScores()

  isEnabled.value = false
  conceptsPreview.value = []
  sortedConceptsPreview.value = []
  conceptMetadataPreview.value = new Map()
  modalStore.isConceptConfigModalDialogShown = false
}

// Initialize state from existing concepts
watch(
  () => modalStore.isConceptConfigModalDialogShown,
  (newValue) => {
    if (newValue) {
      isEnabled.value = conceptStore.hasConcepts
      if (conceptStore.hasConcepts) {
        conceptsPreview.value = conceptStore.concepts
        sortedConceptsPreview.value = conceptStore.sortedConcepts
        conceptMetadataPreview.value = conceptStore.conceptMetadata
      } else {
        conceptsPreview.value = []
        sortedConceptsPreview.value = []
        conceptMetadataPreview.value = new Map()
      }
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
        <p class="mb-3">
          Configure and compute concepts to cluster selected publications based on shared
          attributes.
        </p>

        <div class="mb-3">
          <h3 class="is-size-6 mb-2"><b>Attributes to consider:</b></h3>
          <v-checkbox
            v-model="includeKeywords"
            label="Boost keywords"
            density="compact"
            hide-details
          ></v-checkbox>
          <v-checkbox
            v-model="includeCitations"
            label="Citation relationships"
            density="compact"
            hide-details
          ></v-checkbox>
        </div>

        <div class="d-flex ga-2">
          <v-btn
            :disabled="!canCompute"
            @click="computeConcepts"
            size="small"
            prepend-icon="mdi-play"
            class="has-background-primary has-text-white"
          >
            Compute Concepts
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
                <v-icon size="large" color="primary">mdi-group</v-icon>
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

                  <div v-if="getConceptTopTerms(index).length > 0" class="is-size-7">
                    <span class="attribute-label">Top terms:</span>
                    <v-chip
                      v-for="term in getConceptTopTerms(index).slice(0, 5)"
                      :key="term.term"
                      size="small"
                      label
                      class="ma-1 term-chip"
                    >
                      {{ term.term }} ({{ term.score.toFixed(2) }})
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
  }
}
</style>
