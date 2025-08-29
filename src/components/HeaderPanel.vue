<template>
  <div>
    <v-app-bar color="white" density="compact">
      <v-icon class="mr-1" :size="interfaceStore.isMobile ? 24 : 32">mdi-water-plus-outline</v-icon>
      <v-app-bar-title>
        <div class="app-name" v-html="appMeta.nameHtml"></div>
        <div class="session-state">
          <v-menu v-if="!isEmpty" location="bottom" transition="slide-y-transition">
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" :icon="interfaceStore.isMobile"
                :density="interfaceStore.isMobile ? 'compact' : 'default'"
                class="session-state-button">
                <v-icon size="18">mdi-text-box-multiple-outline</v-icon>
                <span class="is-hidden-touch ml-2">
                  {{ sessionStateString }}
                  <v-icon class="ml-2">
                    mdi-menu-down
                  </v-icon>
                </span>
              </v-btn>
            </template>
            <v-list>
              <v-list-item class="is-hidden-desktop">
                {{ sessionStateString }}
              </v-list-item>
              <v-list-item prepend-icon="mdi-minus-thick" @click="interfaceStore.isExcludedModalDialogShown = true"
                title="Excluded publications" v-if="sessionStore.excludedPublicationsCount > 0">
              </v-list-item>
              <v-list-item prepend-icon="mdi-export" @click="sessionStore.exportSession"
                title="Export selected as JSON" />
              <v-list-item prepend-icon="mdi-export" @click="sessionStore.exportAllBibtex"
                title="Export selected as BibTeX" />
              <v-list-item prepend-icon="mdi-delete" @click="clearSession" class="has-text-danger"
                title="Clear session" />
            </v-list>
          </v-menu>
          <BoostKeywordsComponent />
          <FilterMenuComponent ref="filterMenuComponent" />
        </div>
      </v-app-bar-title>
      <v-menu bottom left offset-y transition="slide-y-transition">
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props" class="mr-1" density="compact">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item>
            <HeaderExternalLinks />
          </v-list-item>
          <v-list-item prepend-icon="mdi-keyboard-outline"
            @click="interfaceStore.isKeyboardControlsModalDialogShown = true" class="is-hidden-touch"
            title="Keyboard controls" />
          <v-list-item prepend-icon="mdi-information-outline" @click="interfaceStore.isAboutModalDialogShown = true"
            title="About" />
          <v-list-item prepend-icon="mdi-cached" @click="clearCache" class="has-text-danger"
            title="Clear cache (and session)" />
        </v-list>
      </v-menu>
    </v-app-bar>
    <div class="columns intro-message" v-if="isEmpty">
      <div class="column">
        <div class="subtitle level-item mt-2">
          {{ appMeta.subtitle }}
        </div>
      </div>
      <div class="column is-two-thirds">
        <div class="notification has-text-centered p-2" v-show="isEmpty">
          <p>
            Based on a set of selected publications,
            <b class="has-text-info">suggest</b>ing related
            <b class="has-text-primary">pu</b>blications connected by
            <b class="has-text-primary">re</b>ferences.
          </p>
        </div>
      </div>
    </div>
    <div v-else class="intro-message-placeholder"></div>
  </div>
</template>

<script setup>
import { computed, inject, ref } from 'vue'
import { useSessionStore } from "@/stores/session.js"
import { useInterfaceStore } from "@/stores/interface.js"
import FilterMenuComponent from "@/components/FilterMenuComponent.vue"
import { useAppState } from "@/composables/useAppState.js"

const appMeta = inject("appMeta")
const sessionStore = useSessionStore()
const interfaceStore = useInterfaceStore()
const { isEmpty, clearSession, clearCache } = useAppState()

const filterMenuComponent = ref(null)

const sessionStateString = computed(() => {
  return `${sessionStore.selectedPublicationsCount} selected${sessionStore.excludedPublicationsCount
    ? `; ${sessionStore.excludedPublicationsCount} excluded`
    : ""}`
})
</script>

<style lang="scss" scoped>
.v-toolbar {
  position: relative !important;
  z-index: 3000 !important;
  width: 100vw !important;
  max-width: 100vw !important;
  overflow: hidden !important;

  & :deep(.v-toolbar__content) {
    padding: 0 0.5vw;

    & .v-app-bar-title {
      margin-left: 0;

      &>div {
        height: 48px;
        display: flex;

        & .app-name {
          font-size: 1.5rem;
          font-weight: 600;
          padding-top: 10px;
        }

        & .session-state {
          margin-top: 6px;
          margin-left: 1vw;
          display: flex;
          align-items: center;
          flex: 1; /* Take available space to allow natural expansion */
          min-width: 0; /* Allow flex items to shrink below their content size */
          overflow: hidden;
          gap: 1vw; /* Modern gap instead of margins */

          /* Session state button - never shrink, always readable */
          & .session-state-button {
            flex: 0 0 auto; /* Fixed size, never shrink */
            
            /* Reduce excess padding on desktop */
            &:not(.v-btn--icon) {
              padding-left: 8px !important;
              padding-right: 8px !important;
              min-width: auto !important;
            }
          }
          
          /* Boost keywords - can shrink when needed on desktop, fixed on mobile */
          & .boost-button {
            flex: 0 1 auto; /* Natural size but can shrink under pressure */
            
            /* Mobile: completely remove from flex layout to maintain circle */
            &.v-btn--icon {
              flex: none !important; /* Not part of flex layout on mobile */
            }
          }
          
          /* Filter button - fixed size */
          &>button:last-child {
            flex: 0 0 auto; /* Fixed size, never shrink */
          }
        }
      }
    }
  }
}

.intro-message,
.intro-message-placeholder {
  margin-top: 0.5rem;

  & .column {
    margin: var(--bulma-block-spacing, 1.5rem);
  }
}

@media screen and (max-width: 1023px) {
  :deep(.app-name) {
    font-size: 1.2rem !important;
  }
}
</style>