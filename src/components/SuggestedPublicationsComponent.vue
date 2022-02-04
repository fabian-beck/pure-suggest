<template>
  <div
    class="suggested-publications box has-background-info"
  >
    <div class="level">
      <div class="level-left has-text-white">
        <div class="level-item">
          <b-icon icon="file-import"></b-icon>
          <h2 class="is-size-5 ml-2">Suggested</h2>
        </div>
        <span
          class="level-item icon is-hidden-touch"
          v-show="publications.length"
        >
          <i
            class="fas fa-info-circle"
            data-tippy-content="The <b>suggested publications</b> based on references to and from the selected publications, sorted by score."
            v-tippy
          ></i
        ></span>
      </div>
    </div>
    <PublicationListComponent
      :publications="publications"
      :suggestion="true"
      v-on:activate="activatePublication"
      v-on:add="addPublication"
      v-on:remove="removePublication"
      v-show="publications.length"
    />
    <b-loading
      :is-full-page="false"
      :active.sync="loadingSuggestions"
      :can-cancel="false"
    ></b-loading>
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
    publications: Array,
    loadingSuggestions: Boolean,
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