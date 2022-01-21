<template>
  <div class="suggested-publications column">
    <div class="box has-background-info">
      <div class="level">
        <div class="level-left">
          <h2 class="is-size-4">Suggested publications</h2>
          <b-icon
            icon="info-circle"
            size="is-small"
            data-tippy-content="The suggested publications are sorted by the number of selected publications they reference or are referenced by."
            v-tippy
          ></b-icon>
        </div>
      </div>
      <PublicationListComponent
        :publications="publications"
        :suggestion="true"
        v-on:activate="activatePublication"
        v-on:add="addPublication"
        v-on:remove="removePublication"
      />
      <b-loading :is-full-page="false" :active.sync="loadingSuggestions" :can-cancel="false"></b-loading>
    </div>
  </div>
</template>

<script>
import PublicationListComponent from "./PublicationListComponent.vue";

export default {
  name: "SuggestedPublicationsComponent",
  components: {
    PublicationListComponent
  },
  props: {
    title: String,
    publications: Array,
    loadingSuggestions: Boolean
  },
  methods: {
    addPublication: function(doi) {
      this.$emit("add", doi);
    },
    removePublication: function(doi) {
      this.$emit("remove", doi);
    },
    activatePublication: function(doi) {
      this.$emit("activate", doi);
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~bulma/sass/utilities/_all";
.box {
  height: 100%;
  display: grid;
  grid-template-rows: max-content auto;
  position: relative;
}
.title {
  margin: 0;
}
.level {
  margin-bottom: 0.5rem !important;
}
.publication-list {
  max-height: 100%;
  overflow-y: scroll;
  border: 1px solid $border;
}
</style>