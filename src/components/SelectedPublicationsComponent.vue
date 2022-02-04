<template>
  <div
    class="selected-publications box has-background-primary"
    :class="{ collapsed: collapsed }"
  >
    <div class="level">
      <div class="level-left">
        <h2 class="level-item is-size-5" v-on:click="this.toggleCollapse">
          Selected
        </h2>
        <span
          class="level-item icon is-hidden-touch"
          v-show="publications.length"
        >
          <i
            class="fas fa-info-circle"
            data-tippy-content="The <b>publications selected as seeds</b> for computing the suggestions, sorted by score."
            v-tippy
          ></i>
        </span>
      </div>
      <div class="level-right">
        <div class="level-item" v-show="publications.length && !collapsed">
          <div
            class="field has-addons"
            data-tippy-content="Boost by factors of 2 the score of publications that contain the following keyword(s) in their title.<br><br>Use commas to separate multiple keywords."
            v-tippy
          >
            <p class="control has-icons-right">
              <input
                class="input has-background-warning-light"
                type="text"
                v-model="boostKeywordString"
                placeholder="keyword(s)"
                @keyup.enter="setBoostKeyword"
              />
              <span class="icon is-small is-right is-clickable">
                <i class="fas fa-times" v-on:click="clearBoostKeyword"></i>
              </span>
            </p>
            <p class="control">
              <button
                class="button has-background-warning"
                type="submit"
                v-on:click="setBoostKeyword"
              >
                <span class="icon">
                  <i class="fas fa-angle-double-up"></i>
                </span>
                <span>Boost</span>
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
    <form v-on:submit.prevent class="field has-addons" v-show="!collapsed">
      <p class="control is-expanded">
        <input
          class="input"
          type="text"
          placeholder="publication DOI(s) or title"
          v-model="addQuery"
          autofocus
        />
      </p>
      <p class="control">
        <button
          class="button level-right has-background-primary-light"
          type="submit"
          v-on:click="add"
          data-tippy-content="Add listed DOIs to selected publications (the list might be separate by different characters or the DOI can also be included in a different format such as BibTeX)."
          v-tippy
        >
          <span class="icon"><i class="fas fa-plus"></i></span>
        </button>
      </p>
    </form>
    <div v-show="!collapsed">
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
          v-on:click="noPublicationWarning = false"
        ></button>
        Cannot find a publication with this or similar title.
      </div>
    </div>
    <PublicationListComponent
      :publications="publications"
      v-on:activate="activatePublication"
      v-on:remove="removePublication"
      v-show="!collapsed && publications.length"
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
    collapsed: Boolean,
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
    setBoostKeyword: function () {
      this.$emit("updateBoost", this.boostKeywordString);
    },
    clearBoostKeyword: function () {
      this.boostKeywordString = "";
      this.$emit("updateBoost", this.boostKeywordString);
    },
    toggleCollapse: function () {
      this.$emit("toggleCollapse", "selected");
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