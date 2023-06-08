<template>
  <div id="app">
    <HeaderPanel id="header" />
    <div
      id="main"
      @click="sessionStore.clearActivePublication('clicked anywhere')"
      :class="{ 'network-expanded': interfaceStore.isNetworkExpanded }"
    >
      <SelectedPublicationsComponent
        id="selected"
        v-show="!interfaceStore.isNetworkExpanded"
      />
      <SuggestedPublicationsComponent
        id="suggested"
        v-show="!interfaceStore.isNetworkExpanded"
      />
      <NetworkVisComponent id="network" :svgWidth="1500" :svgHeight="600" />
    </div>
    <QuickAccessBar
      id="quick-access"
      class="is-hidden-desktop"
      v-if="!interfaceStore.isAnyOverlayShown"
    >
    </QuickAccessBar>
    <SearchPanel />
    <AuthorPanel />
    <b-modal v-model="interfaceStore.isAboutPageShown">
      <AboutPage />
    </b-modal>
    <b-modal v-model="interfaceStore.isKeyboardControlsShown">
      <KeyboardControlsPage />
    </b-modal>
    <b-loading
      :is-full-page="true"
      v-model="interfaceStore.isLoading"
      :can-cancel="false"
    ></b-loading>
  </div>
</template>

<!---------------------------------------------------------------------------------->

<script>
import { useSessionStore } from "./stores/session.js";
import { useInterfaceStore } from "./stores/interface.js";

import HeaderPanel from "./components/HeaderPanel.vue";
import SelectedPublicationsComponent from "./components/SelectedPublicationsComponent.vue";
import SuggestedPublicationsComponent from "./components/SuggestedPublicationsComponent.vue";
import NetworkVisComponent from "./components/NetworkVisComponent.vue";
import QuickAccessBar from "./components/QuickAccessBar.vue";
import SearchPanel from "./components/SearchPanel.vue";
import AuthorPanel from "./components/AuthorPanel.vue";
import AboutPage from "./components/AboutPage.vue";
import KeyboardControlsPage from "./components/KeyboardControlsPage.vue";

import { onKey } from "./Keys.js";

export default {
  name: "App",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
  },
  components: {
    HeaderPanel,
    SelectedPublicationsComponent,
    SuggestedPublicationsComponent,
    NetworkVisComponent,
    QuickAccessBar,
    SearchPanel,
    AuthorPanel,
    AboutPage,
    KeyboardControlsPage,
  },
  created() {
    window.addEventListener("keydown", onKey);
  },
  mounted() {
    window.onbeforeunload = () => {
      window.scrollTo(0, 0);
      // triggers a prompt before closing/reloading the page
      if (!this.sessionStore.isEmpty) return "";
      return null;
    };
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this.onKey);
  },
};
</script>

<!---------------------------------------------------------------------------------->

<style lang="scss">
$block-spacing: 0.5rem;
$box-padding: 1rem;

@import "~bulma";
@import "~buefy/src/scss/buefy";

#app {
  display: grid;
  grid-template-areas:
    "header"
    "main";
  height: 100vh;
  grid-template-rows: max-content auto;

  & #header {
    grid-area: header;
  }

  & #main {
    grid-area: main;
    margin: 0.5vw;
    display: grid;
    grid-template-areas:
      "selected suggested"
      "vis vis";
    height: calc(100% - 1vw);
    overflow: auto;
    grid-template-columns: 50fr 50fr;
    grid-template-rows: auto 35vh;
    gap: 0.5vw;

    &.network-expanded {
      grid-template-areas: "vis";
      grid-template-columns: auto;
      grid-template-rows: auto;
    }

    & #selected {
      grid-area: selected;
      overflow-y: hidden;
    }

    & #suggested {
      grid-area: suggested;
      overflow-y: hidden;
    }

    & #network {
      grid-area: vis;
    }

    & .box {
      margin: 0;
      padding: min(0.5vw, 1rem);
    }
  }

  & .compact-button {
    background: transparent;
    color: $white;
    border-color: $white;
    height: 1.5rem;
    margin-right: 0 !important;
    margin-left: 1rem;
    padding: 0.5rem;

    &:hover {
      color: $light;
      border-color: $light;
    }

    &.is-dark {
      color: $dark;
      border-color: $dark;
      background: $white;

      &:hover {
        color: $dark;
        border-color: $dark;
        background: $light;
      }
    }
  }
}

// placed outside the #app scope to apply to tooltips also
.key {
  text-decoration: underline;
}

.unknown {
  color: $danger;
}

.dialog .modal-card {
  max-width: 720px;
}

@include touch {
  #app {
    display: block;
    margin-bottom: 5rem;

    & #main {
      display: block;
      margin: 0;
      overflow: scroll;
      height: auto;

      & .box {
        margin: 0.25rem;
        padding: 0.5rem;
      }

      & #selected {
        min-height: 20rem;
      }

      & #suggested {
        min-height: 20rem;
      }

      & #network .box {
        min-height: 70vh;
      }

      & .level-left + .level-right {
        margin-top: 0.5rem;
      }

      /* Empty space for quick access buttons; used "::after" instead of plain margin-bottom as workaround for Chrome */
      &::after {
        content: "";
        min-height: 5rem;
        display: block;
      }
    }

    #quick-access {
      position: fixed;
      bottom: 0.5rem;
      width: 100%;
      text-align: center;
      z-index: 100;
    }
  }

  // placed outside the #app scope to apply to tooltips also
  .key {
    text-decoration: none;
  }

  .modal .modal-content {
    max-height: calc(100vh - 90px);
  }

  .modal-close {
    right: 5px;
    top: 5px;
  }
}

@media screen and (min-width: 2400px) {
  #app #main {
    grid-template-areas: "selected suggested vis";
    grid-template-columns: 50fr 50fr 75fr;
    grid-template-rows: auto;
  }
}
</style>