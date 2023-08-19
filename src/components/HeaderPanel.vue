<template>
  <v-app-bar color="white" dense :absolute="isMobile">
    <v-icon class="mr-4" size="38">mdi-water-plus-outline</v-icon>
    <v-toolbar-title>
      <span v-html="$appNameHtml"></span>
    </v-toolbar-title>
    <v-menu v-if="!sessionStore.isEmpty" bottom right offset-y>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" v-tippy title="Session" outlined class="ml-8">
          <v-icon size="18" class="mr-2">mdi-text-box-multiple-outline</v-icon>
          Session ({{ sessionStore.selectedPublicationsCount }} selected{{ sessionStore.excludedPublicationsCount
            ? `; ${sessionStore.excludedPublicationsCount} excluded`
            : "" }})
          <v-icon class="ml-2">
            mdi-menu-down
          </v-icon>
        </v-btn>
      </template>
      <v-list>
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
    <v-btn icon href="https://twitter.com/pure_suggest" v-tippy title="Follow us on Twitter">
      <v-icon>mdi-twitter</v-icon>
    </v-btn>
    <v-btn icon href="https://medium.com/@pure_suggest" v-tippy title="Read more on Medium">
      <v-icon>mdi-post</v-icon>
    </v-btn>
    <v-btn icon href="https://github.com/fabian-beck/pure-suggest" v-tippy title="Contribute on GitHub">
      <v-icon>mdi-github</v-icon>
    </v-btn>
    <v-menu bottom left offset-y>
      <template v-slot:activator="{ on, attrs }">
        <v-btn icon v-bind="attrs" v-on="on" class="ml-4 mr-1">
          <v-icon>mdi-dots-vertical</v-icon>
        </v-btn>
      </template>
      <v-list>
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
  props: {
    isMobile: Boolean,
  },
};
</script>

<style lang="scss" scoped>
.v-toolbar {
  & ::v-deep {
    & .v-toolbar__content {
      padding: 0 0.5rem;

      & .v-toolbar__title {
        font-size: 1.5rem;
        font-weight: 600;
      }
    }
  }
}
</style>