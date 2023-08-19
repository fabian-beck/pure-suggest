<template>
  <div class="suggested-publications box has-background-info">
    <div class="level box-header">
      <div class="level-left has-text-white">
        <div class="level-item"
          data-tippy-content="The <b>suggested publications</b> based on references to and from the selected publications, sorted by score."
          v-tippy>
          <v-icon class="has-text-white">mdi-water-plus-outline</v-icon>
          <h2 class="is-size-5 ml-2">Suggested</h2>
        </div>
      </div>
      <div class="level-right has-text-white" v-if="sessionStore.suggestion">
        <div class="level-item">
          <tippy>
            <template v-slot:trigger>
              <div class="mr-2">
                <v-icon size="18" color="white" class="mr-1" v-show="isFilterPanelShown">mdi-filter</v-icon>
                <v-badge :content="sessionStore.unreadSuggestionsCount" color="black" class="mr-2" offset-y="7"
                  :value="sessionStore.unreadSuggestionsCount > 0" transition="scale-rotate-transition">
                  <b>{{ sessionStore.suggestedPublicationsFiltered.length }}</b>
                </v-badge>
                <span> of
                  <b>
                    {{
                      sessionStore.suggestion.totalSuggestions.toLocaleString("en")
                    }}
                  </b></span>
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
                  sessionStore.suggestedPublications.length
                }}</b>
                loaded ones,
              </span>
              of in total
              <b>
                {{
                  sessionStore.suggestion.totalSuggestions.toLocaleString("en")
                }}</b>
              cited/citing publication{{
                sessionStore.suggestion.totalSuggestions > 1 ? "s" : ""
              }}.
            </div>
          </tippy>
          <CompactButton icon="mdi-playlist-plus has-text-white" class="ml-2"
            data-tippy-content="Load more suggested publications." v-tippy v-on:click="sessionStore.loadMoreSuggestions()"
            :disabled="sessionStore.suggestedPublications.length ===
              sessionStore.suggestion.totalSuggestions
              "></CompactButton>
        </div>
        <div class="level-item" v-if="sessionStore.suggestion">
          <v-switch v-model="isFilterPanelShown" class="ml-5" hide-details color="white"
            data-tippy-content="Activate/deactivate <b>filter</b> to restrict suggested publications by different criteria."
            v-tippy>
          </v-switch>
          <v-icon size="18" color="white" class="mr-1">mdi-filter</v-icon>
          <span class="key">F</span>ilter
        </div>
      </div>
    </div>
    <div>
      <div class="
          notification
          has-background-info-light
          p-2
          pt-3
          columns
          is-gapless
        " v-show="isFilterPanelShown">
        <div class="column">
          <b-field label="Search" label-position="on-border"
            data-tippy-content="Filter by <b>search in meta-data</b> such as title, authors, and journal name." v-tippy>
            <p class="control">
              <b-button icon-left="card-search" :class="{
                active: filterString,
              }" class="is-static"></b-button>
            </p>
            <b-input v-model="filterString" placeholder="Text" @input="updateFilter" icon-right="close-circle"
              icon-right-clickable @icon-right-click="clearFilterString" expanded></b-input>
          </b-field>
        </div>
        <div class="column">
          <b-field label="Year" label-position="on-border"
            data-tippy-content="Filter by <b>publication year</b> (leave blank for unrestricted start/end year)." v-tippy>
            <p class="control">
              <b-button icon-left="calendar" :class="{
                active: sessionStore.filter.isYearActive(),
              }" class="is-static"></b-button>
            </p>
            <b-field expanded>
              <b-input id="filter-year-start" v-model="filterYearStart" placeholder="From" type="text" pattern="\d\d\d\d"
                validation-message="Enter a four-digit year." @input="updateFilter"></b-input>
            </b-field>
            <b-field expanded>
              <b-input id="filter-year-end" v-model="filterYearEnd" placeholder="To" type="text" pattern="\d\d\d\d"
                validation-message="Enter a four-digit year." @input="updateFilter"></b-input>
            </b-field>
          </b-field>
        </div>
        <div class="column">
          <b-field label="Tag" label-position="on-border"
            data-tippy-content="Filter by automatically <b>assigned tag</b>." v-tippy>
            <p class="control">
              <b-button icon-left="tag" :class="{
                active: filterTag,
              }" class="is-static"></b-button>
            </p>
            <b-select id="filter-tag" @input="updateFilter" v-model="filterTag" :class="{
              inactive: !filterTag,
            }" expanded>
              <option value="">None/any</option>
              <option v-for="tag in TAGS" :value="tag.value" :key="tag.value">
                {{ tag.name }}
              </option>
            </b-select>
          </b-field>
        </div>
      </div>
    </div>
    <PublicationListComponent ref="publicationList" :publications="sessionStore.suggestedPublicationsFiltered" />
  </div>
</template>

<script>
import { storeToRefs } from "pinia";

import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";
import Publication from "@/Publication.js";
import Filter from "@/Filter.js";

export default {
  name: "SuggestedPublicationsComponent",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    const { isFilterPanelShown } = storeToRefs(interfaceStore);
    return { sessionStore, isFilterPanelShown };
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
.box {
  display: grid;
  grid-template-rows: max-content max-content auto;
  position: relative;

  & .box-header {
    & .v-input {
      margin: 0;
    }
  }

  & .notification {
    margin-bottom: 0;
    border-radius: 0;

    & .column:not(:first-child) {
      margin-left: 0.5vw;
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
    @include scrollable-list;
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