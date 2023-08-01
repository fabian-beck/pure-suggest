<template>
  <div>
    <v-btn class="has-background-primary has-text-white" @click="sessionStore.updateQueued"
      v-show="sessionStore.isUpdatable" id="quick-access-update">
      <v-icon class="has-text-white" left>mdi-update</v-icon>
      <div class="button-label">Update</div>
    </v-btn>
    <v-btn-toggle borderless>
      <v-btn class="has-background-primary has-text-white" :class="{
        active: isComponentActive.selected,
      }" @click="scrollTo('selected')">
        <v-icon class="has-text-white" top>mdi-water-outline</v-icon>
        <div class="button-label">Selected</div>
      </v-btn>
      <v-btn class="has-background-info has-text-white" :class="{
        active: isComponentActive.suggested,
      }" @click="scrollTo('suggested')">
        <v-icon class="has-text-white" top>mdi-water-plus-outline</v-icon>
        <div class="button-label">Suggested</div>
      </v-btn>
      <v-btn class="has-background-grey has-text-white" :class="{
        active: isComponentActive.network,
      }" @click="scrollTo('network')">
        <v-icon class="has-text-white" top>mdi-chart-bubble</v-icon>
        <div class="button-label">Network</div>
      </v-btn>
    </v-btn-toggle>
  </div>
</template>

<script>
import { useSessionStore } from "@/stores/session.js";

import { scrollToTargetAdjusted } from "@/Util.js";

export default {
  name: "QuickAccessBar",
  setup() {
    const sessionStore = useSessionStore();
    return { sessionStore };
  },
  mounted() {
    document.addEventListener("scroll", this.updateActiveButton);
  },
  data() {
    return {
      isComponentActive: {
        selected: true,
        suggested: false,
        network: false,
      },
    };
  },
  methods: {
    scrollTo(id) {
      scrollToTargetAdjusted(document.getElementById(id), 55);
    },

    updateActiveButton() {
      this.isComponentActive = {
        selected: false,
        suggested: false,
        network: false,
      };
      const activationHeight = document.documentElement.clientHeight * 0.7;
      for (const componentId of Object.keys(this.isComponentActive)) {
        const component = document.getElementById(componentId);
        const rect = component.getBoundingClientRect();
        this.isComponentActive[componentId] =
          (rect.top >= 0 && rect.top <= activationHeight) ||
          (rect.top < 0 && rect.bottom > activationHeight);
        if (this.isComponentActive[componentId]) {
          break;
        }
      }
    },
  },
};
</script>
<style lang="scss" scoped>
.v-item-group {
  @include shadow;

  & button,
  & button:focus {
    width: 5.0rem;
    height: 3.0rem !important;
    filter: opacity(0.5);
    transition: filter 0.3s ease-in-out;

    &.active {
      filter: opacity(1.0);
      border: 1px solid black !important
    }

    & ::v-deep .v-btn__content {
      display: block;
    }

    & .button-label {
      font-size: 0.7rem;
    }
  }
}

#quick-access-update {
  position: absolute;
  bottom: 3.5rem;
  display: inline-flex;
  height: 2rem;
}
</style>