<template>
  <div>
    <v-app-bar color="white" density="compact">
      <v-icon class="mr-1" :size="interfaceStore.isMobile ? 24 : 32">mdi-water-plus-outline</v-icon>
      <v-app-bar-title>
        <div class="app-name" v-html="appMeta.nameHtml"></div>
        <div class="session-state">
          <v-menu v-if="!sessionStore.isEmpty" location="bottom" transition="slide-y-transition">
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" :icon="interfaceStore.isMobile"
                :density="interfaceStore.isMobile ? 'compact' : 'default'">
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
              <v-list-item prepend-icon="mdi-delete" @click="sessionStore.clearSession" class="has-text-danger"
                title="Clear session" />
            </v-list>
          </v-menu>
          <BoostKeywordsComponent />
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
          <v-list-item prepend-icon="mdi-cached" @click="sessionStore.clearCache" class="has-text-danger"
            title="Clear cache (and session)" />
        </v-list>
      </v-menu>
    </v-app-bar>
    <div class="columns intro-message" v-if="sessionStore.isEmpty">
      <div class="column">
        <div class="subtitle level-item mt-2">
          {{ this.appMeta.subtitle }}
        </div>
      </div>
      <div class="column is-two-thirds">
        <div class="notification has-text-centered p-2" v-show="sessionStore.isEmpty">
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

<script>
import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";

export default {
  name: "HeaderPanel",
  inject: ["appMeta"],
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
  },
  computed: {
    sessionStateString() {
      return `${this.sessionStore.selectedPublicationsCount} selected${this.sessionStore.excludedPublicationsCount
        ? `; ${this.sessionStore.excludedPublicationsCount} excluded`
        : ""}`;
    }
  },
};
</script>

<style lang="scss" scoped>
.v-toolbar {
  z-index: 3000 !important;

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

          &>button {
            margin-left: 1vw;
          }
        }
      }
    }
  }
}

.intro-message,
.intro-message-placeholder {
  margin-top: 48px;

  & .column {
    margin: $block-spacing;
  }
}

@include touch {
  :deep(.app-name) {
    font-size: 1.2rem !important;
  }
}
</style>