<template>
  <div class="selected-publications column">
    <div class="box has-background-primary">
      <div class="level">
        <div class="level-left">
          <h2 class="is-size-4">Selected seed publications</h2>
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
          >
            clear
          </button>
        </div>
      </div>
      <form v-on:submit.prevent class="level">
        <input
          class="input"
          type="text"
          placeholder="To add paper(s), provide DOI(s) or publication title here"
          v-model="addQuery"
        />
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
      <div>
        <div
          class="level has-background-warning p-2 mb-2"
          v-show="noPublicationWarning"
        >
          <div class="level-left">
            Cannot not find a publication with this or similar title.
          </div>
          <span
            class="icon level-right is-clickable"
            v-on:click="noPublicationWarning = false"
          >
            <i class="fas fa-times"></i>
          </span>
        </div>
      </div>
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
import PublicationQuery from "./../PublicationQuery.js";

export default {
  name: "SelectedPublicationsComponent",
  components: {
    PublicationListComponent,
  },
  props: {
    publications: Array,
  },
  data() {
    return {
      addQuery: "",
      noPublicationWarning: false,
    };
  },
  methods: {
    add: function () {
      this.noPublicationWarning = true;
      const publicationQuery = new PublicationQuery(this.addQuery);
      publicationQuery.execute();
      const dois = publicationQuery.dois;
      if (dois.length > 0) {
        this.$emit("add", dois);
        this.addQuery = "";
      } else {
        this.noPublicationWarning = true;
      }
    },
    removePublication: function (doi) {
      this.$emit("remove", doi);
    },
    activatePublication: function (doi) {
      this.$emit("activate", doi);
    },
    clear: function () {
      this.$emit("clear");
    },
  },
  watch: {
    addQuery: function () {
      this.noPublicationWarning = false;
    },
  },
};
</script>

<style lang="scss" scoped>
@import "~bulma/sass/utilities/_all";
.box {
  height: 100%;
  display: grid;
  grid-template-rows: max-content max-content max-content auto;
}
.publication-list {
  max-height: 100%;
  overflow-y: scroll;
  border: 1px solid $border;
}
</style>