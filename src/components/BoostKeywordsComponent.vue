<template>
  <v-menu v-if="!isEmpty" v-model="isMenuOpen" location="bottom" transition="slide-y-transition"
    :close-on-content-click="false" @update:model-value="handleMenuToggle">
    <template v-slot:activator="{ props }">
      <v-btn class="boost-button" :class="interfaceStore.isMobile ? '' : 'p-1 pl-4'" 
        v-bind="props" :icon="interfaceStore.isMobile" @click="handleMenuInput(true)"
        :density="interfaceStore.isMobile ? 'compact' : 'default'">
        <v-icon size="18">mdi-chevron-double-up</v-icon>
        <span class="is-hidden-touch ml-2 boost-keywords-display">
          <span class="keywords-text" v-html="boostKeywordStringHtml ? boostKeywordStringHtml : '[Set keywords]'"
            :class="{ 'has-text-warning-dark': !boostKeywordStringHtml }"></span>
          <v-icon class="ml-2">
            mdi-menu-down
          </v-icon>
        </span>
      </v-btn>
    </template>
    <v-sheet class="has-background-warning-95 p-2 pt-4">
      <form @submit.prevent="sessionStore.updateScores">
        <v-text-field ref="boost" class="boost" density="compact" v-model="sessionStore.boostKeywordString"
          label="Keywords" variant="solo" append-inner-icon="mdi-close"
          @click:append-inner="sessionStore.setBoostKeywordString('')"
          hint="Use ',' to separate keywords, use '|' to discern alternatives/synonyms." persistent-hint>
          <template v-slot:append>
            <v-btn class="has-background-warning" @click="sessionStore.updateScores" height="47">
              <v-icon>mdi-chevron-double-up</v-icon>
            </v-btn>
          </template>
        </v-text-field>
        <v-checkbox v-model="sessionStore.isBoost" label="Boost scores" density="compact"
          hint="Each matched keyword in a title will double the score of a publication" persistent-hint
          @change="sessionStore.updateScores"></v-checkbox>
      </form>
    </v-sheet>
  </v-menu>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useSessionStore } from "@/stores/session.js"
import { useInterfaceStore } from "@/stores/interface.js"
import { useAppState } from "@/composables/useAppState.js"

const sessionStore = useSessionStore()
const interfaceStore = useInterfaceStore()
const { isEmpty } = useAppState()

const boost = ref(null)
const isMenuOpen = ref(false)
const initialKeywordString = ref('')

const boostKeywordStringHtml = computed(() => {
  let html = sessionStore.boostKeywordString
  // wrap comma seperated words in span.word
  html = html.replace(/\s*([^,|]+)/g, "<span class='word'>$1</span>")
  // wrap | in span.alt
  html = html.replace(/\|/g, "<span class='alt'>|</span>")
  // wrap , in span.comma
  html = html.replace(/,/g, "<span class='comma'>,</span>")
  return html
})


function handleMenuInput(value) {
  if (value) {
    nextTick(() => {
      boost.value?.focus()
    })
  }
}

function handleMenuToggle(isOpen) {
  if (isOpen) {
    // Menu is opening - store the initial value to compare later
    initialKeywordString.value = sessionStore.boostKeywordString
  } else {
    // Menu is closing - check if changes were made and update scores if needed
    const currentKeywordString = sessionStore.boostKeywordString
    if (currentKeywordString !== initialKeywordString.value) {
      sessionStore.updateScores()
    }
  }
}
</script>

<style lang="scss" scoped>
:deep(input) {
  text-transform: uppercase;
}

:deep(.v-input__append) {
  margin-inline-start: 0.5rem !important;

  & button {
    padding: 0 !important;
    min-width: 2rem;
  }
}

:deep(.word) {
  text-decoration: underline;
  text-decoration-color: hsl(48, 100%, 67%);
  text-decoration-thickness: 0.2rem;
}

:deep(.alt) {
  color: #aaa;
  margin-left: 0.1rem;
  margin-right: 0.1rem;
  font-weight: bold;
}

:deep(.comma) {
  color: #aaa;
  margin-left: 0.2rem;
  margin-right: 0.3rem;
  font-weight: bold;
}

.boost-button {
  flex: 0 1 auto; /* Don't grow, but allow shrinking when needed */
  min-width: 120px; /* Minimum width for usability */
  /* Remove max-width to allow natural expansion */
  
  :deep(.v-btn__content) {
    text-transform: none;
    overflow: hidden;
  }
  
  .boost-keywords-display {
    display: inline-flex;
    align-items: center;
    overflow: hidden;
    
    .keywords-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      /* Remove max-width to allow natural expansion until container forces truncation */
      min-width: 0;
    }
    
    /* Keep the dropdown icon fixed */
    .v-icon {
      flex: 0 0 auto;
      margin-left: 0.5rem !important;
    }
  }
  
  /* Mobile round button - force circle shape with correct size */
  &.v-btn--icon {
    flex: none !important; /* Remove all flex behavior */
    width: 28px !important; /* Correct compact density size */
    height: 28px !important;
    min-width: 28px !important;
    max-width: 28px !important;
    border-radius: 50% !important;
    
    :deep(.v-btn__content) {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      height: 100% !important;
    }
    
    :deep(.v-icon) {
      margin: 0 !important;
    }
  }
}

</style>