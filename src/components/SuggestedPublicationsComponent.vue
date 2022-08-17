<template>
  <div class="suggested-publications box has-background-info">
    <div class="level box-header">
      <div class="level-left has-text-white">
        <div class="level-item">
          <b-icon icon="water-plus-outline"></b-icon>
          <h2 class="is-size-5 ml-2">Suggested</h2>
          <b-icon
            icon="information-outline"
            size="is-small"
            class="ml-2"
            v-show="sessionStore.suggestion"
            data-tippy-content="The <b>suggested publications</b> based on references to and from the selected publications, sorted by score."
            v-tippy
          ></b-icon>
        </div>
        <div class="level-item" v-if="sessionStore.suggestion">
          <b-field
            class="ml-4"
            data-tippy-content="Activate/deactivate <b>filter</b> to restrict suggested publications by different criteria."
            v-tippy
          >
            <b-switch v-model="isFilterPanelShown" type="is-black"
              ><b-icon icon="filter" size="is-small"></b-icon>
              <span class="key">F</span>ilter</b-switch
            >
          </b-field>
        </div>
      </div>
      <div class="level-right has-text-white" v-if="sessionStore.suggestion">
        <div class="level-item">
          <tippy>
            <template v-slot:trigger>
              <div>
                <span
                  ><b-icon
                    icon="filter"
                    size="is-small"
                    v-show="isFilterPanelShown"
                  ></b-icon>
                  {{ sessionStore.suggestedPublicationsFiltered.length }}
                  <b-tag
                    icon="bell"
                    size="is-small"
                    v-if="sessionStore.unreadSuggestionsCount > 0"
                    >{{ sessionStore.unreadSuggestionsCount }}</b-tag
                  >
                  of
                  {{
                    sessionStore.currentTotalSuggestions.toLocaleString("en")
                  }}
                </span>
              </div>
            </template>
            <div>
              <b>{{ sessionStore.suggestedPublicationsFiltered.length }}</b>
              suggested publication{{
                sessionStore.suggestedPublicationsFiltered.length > 1 ? "s" : ""
              }}
              <span v-if="sessionStore.unreadSuggestionsCount > 0">
                <b>({{ sessionStore.unreadSuggestionsCount }}</b> of them
                unread)
              </span>
              <span v-if="isFilterPanelShown">
                filtered from
                <b>{{
                  sessionStore.suggestedPublicationsWithoutQueued.length
                }}</b>
                loaded ones,
              </span>
              of in total
              <b>
                {{
                  sessionStore.currentTotalSuggestions.toLocaleString("en")
                }}</b
              >
              cited/citing publication{{
                sessionStore.currentTotalSuggestions > 1 ? "s" : ""
              }}.
            </div>
          </tippy>
          <b-button
            class="compact-button"
            icon-left="playlist-plus"
            data-tippy-content="Load more suggested publications."
            v-tippy
            @click.stop="$emit('loadMore')"
            :disabled="
              sessionStore.suggestedPublicationsWithoutQueued.length ===
              sessionStore.currentTotalSuggestions
            "
          ></b-button>
        </div>
      </div>
    </div>
    <div>
      <div
        class="notification has-background-info-light media p-2"
        v-show="isFilterPanelShown"
      >
        <div class="media-left">
          <b-icon icon="filter" class="m-2"></b-icon>
        </div>
        <div class="media-content columns is-gapless">
          <div class="column">
            <b-field
              data-tippy-content="Filter by search in title and meta-data such as authors and containing publication (e.g., journal name)."
              v-tippy
            >
              <b-input
                v-model="filterString"
                icon="card-search"
                placeholder="Search in title and meta-data"
                @input="updateFilter"
                icon-right="close-circle"
                icon-right-clickable
                @icon-right-click="clearFilterString"
              ></b-input>
            </b-field>
          </div>
          <div class="column">
            <b-field
              data-tippy-content="Filter by automatically assigned tag."
              v-tippy
            >
              <b-select
                @input="updateFilter"
                v-model="filterTag"
                icon="tag"
                expanded
              >
                <option value="">* (no/any tag)</option>
                <option v-for="tag in TAGS" :value="tag.value" :key="tag.value">
                  {{ tag.name }}
                </option>
              </b-select>
            </b-field>
          </div>
        </div>
      </div>
    </div>
    <PublicationListComponent
      :publications="sessionStore.suggestedPublicationsFiltered"
      :suggestion="true"
      v-on:add="addPublication"
    />
  </div>
</template>

<script>
import { storeToRefs } from "pinia";

import { useSessionStore } from "./../stores/session.js";
import { useInterfaceStore } from "./../stores/interface.js";
import Publication from "./../Publication.js";
import Filter from "./../Filter.js";

import PublicationListComponent from "./PublicationListComponent.vue";

export default {
  name: "SuggestedPublicationsComponent",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    const { isFilterPanelShown } = storeToRefs(interfaceStore);
    return { sessionStore, isFilterPanelShown };
  },
  components: {
    PublicationListComponent,
  },
  props: {
    title: String,
  },
  data() {
    return {
      TAGS: Publication.TAGS,
      filterTag: "",
      filterString: "",
    };
  },
  watch: {
    isFilterPanelShown: {
      handler: function () {
        this.updateFilter();
      },
    },
  },
  methods: {
    addPublication: function (doi) {
      this.sessionStore.queueForSelected(doi);
    },
    updateFilter: function () {
      if (this.isFilterPanelShown) {
        this.sessionStore.filter.tag = this.filterTag;
        this.sessionStore.filter.string = this.filterString;
      } else {
        this.sessionStore.filter = new Filter();
      }
    },
    clearFilterString: function () {
      this.filterString = "";
      this.updateFilter();
    },
  },
};
</script>

<style lang="scss" scoped>
@import "~bulma/sass/utilities/_all";
.box {
  display: grid;
  grid-template-rows: max-content max-content auto;
  position: relative;

  & .box-header .tag {
    position: relative;
    top: -0.4rem;
    padding: 0 0.2rem;
    height: 1.2rem;
    background-color: $info-light;
    color: $info-dark;
  }

  & .notification {
    margin-bottom: 0;
    box-shadow: 0 0.05rem 0.25rem grey;
    border-radius: 0;
  }
}
.publication-list {
  max-height: 100%;
  overflow-y: scroll;
  border: 1px solid $border;
}
</style>