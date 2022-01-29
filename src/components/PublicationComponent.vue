<template>
  <li
    class="publication-component media"
    v-bind:class="{
      'has-background-grey-lighter': publication.isActive,
      'has-background-primary-light':
        !suggestion && publication.isLinkedToActive,
      'has-background-info-light': suggestion && publication.isLinkedToActive,
      active: publication.isActive,
    }"
    v-on:click="$emit('activate', publication.doi)"
  >
    <div
      class="media-left has-text-centered"
      v-bind:class="{
        'has-background-primary': publication.isActive,
        'has-background-white-bis':
          !publication.isActive &&
          publication.score >= 2 &&
          publication.score < 3,
        'has-background-white-ter':
          !publication.isActive &&
          publication.score >= 3 &&
          publication.score < 5,
        'has-background-grey-lighter':
          !publication.isActive &&
          publication.score >= 5 &&
          publication.score < 10,
        'has-background-grey-light':
          !publication.isActive &&
          publication.score >= 10 &&
          publication.score < 20,
        'has-background-grey': !publication.isActive && publication.score >= 20,
      }"
    >
      <tippy>
        <template v-slot:trigger>
          <div class="tooltip-target">
            <div class="is-size-2 is-inline-block">{{ publication.score }}</div>
            <div
              class="has-background-warning is-size-7 is-inline-block p-1 ml-1"
              v-if="publication.boostFactor > 1"
            >
              <i class="fas fa-angle-double-up"></i
            ></div>
          </div>
          <div class="is-size-7">
            {{ publication.referenceCount }}
            <i class="fas fa-arrow-left"></i>
            + {{ publication.citationCount }}
            <i class="fas fa-arrow-right"></i>
          </div>
        </template>
        <div>
          Suggestion score of
          <b>{{ publication.score }}</b
          >:<br />
          Referenced by <b>{{ publication.referenceCount }}</b> (<i
            class="fas fa-arrow-left"
          ></i
          >) and referencing <b>{{ publication.citationCount }}</b> (<i
            class="fas fa-arrow-right"
          ></i
          >) selected publications<span v-if="publication.boostFactor != 1"
            >, multiplied by a boost factor of
            <b>{{ publication.boostFactor }}</b> (<i
              class="fas fa-angle-double-up"
            ></i
            >)</span
          >.
        </div>
        <div v-if="publication.isLinkedToActive">
          Marked as refered by or referencing highlighted selected publication.
        </div>
        <div v-if="publication.isActive">
          Currently highlighted with marked selected publications indicating
          reference links.
        </div>
      </tippy>
    </div>
    <div class="media-content">
      <div class="level">
        <span v-if="publication.title">
          <strong
            ><span
              v-html="
                publication.titleHighlighted
                  ? publication.titleHighlighted
                  : publication.title
              "
            ></span
            >&nbsp;</strong
          >
          <span v-if="publication.shortReference"
            >({{ publication.shortReference }})</span
          >
        </span>
        <span v-if="!publication.title">
          <strong>...</strong>
        </span>
      </div>
      <div
        v-if="
          publication.isActive &&
          publication.title &&
          publication.author &&
          publication.container
        "
        class="is-size-7"
      >
        {{ publication.author }}. <em>{{ publication.container }}</em
        >.
      </div>
      <div v-if="publication.isActive" class="level is-size-7">
        <div class="doi level-left">
          <label>DOI:</label>
          <a :href="'https://doi.org/' + publication.doi" target="_blank">{{
            publication.doi
          }}</a>
        </div>
        <div class="level-right">
          <div
            v-if="publication.title && publication.isActive"
            class="level-item"
          >
            <a
              :href="
                'https://scholar.google.de/scholar?hl=en&q=' + publication.title
              "
              target="_blank"
              >Google Scholar</a
            >
          </div>
        </div>
      </div>
    </div>
    <div class="media-right">
      <div>
        <button
          v-if="suggestion"
          class="button is-primary is-small"
          data-tippy-content="Add publication to list of selected publications."
          v-on:click.stop="$emit('add', publication.doi)"
          v-tippy
        >
          <span class="icon">
            <i class="fas fa-plus"></i>
          </span>
        </button>
      </div>
      <div>
        <button
          class="button is-small"
          data-tippy-content="Remove publication from the list of publications."
          v-on:click.stop="$emit('remove', publication.doi)"
          v-tippy
        >
          <span class="icon">
            <i class="fas fa-minus"></i>
          </span>
        </button>
      </div>
    </div>
  </li>
</template>

<script>
export default {
  name: "PublicationComponent",
  props: {
    publication: Object,
    suggestion: Boolean,
  },
};
</script>

<style lang="scss" scoped>
@import "~bulma/sass/utilities/_all";

li.publication-component {
  padding: 0;
  margin: 0;
  cursor: pointer;
  min-height: 5rem;
}
li.publication-component:hover {
  background: $white-ter;
}
.media-left {
  width: 5rem;
  padding-bottom: 0.6rem;
}
.stats-selected {
  padding-top: 0.5rem;
}
.media-content {
  padding: 0.5rem;
}
.level {
  margin-bottom: 0.2rem !important;
}
.button {
  margin: 0.25rem;
}
label {
  padding-right: 0.2rem;
}
.media-right {
  margin-right: 0.5rem;
}
</style>