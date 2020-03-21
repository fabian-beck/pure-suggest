<template>
  <li class="publication-component media">
    <div class="media-content">
      <div class="level">
        <span v-if="publication.title">
          <strong>{{publication.title}}</strong>
          ({{publication.author}}, {{publication.year}})
        </span>
        <span v-if="!publication.title">
          <strong>...</strong>
        </span>
      </div>
      <div class="level">
        <div class="doi level-left">
          <a :href="'https://doi.org/'+publication.doi">{{ publication.doi }}</a>
        </div>
        <div class="level-right">
          <div v-if="suggestion" class="level-item">
            <span>
              Referencing
              <strong>{{publication.citationCount}}</strong> and referenced by
              <strong>{{publication.referenceCount}}</strong> selected publications
            </span>
          </div>
        </div>
      </div>
    </div>
    <b-button
      v-if="suggestion"
      class="button is-link is-small media-right"
      v-on:click="$emit('add', publication.doi)"
    >+</b-button>
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

<style scoped>
li.publication-component {
  padding: 0;
  margin: 0;
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
</style>