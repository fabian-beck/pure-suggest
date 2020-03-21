<template>
  <div class="suggested-publications column">
    <div class="box has-background-info">
      <div class="level">
        <div class="level-left">
          <div class="is-size-4">Suggested publications</div>
          <b-icon
            icon="info-circle"
            size="is-small"
            v-tooltip="'The suggested publications are sorted by the number of selected publications they reference.'"
          ></b-icon>
        </div>
      </div>
      <ul class="publication-list has-background-white">
        <PublicationComponent
          v-for="publication in publications"
          :key="publication.doi"
          :publication="publication"
          :suggestion="true"
          v-on:add="addPublication"
        ></PublicationComponent>
      </ul>
      <b-loading :is-full-page="false" :active.sync="loadingSuggestions" :can-cancel="false"></b-loading>
    </div>
  </div>
</template>

<script>
import PublicationComponent from "./PublicationComponent.vue";

export default {
  name: "SuggestedPublicationsComponent",
  components: {
    PublicationComponent
  },
  props: {
    title: String,
    publications: Array,
    loadingSuggestions: Boolean
  },
  methods: {
    addPublication: function(doi) {
      this.$emit("add", doi);
    }
  }
};
</script>

<style scoped>
.title {
  margin: 0;
}
.box {
  height: 100%;
  display: grid;
  grid-template-rows: 50px auto;
  position: relative;
}
.publication-list {
  max-height: 100%;
  overflow-y: scroll;
}
</style>