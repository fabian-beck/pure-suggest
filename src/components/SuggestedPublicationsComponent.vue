<template>
  <div class="suggested-publications box has-background-info">
    <div class="level box-header">
      <div class="level-left has-text-white">
        <div
          class="level-item"
          data-tippy-content="The <b>suggested publications</b> based on references to and from the selected publications, sorted by score."
          v-tippy
        >
          <b-icon icon="water-plus-outline"></b-icon>
          <h2 class="is-size-5 ml-2">Suggested</h2>
        </div>
        <div class="level-item" v-if="sessionStore.suggestion">
          <b-field
            class="ml-5"
            data-tippy-content="Activate/deactivate <b>filter</b> to restrict suggested publications by different criteria."
            v-tippy
          >
            <b-switch v-model="isFilterPanelShown" type="is-black"
              ><b-icon icon="filter" size="is-small"></b-icon>&nbsp;<span
                class="key"
                >F</span
              >ilter</b-switch
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
        class="
          notification
          has-background-info-light
          p-2
          pt-3
          columns
          is-gapless
        "
        v-show="isFilterPanelShown"
      >
        <div class="column">
          <b-field
            label="Search"
            label-position="on-border"
            data-tippy-content="Filter by <b>search in title and meta-data</b> such as authors and containing publication (e.g., journal name)."
            v-tippy
          >
            <p class="control">
              <b-button
                icon-left="card-search"
                :class="{
                  active: filterString,
                }"
                class="is-static"
              ></b-button>
            </p>
            <b-input
              v-model="filterString"
              placeholder="Text"
              @input="updateFilter"
              icon-right="close-circle"
              icon-right-clickable
              @icon-right-click="clearFilterString"
              expanded
            ></b-input>
          </b-field>
        </div>
        <div class="column">
          <b-field
            label="Year"
            label-position="on-border"
            data-tippy-content="Filter by <b>publication year</b> (leave blank for unrestricted start/end year)."
            v-tippy
          >
            <p class="control">
              <b-button
                icon-left="calendar"
                :class="{
                  active: sessionStore.filter.isYearActive(),
                }"
                class="is-static"
              ></b-button>
            </p>
            <b-field expanded>
              <b-input
                id="filter-year-start"
                v-model="filterYearStart"
                placeholder="From"
                type="text"
                pattern="\d\d\d\d"
                validation-message="Enter a four-digit year."
                @input="updateFilter"
              ></b-input>
            </b-field>
            <b-field expanded>
              <b-input
                id="filter-year-end"
                v-model="filterYearEnd"
                placeholder="To"
                type="text"
                pattern="\d\d\d\d"
                validation-message="Enter a four-digit year."
                @input="updateFilter"
              ></b-input>
            </b-field>
          </b-field>
        </div>
        <div class="column">
          <b-field
            label="Tag"
            label-position="on-border"
            data-tippy-content="Filter by automatically <b>assigned tag</b>."
            v-tippy
          >
            <p class="control">
              <b-button
                icon-left="tag"
                :class="{
                  active: filterTag,
                }"
                class="is-static"
              ></b-button>
            </p>
            <b-select
              id="filter-tag"
              @input="updateFilter"
              v-model="filterTag"
              :class="{
                inactive: !filterTag,
              }"
              expanded
            >
              <option value="">* (no/any)</option>
              <option v-for="tag in TAGS" :value="tag.value" :key="tag.value">
                {{ tag.name }}
              </option>
            </b-select>
          </b-field>
        </div>
      </div>
    </div>
    <PublicationListComponent
      ref="publicationList"
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
      filterString: "",
      filterYearStart: "",
      filterYearEnd: "",
      filterTag: "",
    };
  },
  watch: {
    isFilterPanelShown: {
      handler: function () {
        this.updateFilter();
      },
    },
  },
  mounted() {
    this.sessionStore.$onAction(({ name, after }) => {
      after(() => {
        if (name === "updateQueued") {
          this.$refs.publicationList.$el.scrollTop = 0;
        }
      });
    });
  },
  methods: {
    addPublication: function (doi) {
      this.sessionStore.queueForSelected(doi);
    },
    updateFilter: function () {
      if (this.isFilterPanelShown) {
        this.sessionStore.filter.string = this.filterString;
        this.sessionStore.filter.yearStart = this.filterYearStart;
        this.sessionStore.filter.yearEnd = this.filterYearEnd;
        this.sessionStore.filter.tag = this.filterTag;
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

    & .column:not(:first-child) {
      margin-left: 0.25rem;
    }

    & .active {
      background: $white;
      color: $info-dark;
    }

    & .is-expanded {
      width: 100%;
    }
  }

  & .publication-list {
    max-height: 100%;
    overflow-y: scroll;
    border: 1px solid $border;
  }
}

@include mobile {
  .box .notification {
    & .column {
      margin-left: 0 !important;
    }

    & .column:not(:first-child) {
      margin-top: 0.75rem;
    }
  }
}
</style>
<style lang="scss">
#filter-year-start {
  border-radius: 0;
}

#filter-year-end {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.inactive #filter-tag {
  color: rgba(54, 54, 54, 0.3);
}
</style>