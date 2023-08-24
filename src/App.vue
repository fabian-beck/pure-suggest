<template>
  <v-app id="app" data-app>
    Test
    <!-- <HeaderPanel id="header" />
    <div id="main" @click="sessionStore.clearActivePublication('clicked anywhere')"
      :class="{ 'network-expanded': interfaceStore.isNetworkExpanded }">
      <SelectedPublicationsComponent id="selected" v-show="!interfaceStore.isNetworkExpanded" />
      <SuggestedPublicationsComponent id="suggested" v-show="!interfaceStore.isNetworkExpanded" />
      <NetworkVisComponent id="network" :svgWidth="1500" :svgHeight="600" />
    </div>
    <QuickAccessBar id="quick-access" class="is-hidden-desktop"
      v-if="!interfaceStore.isAnyOverlayShown && !sessionStore.isEmpty">
    </QuickAccessBar> -->
    <!-- Modal dialogs -->
    <!-- <SearchModalDialog />
    <AuthorModalDialog />
    <AboutModalDialog />
    <KeyboardControlsModalDialog /> -->
    <!-- Other dialogs and overlays -->
    <!-- <v-overlay v-model="interfaceStore.isLoading" location-strategy="static">
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>
    <LoadingToast />
    <ConfirmDialog />
    <InfoDialog />
    <ErrorToast />
    <FeedbackSnackbar /> -->
  </v-app>
</template>

<!---------------------------------------------------------------------------------->

<script>
import { useSessionStore } from "./stores/session.js";
import { useInterfaceStore } from "./stores/interface.js";

import { onKey } from "./Keys.js";

export default {
  name: "App",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
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

#app .v-application--wrap {
  display: grid;
  grid-template-areas:
    "header"
    "main";
  height: 100vh;
  grid-template-rows: max-content auto;
  font-family: BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, Helvetica, Arial, sans-serif !important;

  & p {
    margin: 0;
  }

  ;

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

      &>.level {
        margin-bottom: 0.5rem;
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

.modal {
  & .card {
    position: relative;
  }

  & .card-content {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
}

// floating labels of fields (inpired from Buefy)
.field.is-floating-label {
  position: relative;

  & .label {
    top: -.775em;
    padding-left: .125em;
    padding-right: .125em;
    position: absolute;
    left: 0.5em;
    font-size: .75rem;
    background-color: transparent;
    white-space: nowrap;
    text-overflow: ellipsis;
    max-width: calc(100% - 2em);
    overflow: hidden;
    z-index: 3 !important;
  }
}

@include touch {
  #app .v-application--wrap {
    display: block;
    margin-bottom: 5rem;

    & #main {
      display: block;
      margin: 0;
      overflow: scroll;
      height: auto;
      margin-top: 52px;

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

      & .level-left+.level-right {
        margin-top: 0.5rem;
      }

      /* Empty space for quick access buttons; used "::after" instead of plain margin-bottom as workaround for Chrome */
      &::after {
        content: "";
        min-height: 4rem;
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

  .modal {
    & .modal-content {
      max-height: 100%;
    }

    & .card-content {
      max-height: calc(100vh - 140px);
    }
  }

  .modal-close {
    right: 5px;
    top: 5px;
  }
}

@media screen and (min-width: 2400px) {
  #app .v-application--wrap #main {
    grid-template-areas: "selected suggested vis";
    grid-template-columns: 50fr 50fr 75fr;
    grid-template-rows: auto;
  }
}
</style>