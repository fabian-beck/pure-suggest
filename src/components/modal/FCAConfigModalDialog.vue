<script setup>
import { ref, computed, watch } from 'vue'

import { useAppState } from '@/composables/useAppState.js'
import { FCAService } from '@/services/FCAService.js'
import { useFcaStore } from '@/stores/fca.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'
import { findKeywordMatches } from '@/utils/scoringUtils.js'

const sessionStore = useSessionStore()
const fcaStore = useFcaStore()
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

const previewText = computed(() => {
  if (!conceptsPreview.value || conceptsPreview.value.length === 0) {
    return 'No concepts to preview. Click "Compute Concepts" to generate results.'
  }

  const sortedConcepts = sortedConceptsPreview.value
  const conceptsToShow = sortedConcepts.slice(0, 10)
  const totalCount = conceptsPreview.value.length

  let text = ''

  if (totalCount > 10) {
    text += `Top 10 concepts (${totalCount} total)\n`
  } else {
    text += `${totalCount} concepts found\n`
  }

  text += `${'═'.repeat(80)}\n\n`

  conceptsToShow.forEach((concept, index) => {
    const pubCount = concept.publications.length
    const attrCount = concept.attributes.length

    const keywords = concept.attributes.filter((attr) => !attr.startsWith('10.'))
    const citations = concept.attributes.filter((attr) => attr.startsWith('10.'))

    const metadata = conceptMetadataPreview.value.get(index)
    const conceptName = metadata?.name || `C${index + 1}`

    text += `${conceptName}:\n`
    text += `  Importance: ${concept.importance} (${pubCount} publications × ${attrCount} attributes)\n`
    text += `  Remaining Importance: ${concept.remainingImportance}\n`
    text += `  Publications (${pubCount}): ${pubCount === 0 ? '∅' : concept.publications.join(', ')}\n`
    text += `  Keywords (${keywords.length}): ${keywords.length === 0 ? '∅' : keywords.join(', ')}\n`
    text += `  Citations (${citations.length}): ${citations.length === 0 ? '∅' : citations.join(', ')}\n`

    if (metadata?.topTerms && metadata.topTerms.length > 0) {
      const termString = metadata.topTerms.map((t) => `${t.term} (${t.score.toFixed(2)})`).join(', ')
      text += `  Top Terms: ${termString}\n`
    }

    text += '\n'
  })

  return text
})

function computeConcepts() {
  if (!canCompute.value) return

  // Build context based on selected attributes
  const publications = sessionStore.selectedPublications
  const boostKeywords = includeKeywords.value ? sessionStore.uniqueBoostKeywords : []

  let concepts
  if (includeCitations.value) {
    // Use normal computation with citations
    concepts = FCAService.computeFormalConcepts(publications, boostKeywords)
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

    concepts = context.attributes.length > 0 ? FCAService._extractFormalConcepts(context) : []
  }

  conceptsPreview.value = concepts
  sortedConceptsPreview.value = FCAService.sortConceptsByImportance(concepts)
  conceptMetadataPreview.value = FCAService.generateConceptNames(
    sortedConceptsPreview.value,
    publications
  )
}

function applyConcepts() {
  if (conceptsPreview.value.length === 0) return

  // Store the computed concepts in the FCA store
  fcaStore.concepts = conceptsPreview.value
  fcaStore.sortedConcepts = sortedConceptsPreview.value
  fcaStore.conceptMetadata = conceptMetadataPreview.value

  // Apply tags to publications
  fcaStore.assignConceptTagsToPublications(sessionStore.selectedPublications)

  if (sessionStore.suggestedPublications.length > 0) {
    fcaStore.assignConceptTagsToPublications(sessionStore.suggestedPublications)
  }

  // Update scores to reflect new concept tags
  updateScores()

  isEnabled.value = true
  modalStore.isFcaConfigModalDialogShown = false
}

function disableConcepts() {
  fcaStore.clear()

  // Clear concept tags from all publications
  sessionStore.selectedPublications.forEach((pub) => {
    pub.fcaConcepts = null
    pub.fcaConceptMetadata = null
  })

  sessionStore.suggestedPublications.forEach((pub) => {
    pub.fcaConcepts = null
    pub.fcaConceptMetadata = null
  })

  updateScores()

  isEnabled.value = false
  conceptsPreview.value = []
  sortedConceptsPreview.value = []
  conceptMetadataPreview.value = new Map()
  modalStore.isFcaConfigModalDialogShown = false
}

// Initialize state from existing concepts
watch(
  () => modalStore.isFcaConfigModalDialogShown,
  (newValue) => {
    if (newValue) {
      isEnabled.value = fcaStore.hasConcepts
      if (fcaStore.hasConcepts) {
        conceptsPreview.value = fcaStore.concepts
        sortedConceptsPreview.value = fcaStore.sortedConcepts
        conceptMetadataPreview.value = fcaStore.conceptMetadata
      }
    }
  }
)
</script>

<template>
  <ModalDialog
    header-color="primary"
    title="Formal Concept Analysis"
    icon="mdi-group"
    v-model="modalStore.isFcaConfigModalDialogShown"
  >
    <template #sticky>
      <v-sheet class="has-background-primary-95 pa-3">
        <p class="mb-3">
          Configure and compute formal concepts to cluster selected publications based on shared
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

    <div class="content pa-3">
      <h3 class="is-size-6 mb-2"><b>Preview:</b></h3>
      <pre class="concept-preview">{{ previewText }}</pre>
    </div>
  </ModalDialog>
</template>

<style scoped lang="scss">
.concept-preview {
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  max-height: 60vh;
  overflow-y: auto;
}
</style>
