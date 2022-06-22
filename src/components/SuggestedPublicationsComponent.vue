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
            v-show="suggestion"
            data-tippy-content="The <b>suggested publications</b> based on references to and from the selected publications, sorted by score."
            v-tippy
          ></b-icon>
        </div>
      </div>
      <div class="level-right has-text-white" v-if="suggestion">
        <div class="level-item">
          <span>
            {{ suggestion.publications.length }}
            <b-tag
              icon="bell"
              size="is-small"
              v-if="unreadSuggestionsCount > 0"
              data-tippy-content="The number of unread suggestions."
              v-tippy
              >{{ unreadSuggestionsCount }}</b-tag
            >
            of
            {{ suggestion.totalSuggestions.toLocaleString("en") }} suggestions
          </span>
          <b-button
            class="level-item compact-button"
            icon-right="playlist-plus"
            data-tippy-content="Load more suggestions"
            v-tippy
            @click.stop="$emit('loadMore')"
            :disabled="
              suggestion.publications.length === suggestion.totalSuggestions
            "
          ></b-button>
        </div>
      </div>
    </div>
    <PublicationListComponent
      :publications="suggestion ? suggestion.publications : []"
      :suggestion="true"
      v-on:add="addPublication"
      v-on:remove="removePublication"
      v-on:activate="activatePublication"
      v-on:exportSingleBibtex="exportSingleBibtex"
    />
  </div>
</template>

<script>
import PublicationListComponent from "./PublicationListComponent.vue";

export default {
  name: "SuggestedPublicationsComponent",
  components: {
    PublicationListComponent,
  },
  props: {
    title: String,
    suggestion: Object,
  },
  computed: {
    unreadSuggestionsCount() {
      return this.suggestion.publications.filter(
        (publication) => !publication.isRead
      ).length;
    },
  },
  methods: {
    addPublication: function (doi) {
      this.$emit("add", doi);
    },
    removePublication: function (doi) {
      this.$emit("remove", doi);
    },
    activatePublication: function (doi) {
      this.$emit("activate", doi);
    },
    exportSingleBibtex: function (publication) {
      this.$emit("exportSingleBibtex", publication);
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