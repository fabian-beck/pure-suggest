<template>
  <div>
    <button
      class="button has-background-primary has-text-white"
      @click="sessionStore.updateQueued"
      v-show="sessionStore.isUpdatable"
      id="quick-access-update"
    >
      <b-icon icon="update" size="is-small"></b-icon>
      <div class="button-label">Update</div>
    </button>
    <button
      class="button has-background-primary has-text-white"
      :class="{
        active: isComponentActive.selected,
      }"
      @click="scrollTo('selected')"
    >
      <b-icon icon="water-outline"></b-icon>
      <div class="button-label">Selected</div>
    </button>
    <button
      class="button has-background-info has-text-white"
      :class="{
        active: isComponentActive.suggested,
      }"
      @click="scrollTo('suggested')"
    >
      <b-icon icon="water-plus-outline"></b-icon>
      <div class="button-label">Suggested</div>
    </button>
    <button
      class="button has-background-grey has-text-white"
      :class="{
        active: isComponentActive.network,
      }"
      @click="scrollTo('network')"
    >
      <b-icon icon="chart-bubble"></b-icon>
      <div class="button-label">Network</div>
    </button>
  </div>
</template>
<script>
import { useSessionStore } from "./../stores/session.js";

import { scrollToTargetAdjusted } from "./../Util.js";

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

button,
button:focus {
  margin: 0.5rem;
  box-shadow: 0.25rem 0.25rem 0.75rem grey !important;
  border-color: white;
  width: 4.5rem;
  height: 3.5rem;
  display: inline;
  padding: 0.25rem;
  filter: brightness(90%);

  &.active {
    border-color: black;
    filter: brightness(100%);
    box-shadow: 0.1rem 0.1rem 0.5rem grey !important;
  }

  & .icon {
    margin: 0 !important;
  }

  & .button-label {
    font-size: 0.7rem;
  }
}

#quick-access-update {
  position: absolute;
  bottom: 4rem;
  filter: brightness(100%);
  display: inline-flex;
  height: auto;

  & .icon {
    margin-right: 0.2rem !important;
  }
}
</style>