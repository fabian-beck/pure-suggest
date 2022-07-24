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
            v-show="!sessionStore.isEmpty"
            data-tippy-content="The <b>publications selected as seeds</b> for computing the suggestions, sorted by score."
            v-tippy
          ></b-icon>
        </div>
      </div>
      <div class="level-right" v-show="!sessionStore.isEmpty">
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
          placeholder="DOI(s)/title or search"
          v-model="addQuery"
          data-tippy-content="One or more <b>DOIs</b> (separated by different characters or included in a different format such as BibTeX).<br/>Alternatively, <b>paper title</b> or a unique part of it (only works for one publication)"
          v-tippy
        />
      </p>
      <!-- copies of buttons necessary as just hiding text inside button leads to empty span tag inside buttons and layout issues -->
      <p class="control">
        <b-button
          class="
            button
            level-right
            has-background-primary-light
            is-hidden-touch
          "
          type="submit"
          icon-left="plus-thick"
          @click.stop="add"
          ><span class="key">A</span>dd
        </b-button>
        <b-button
          class="
            button
            level-right
            has-background-primary-light
            is-hidden-desktop
          "
          type="submit"
          icon-left="plus-thick"
          @click.stop="add"
        ></b-button>
      </p>
      <p class="control">
        <b-button
          class="
            button
            level-right
            has-background-primary-light
            ml-1
            is-hidden-touch
          "
          type="submit"
          icon-left="magnify"
          @click.stop="openSearch(false)"
          ><span class="key">S</span>earch</b-button
        >
        <b-button
          class="
            button
            level-right
            has-background-primary-light
            ml-1
            is-hidden-desktop
          "
          type="submit"
          icon-left="magnify"
          @click.stop="openSearch(false)"
        ></b-button>
      </p>
    </form>
    <div>
      <div
        class="notification has-text-centered has-background-primary-light p-2"
        v-show="sessionStore.isEmpty"
      >
        <p>
          To start,
          <b><b-icon icon="plus-thick" size="is-small"></b-icon> add</b>
          publications through a <b>title</b> or
          <a href="https://www.doi.org/"><b>DOI(s)</b></a
          >, <br />
          <b><b-icon icon="magnify" size="is-small"></b-icon> search</b> using
          <b>keywords</b>, or:
        </p>
        <div class="level mt-2">
          <div class="level-item">
            <b-button
              class="button has-background-primary-light"
              icon-left="file-document"
              @click.stop="$emit('loadExample')"
            >
              Load example
            </b-button>
          </div>
          <div class="level-item">
            <b-button
              class="button has-background-primary-light"
              icon-left="import"
              @click="importSession"
            >
              Import session from JSON
            </b-button>
          </div>
        </div>
      </div>
    </div>
    <PublicationListComponent
      :publications="sessionStore.selectedPublications"
      v-on:remove="removePublication"
      v-on:showAbstract="showAbstract"
    />
  </div>
</template>

<script>
import { useSessionStore } from "./../stores/session.js";

import PublicationListComponent from "./PublicationListComponent.vue";
import PublicationQuery from "./../PublicationQuery.js";

export default {
  name: "SelectedPublicationsComponent",
  setup() {
    const sessionStore = useSessionStore();
    return { sessionStore };
  },
  components: {
    PublicationListComponent,
  },
  data() {
    return {
      addQuery: "",
      boostKeywordString: "",
    };
  },
  methods: {
    add: async function () {
      this.$emit("startSearching");
      const publicationQuery = new PublicationQuery(this.addQuery);
      const query = await publicationQuery.execute();
      if (query.dois.length > 0) {
        if (query.ambiguousResult) {
          this.$emit("searchEndedWithoutResult");
          this.openSearch(true);
        } else {
          this.$emit("add", query.dois);
          this.addQuery = "";
        }
      } else {
        this.$emit("searchEndedWithoutResult");
      }
    },
    openSearch: function (ambiguous = false) {
      this.$emit(
        "openSearch",
        this.addQuery,
        ambiguous ? "Several publications might match, please select..." : null
      );
      this.addQuery = "";
    },
    removePublication: function (doi) {
      this.$emit("remove", doi);
    },
    showAbstract: function (publication) {
      this.$emit("showAbstract", publication);
    },
    updateBoost: function () {
      this.sessionStore.setBoostKeywordString(this.boostKeywordString);
    },
    clearBoost: function () {
      this.boostKeywordString = "";
      this.$emit("updateBoost", this.boostKeywordString);
    },
    setBoost: function (boostKeywordString) {
      this.boostKeywordString = boostKeywordString;
    },
    importSession: function () {
      this.$buefy.dialog.confirm({
        title: "Import session",
        message: `<label>Choose an exported session JSON file:&nbsp;</label>
            <input type="file" id="import-json-input" accept="application/JSON"/>`,
        onConfirm: () =>
          this.$emit(
            "importSession",
            document.getElementById("import-json-input").files[0]
          ),
      });
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