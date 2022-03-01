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
            v-show="publications.length"
            data-tippy-content="The <b>suggested publications</b> based on references to and from the selected publications, sorted by score."
            v-tippy
          ></b-icon>
        </div>
      </div>
    </div>
    <PublicationListComponent
      :publications="publications"
      :suggestion="true"
      v-on:activate="activatePublication"
      v-on:add="addPublication"
      v-on:remove="removePublication"
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
    publications: Array,
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