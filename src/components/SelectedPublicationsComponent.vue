<template>
  <div class="selected-publications column">
    <div class="box has-background-primary">
      <div class="level">
        <div class="level-left">
          <div class="is-size-4">Selected publications</div>
          <b-icon
            icon="info-circle"
            size="is-small"
            data-tippy-content="The publications you selected as a basis for computing the suggestions, sorted by inversed sequence of addition."
            v-tippy
          ></b-icon>
        </div>
        <div class="level-right">
          <button
            class="button is-small"
            v-on:click="clear"
            data-tippy-content="Clear selected publications (clears also the list of removed publications)."
            v-tippy
          >clear</button>
        </div>
      </div>
      <form v-on:submit.prevent class="level">
        <div class="level-left">
          <div class="level-item">
            <label>Add:</label>
          </div>
        </div>
        <input class="input" type="text" placeholder="Paste DOI(s) or publication title here" v-model="addQuery" />
        <button
          class="button level-right"
          type="submit"
          v-on:click="add"
          data-tippy-content="Add listed DOIs to selected publications (the list might be separate by different characters or the DOI can also be included in a different format such as BibTeX)."
          v-tippy
        >
          <strong>+</strong>
        </button>
      </form>
      <PublicationListComponent 
       :publications="publications" 
       v-on:activate="activatePublication"
       v-on:remove="removePublication"
       />
    </div>
  </div>
</template>

<script>
import PublicationListComponent from "./PublicationListComponent.vue";

export default {
  name: "SelectedPublicationsComponent",
  components: {
    PublicationListComponent
  },
  props: {
    publications: Array
  },
  data() {
    return {
      addQuery: ""
    };
  },
  methods: {
    add: function() {
      this.$emit("addByQuery", this.addQuery);
      this.addQuery = "";
    },
    removePublication: function(doi) {
      this.$emit("remove", doi);
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