<template>
  <div class="selected-publications box has-background-primary">
    <div class="level">
      <div class="level-left has-text-white">
        <div class="level-item">
          <b-icon icon="water-outline"></b-icon>
          <h2 class="is-size-5 ml-2">Selected</h2>
          <b-icon
            icon="information-outline"
            size="is-small"
            class="ml-2"
            v-show="publications.length"
            data-tippy-content="The <b>publications selected as seeds</b> for computing the suggestions, sorted by score."
            v-tippy
          ></b-icon>
        </div>
      </div>
      <div class="level-right" v-show="publications.length">
        <div class="level-item">
          <div class="field has-addons">
            <p class="control has-icons-right">
              <input
                class="input boost has-background-warning-light"
                type="text"
                v-model="boostKeywordString"
                placeholder="keyword(s)"
                @keyup.enter="updateBoost"
                data-tippy-content="Boost by factors of 2 the score of publications that contain the following keyword(s) in their title.<br><br>Use commas to separate multiple keywords."
                v-tippy
              />
              <span class="icon is-small is-right is-clickable">
                <i class="delete" @click.stop="clearBoost"></i>
              </span>
            </p>
            <p class="control">
              <b-button
                class="button has-background-warning"
                type="submit"
                icon-left="chevron-double-up"
                v-on:click="updateBoost"
              >
                <span><span class="key">B</span>oost</span>
              </b-button>
            </p>
          </div>
        </div>
      </div>
    </div>
    <form v-on:submit.prevent="add" class="field has-addons">
      <p class="control is-expanded">
        <input
          class="input add-publication"
          type="text"
          placeholder="publication DOI(s) or title"
          v-model="addQuery"
          data-tippy-content="One or more <b>DOIs</b> (separated by different characters or included in a different format such as BibTeX).<br/>Alternatively, <b>paper title</b> or a unique part of it (only works for one publication)"
          v-tippy
        />
      </p>
      <p class="control">
        <b-button
          class="button level-right has-background-primary-light"
          type="submit"
          icon-left="plus-thick"
          @click.stop="add"
        >
        <span class="key">A</span>dd
        </b-button>
      </p>
    </form>
    <div>
      <div
        class="notification has-text-centered has-background-primary-light p-2"
        v-show="publications.length === 0"
      >
        <p>
          To start, add one or more publications by providing their
          <b>DOIs</b> (<a href="https://www.doi.org/"
            >Document Object Intentfier</a
          >) or a <b>title</b>. Alternative:
          <button class="button is-small" @click.stop="$emit('loadExample')">
            <b>load example</b>
          </button>
        </p>
      </div>
      <div
        class="
          notification
          has-background-danger-light has-text-danger-dark
          mb-2
          p-2
        "
        v-show="noPublicationWarning"
      >
        <button
          class="delete"
          @click.stop="noPublicationWarning = false"
        ></button>
        Cannot find a publication with this or similar title.
      </div>
    </div>
    <PublicationListComponent
      :publications="publications"
      v-on:activate="activatePublication"
      v-on:remove="removePublication"
    />
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
      boostKeywordString: "",
    };
  },
  methods: {
    add: async function () {
      const publicationQuery = new PublicationQuery(this.addQuery);
      const dois = await publicationQuery.execute();
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
    updateBoost: function () {
      this.$emit("updateBoost", this.boostKeywordString);
    },
    clearBoost: function () {
      this.boostKeywordString = "";
      this.$emit("updateBoost", this.boostKeywordString);
    },
    setBoost: function (boostKeywordString) {
      this.boostKeywordString = boostKeywordString;
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
  display: grid;
  grid-template-rows: max-content max-content max-content auto;
}
.publication-list {
  max-height: 100%;
  overflow-y: scroll;
  border: 1px solid $border;
}
</style>