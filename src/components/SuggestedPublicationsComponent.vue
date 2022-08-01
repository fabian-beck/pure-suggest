<template>
  <div class="suggested-publications box has-background-info">
    <div class="level box-header">
      <div class="level-left has-text-white">
        <div class="level-item">
          <b-icon icon="water-plus-outline"></b-icon>
          <h2 class="is-size-5 ml-2">Suggested</h2>
          <b-icon
            icon="information-outline"
            size="is-small"
            class="ml-2"
            v-show="sessionStore.suggestion"
            data-tippy-content="The <b>suggested publications</b> based on references to and from the selected publications, sorted by score."
            v-tippy
          ></b-icon>
        </div>
      </div>
      <div class="level-right has-text-white" v-if="sessionStore.suggestion">
        <div class="level-item">
          <span>
            {{ sessionStore.suggestedPublicationsWithoutQueued.length }}
            <b-tag
              icon="bell"
              size="is-small"
              v-if="sessionStore.unreadSuggestionsCount > 0"
              data-tippy-content="The number of unread suggestions."
              v-tippy
              >{{ sessionStore.unreadSuggestionsCount }}</b-tag
            >
            of
            {{ sessionStore.currentTotalSuggestions.toLocaleString("en") }}
            suggestions
          </span>
          <b-button
            class="level-item compact-button"
            icon-right="playlist-plus"
            data-tippy-content="Load more suggestions"
            v-tippy
            @click.stop="$emit('loadMore')"
            :disabled="
              sessionStore.suggestedPublicationsWithoutQueued.length ===
              sessionStore.currentTotalSuggestions
            "
          ></b-button>
        </div>
      </div>
    </div>
    <div class="notification has-background-info-light level p-2">
      Filter
      <b-field label="Tag" class="level">
        <b-select placeholder="Select a tag" class="ml-2" @input="filterByTag">
          <option value="">none</option>
          <option v-for="tag in TAGS" :value="tag.value" :key="tag.value">
            {{ tag.name }}
          </option>
        </b-select>
      </b-field>
    </div>
    <PublicationListComponent
      :publications="sessionStore.suggestedPublicationsWithoutQueued"
      :suggestion="true"
      v-on:add="addPublication"
      v-on:remove="removePublication"
      v-on:showAbstract="showAbstract"
    />
  </div>
</template>

<script>
import { useSessionStore } from "./../stores/session.js";
import Publication from "./../Publication.js";

import PublicationListComponent from "./PublicationListComponent.vue";

export default {
  name: "SuggestedPublicationsComponent",
  setup() {
    const sessionStore = useSessionStore();
    return { sessionStore };
  },
  components: {
    PublicationListComponent,
  },
  props: {
    title: String,
  },
  data() {
    return {
      TAGS: Publication.TAGS,
    };
  },
  methods: {
    addPublication: function (doi) {
      this.sessionStore.addPublicationToQueueForSelected(doi);
    },
    removePublication: function (doi) {
      this.$emit("remove", doi);
    },
    showAbstract: function (publication) {
      this.$emit("showAbstract", publication);
    },
    filterByTag: function (value) {
      this.sessionStore.filter.tag = value;
      this.sessionStore.updateSuggestions();
    },
  },
};
</script>

<style lang="scss" scoped>
@import "~bulma/sass/utilities/_all";
.box {
  display: grid;
  grid-template-rows: max-content auto;
  position: relative;

  & .box-header .tag {
    position: relative;
    top: -0.4rem;
    padding: 0 0.2rem;
    height: 1.2rem;
    background-color: $info-light;
    color: $info-dark;
  }
}
.publication-list {
  max-height: 100%;
  overflow-y: scroll;
  border: 1px solid $border;
}
</style>