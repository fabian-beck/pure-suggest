<template>
  <div class="card">
    <header class="card-header has-background-primary">
      <p class="card-header-title has-text-white">Search</p>
    </header>
    <div class="card-content">
      <div class="content">
        <section>
          <form v-on:submit.prevent="search" class="field has-addons">
            <p class="control is-expanded">
              <input
                class="input search-publication"
                type="text"
                placeholder="Search query"
                v-model="searchQuery"
                ref="searchInput"
              />
            </p>
            <p class="control">
              <b-button
                class="button level-right has-background-primary-light"
                type="submit"
                icon-left="magnify"
                @click.stop="search"
              >
                Search
              </b-button>
            </p>
          </form>
          <ul class="publication-list">
            <li
              v-for="item in filteredSearchResults"
              class="publication-component media"
              :key="item.DOI"
            >
              <div class="media-content">
                <b>
                  {{
                    item.title[0] +
                    (item.subtitle && item.title[0] !== item.subtitle[0]
                      ? " " + item.subtitle[0]
                      : "")
                  }} </b
                ><span v-if="item.author">
                  {{ createShortReference(item) }}</span
                >
                <span>
                  DOI:
                  <a :href="`https://doi.org/${item.DOI}`">{{ item.DOI }}</a>
                </span>
                <span>
                  <a
                    :href="`https://scholar.google.de/scholar?hl=en&q=${
                      item.title
                    } ${
                      item.author
                        ? item.author.map((name) => name.family).join(' ')
                        : ''
                    }`"
                    class="ml-2"
                  >
                    <b-icon icon="school" size="is-small"></b-icon
                  ></a>
                </span>
              </div>
              <div class="media-right">
                <div>
                  <b-button
                    class="is-primary is-small"
                    icon-left="plus-thick"
                    data-tippy-content="Add publication to list of selected publications."
                    @click.stop="$emit('add', item.DOI)"
                    v-tippy
                  >
                  </b-button>
                </div>
              </div>
            </li>
            <b-loading v-model="isLoading"></b-loading>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import PublicationSearch from "./../PublicationSearch.js";

export default {
  name: "SearchPanel",
  props: {
    selectedPublicationsDois: Array,
  },
  data() {
    return {
      searchQuery: "",
      searchResults: [],
      isLoading: false,
    };
  },
  mounted() {
    setTimeout(() => {
      this.$refs.searchInput.focus();
    }, 300);
  },
  computed: {
    filteredSearchResults: function () {
      return this.searchResults.filter(
        (item) => !this.selectedPublicationsDois.includes(item.DOI)
      );
    },
  },

  methods: {
    search: async function () {
      this.isLoading = true;
      const publicationSearch = new PublicationSearch(this.searchQuery);
      this.searchResults = await publicationSearch.execute();
      this.isLoading = false;
    },
    createShortReference: function (item) {
      const lastNames = item.author
        .filter((name) => name.family)
        .map((name) => name.family);
      let authorShort = "";
      if (lastNames.length > 0) {
        authorShort = lastNames[0];
        if (lastNames.length === 2) {
          authorShort += " and " + lastNames[1];
        } else {
          authorShort += " et al.";
        }
      }
      let year = "";
      if (item.published) {
        year = item.published["date-parts"][0][0];
      }
      if (authorShort && year) {
        return `(${authorShort}, ${year})`;
      }
      return `(${authorShort + year})`;
    },
  },
};
</script>

<style lang="scss" scoped>
@import "~bulma/sass/utilities/_all";

.publication-list {
  padding: 0;
  margin: 0;
  list-style: none;
  height: 50vh;
  overflow-y: scroll;
  border: 1px solid $border;
}

.publication-list li {
  padding: 0.5rem;
}
</style>