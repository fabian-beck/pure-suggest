<template>
  <div class="suggested-publications column">
    <div class="box has-background-info">
      <div class="title is-size-4">
        Suggested publications
        <b-tooltip
          label="The suggested publications are sorted by the number of selected publications they reference."
          position="is-right"
          multilined
        >
          <b-icon icon="info-circle" size="is-small"></b-icon>
        </b-tooltip>
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
    publications: Array
  },
  methods: {
    addPublication: function(doi) {
      this.$emit('add', doi);
    }
  }
};
</script>

<style scoped>
.box {
  height: 100%;
  display: grid;
  grid-template-rows: 40px auto;
}
.publication-list {
  max-height: 100%;
  overflow-y: scroll;
}
</style>