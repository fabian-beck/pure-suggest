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
                class="input add-publication"
                type="text"
                placeholder="title search query"
                v-model="searchQuery"
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
          <ul>
            <li
              v-for="item in searchResults"
              :key="item.DOI"
              @click.stop="$emit('add', item.DOI)"
            >
              <b>
                {{
                  item.title[0] +
                  (item.subtitle && item.title[0] !== item.subtitle[0]
                    ? " " + item.subtitle[0]
                    : "")
                }}. </b
              ><span v-if="item.author">
                {{
                  item.author
                    .filter((name) => name.family)
                    .map((name) => name.family)
                }}.</span
              ><span v-if="item.issued"> {{ item.issued }}.</span>
            </li>
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
  data() {
    return {
      searchQuery: "",
      searchResults: [],
    };
  },
  methods: {
    search: async function () {
      const publicationSearch = new PublicationSearch(this.searchQuery);
      this.searchResults = await publicationSearch.execute();
      console.log(this.searchResults);
    },
  },
};
</script>

<style>
</style>