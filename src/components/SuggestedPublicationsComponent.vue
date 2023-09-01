<template>
  <div class="suggested-publications box has-background-info">
    <div class="level box-header">
      <div class="level-left has-text-white">
        <div class="level-item"
          v-tippy="`The <b>suggested publications</b> based on references to and from the selected publications, sorted by score.`">
          <v-icon class="has-text-white">mdi-water-plus-outline</v-icon>
          <h2 class="is-size-5 ml-2">Suggested</h2>
        </div>
      </div>
      <div class="level-right has-text-white" v-if="sessionStore.suggestion">
        <div class="level-item">
          <tippy>
            <div class="mr-2">
              <v-icon size="18" color="white" class="mr-1" v-show="isFilterPanelShown">mdi-filter</v-icon>
              <v-badge :content="sessionStore.unreadSuggestionsCount" color="black" class="mr-3" offset-y="-4"
                offset-x="-9" :value="sessionStore.unreadSuggestionsCount > 0" transition="scale-rotate-transition">
                <b>{{ sessionStore.suggestedPublicationsFiltered.length }}</b>
              </v-badge>
              <span> of
                <b>
                  {{
                    sessionStore.suggestion.totalSuggestions.toLocaleString("en")
                  }}
                </b></span>
            </div>
            <template #content>
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
            </template>
          </tippy>
          <CompactButton icon="mdi-playlist-plus has-text-white" class="ml-2"
            v-tippy="'Load more suggested publications.'" v-on:click="sessionStore.loadMoreSuggestions()" :disabled="sessionStore.suggestedPublications.length ===
              sessionStore.suggestion.totalSuggestions
              "></CompactButton>
        </div>
        <div class="level-item" v-if="sessionStore.suggestion">
          <CompactSwitch v-model="isFilterPanelShown" class="ml-5" hide-details density="compact"
            v-tippy="`Activate/deactivate <b>filter</b> to restrict suggested publications by different criteria.`">
          </CompactSwitch>
          <v-icon size="18" color="white" class="mr-1 ml-4">mdi-filter</v-icon>
          <span class="key">F</span>ilter
        </div>
      </div>
    </div>
    <div>
      <v-expand-transition>
        <FilterPanel v-show="isFilterPanelShown"/>
        <!-- <div class="
            notification
            has-background-info-light
            p-2
            pt-3
            columns
            is-gapless
          " v-show="isFilterPanelShown">
          <div class="column" v-tippy="`Filter by <b>search in meta-data</b> such as title, authors, and journal name.`">
            <div class="field is-floating-label">
              <label class="label">Keywords</label>
              <div class="control">
                <input type="text" v-model="filterString" placeholder="Text" @input="updateFilter" class="input" />
              </div>
            </div>
          </div>
          <div class="column"
            v-tippy="`Filter by <b>publication year</b> (four digit year; leave blank for unrestricted start/end year).`">
            <div class="field is-floating-label">
              <label class="label">Year</label>
              <div class="control">
                <input type="text" v-model="filterYearStart" placeholder="From" class="input" @input="updateFilter" />
              </div>
            </div>
            <div class="field">
              <div class="control">
                <input type="text" v-model="filterYearEnd" placeholder="To" class="input" @input="updateFilter" />
              </div>
            </div>
          </div>
          <div class="column" v-tippy="`Filter by automatically <b>assigned tag</b>.`">
            <div class="field is-floating-label">
              <label class="label">Tag</label>
              <div class="control">
                <div class="select is-fullwidth">
                  <select id="filter-tag" @click="updateFilter" v-model="filterTag">
                    <option value="">None/any</option>
                    <option v-for="tag in TAGS" :value="tag.value" :key="tag.value">
                      {{ tag.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div> -->
      </v-expand-transition>
    </div>
    <PublicationListComponent ref="publicationList" :publications="sessionStore.suggestedPublicationsFiltered" />
  </div>
</template>

<script>
import { storeToRefs } from "pinia";

import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";

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
  mounted() {
    this.sessionStore.$onAction(({ name, after }) => {
      after(() => {
        if (name === "updateQueued") {
          this.$refs.publicationList.$el.scrollTop = 0;
        }
      });
    });
  },
};
</script>

<style lang="scss" scoped>
.box {
  display: grid;
  grid-template-rows: max-content max-content auto;
  position: relative;

  & .notification {
    margin-bottom: 0;
    border-radius: 0;
  }

  & .publication-list {
    @include scrollable-list;
  }
}
</style>