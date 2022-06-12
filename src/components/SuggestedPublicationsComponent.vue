<template>
  <div class="suggested-publications box has-background-info">
    <div class="level">
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
        {{ suggestion.publications.length }} of {{ suggestion.totalSuggestions }} suggestions
      </div>
    </div>
    <PublicationListComponent
      :publications="suggestion?suggestion.publications:[]"
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
}
.publication-list {
  max-height: 100%;
  overflow-y: scroll;
  border: 1px solid $border;
}
</style>