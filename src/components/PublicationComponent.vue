<template>
  <li
    class="publication-component media"
    v-bind:class="{ 'has-background-grey-lighter': publication.isActive }"
    v-on:click="$emit('activate', publication.doi)"
  >
    <div
      v-if="suggestion"
      class="media-left has-text-centered"
      v-tooltip="`Referenced by ${publication.referenceCount} and referencing ${publication.citationCount} selected publications.`"
      v-bind:class="{ 'has-background-primary': publication.isReferencedByActive }"
    >
      <div class="is-size-2">{{publication.referenceCount + publication.citationCount}}</div>
      <div class="is-size-7">{{publication.referenceCount}} + {{publication.citationCount}}</div>
    </div>
    <div class="media-content">
      <div class="level is-size-7">
        <div class="doi level-left">
          <label>DOI:</label>
          <a :href="'https://doi.org/'+publication.doi" target="_blank">{{ publication.doi }}</a>
        </div>
        <div class="level-right">
          <div v-if="publication.title" class="level-item">
            <a
              :href="'https://scholar.google.de/scholar?hl=en&q='+publication.title"
              target="_blank"
            >Google Scholar</a>
          </div>
        </div>
      </div>
      <div class="level">
        <span v-if="publication.title">
          <strong>{{publication.title}}</strong>
          ({{publication.authorShort}}, {{publication.year}})
        </span>
        <span v-if="!publication.title">
          <strong>...</strong>
        </span>
      </div>
      <div v-if="publication.isActive" class="is-size-7">
        {{publication.author}};
        <em>{{publication.container}}</em>.
      </div>
    </div>
    <div class="media-right">
      <b-button
        v-if="suggestion"
        class="button is-primary is-small"
        v-on:click="$emit('add', publication.doi)"
      >
        <strong>+</strong>
      </b-button>
    </div>
  </li>
</template>

<script>
export default {
  name: "PublicationComponent",
  props: {
    publication: Object,
    suggestion: Boolean
  }
};
</script>

<style lang="scss" scoped>
@import "~bulma/sass/utilities/_all";

li.publication-component {
  padding: 0;
  margin: 0;
  cursor: pointer;
}
li.publication-component:hover {
  background: $white-ter;
}
.media-left {
  width: 50px;
  margin-left: 1rem;
  margin-bottom: 0.5rem;
}
.media-left div:first-child {
  margin-bottom: -0.5rem;
}
.media-content {
  padding: 0.5rem;
}
.level {
  margin-bottom: 0.2rem !important;
}
.button {
  margin: 0.5rem;
}
label {
  padding-right: 0.2rem;
}
</style>