<template>
  <div class="selected-publications column">
    <div class="box has-background-primary">
      <div class="level">
        <div class="level-left">
          <div class="is-size-4">Selected publications</div>
        </div>
        <div class="level-right">
          <button class="button is-small" v-on:click="clear">clear</button>
        </div>
      </div>
      <form v-on:submit.prevent class="level">
        <div class="level-left">
          <div class="level-item">
            <label>Add:</label>
          </div>
        </div>
        <input class="input" type="text" placeholder="Paste DOI(s) here" v-model="addDois" />
        <button class="button level-right" type="submit" v-on:click="add">
          <strong>+</strong>
        </button>
      </form>
      <ul class="publication-list has-background-white">
        <PublicationComponent
          v-for="publication in publications"
          v-bind:key="publication.doi"
          v-bind:publication="publication"
          v-on:activate="activatePublication"
        ></PublicationComponent>
      </ul>
    </div>
  </div>
</template>

<script>
import PublicationComponent from "./PublicationComponent.vue";

export default {
  name: "SelectedPublicationsComponent",
  components: {
    PublicationComponent
  },
  props: {
    publications: Array
  },
  data() {
    return {
      addDois: ""
    };
  },
  methods: {
    add: function() {
      this.$emit("add", this.addDois);
      this.addDois = "";
    },
    activatePublication: function(doi) {
      this.$emit("activate", doi);
    },
    clear: function() {
      this.$emit("clear");
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~bulma/sass/utilities/_all";
.box {
  height: 100%;
  display: grid;
  grid-template-rows: max-content max-content auto;
}
.publication-list {
  max-height: 100%;
  overflow-y: scroll;
  border: 1px solid $border;
}
form label {
  margin-right: 0.2rem;
}
</style>