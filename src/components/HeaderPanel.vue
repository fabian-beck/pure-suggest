<template>
  <div>
    <v-app-bar color="white" dense :fixed="interfaceStore.isMobile">
      <v-icon class="mr-1" size="38">mdi-water-plus-outline</v-icon>
      <v-toolbar-title>
        <span v-html="$appNameHtml"></span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-menu v-if="!sessionStore.isEmpty" bottom right offset-y transition="slide-y-transition">
        <template v-slot:activator="{ on, attrs }">
          <v-btn v-bind="attrs" v-on="on" outlined 
            class="ml-4">
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
          <v-list-item @click="sessionStore.exportSession">
            <v-list-item-icon>
              <v-icon>mdi-export</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>Export session as JSON</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-list-item @click="sessionStore.exportAllBibtex">
            <v-list-item-icon>
              <v-icon>mdi-export</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>Export selected as BibTeX</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-list-item @click="sessionStore.clearSession" class="has-text-danger">
            <v-list-item-icon>
              <v-icon>mdi-delete</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>Clear session</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-spacer></v-spacer>
      <HeaderExternalLinks class="is-hidden-touch mr-4" />
      <v-menu bottom left offset-y transition="slide-y-transition">
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon v-bind="attrs" v-on="on" class="mr-1">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item class="is-hidden-desktop">
            <HeaderExternalLinks />
          </v-list-item>
          <v-list-item @click="interfaceStore.openFeedback">
            <v-list-item-icon>
              <v-icon>mdi-comment-quote-outline</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>Feedback</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-list-item @click="interfaceStore.isKeyboardControlsModalDialogShown = true" class="is-hidden-touch">
            <v-list-item-icon>
              <v-icon>mdi-keyboard-outline</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>Keyboard controls</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-list-item @click="interfaceStore.isAboutModalDialogShown = true">
            <v-list-item-icon>
              <v-icon>mdi-information-outline</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>About</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-list-item @click="sessionStore.clearCache" class="has-text-danger">
            <v-list-item-icon>
              <v-icon>mdi-cached</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>Clear cache (and session)</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>
    <div class="columns" v-show="sessionStore.isEmpty">
      <div class="column">
        <div class="subtitle level-item mt-2">
          {{ this.$appSubtitle }}
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
  </div>
</template>

<script>
import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";

export default {
  name: "HeaderPanel",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
  },
  computed: {
    sessionStateString() {
      return `Session (${this.sessionStore.selectedPublicationsCount} selected${this.sessionStore.excludedPublicationsCount
        ? `; ${this.sessionStore.excludedPublicationsCount} excluded`
        : ""})`;
    }
  },
};
</script>

<style lang="scss" scoped>
.v-toolbar {
  z-index: 4;

  & ::v-deep {
    & .v-toolbar__content {
      padding: 0 0.5vw;

      & .v-toolbar__title {
        font-size: 1.5rem;
        font-weight: 600;
      }
    }
  }
}

.columns {
  & .column {
    margin: $block-spacing;
  }
}

@include touch {
  .columns {
    margin-top: 52px;
  }
}
</style>