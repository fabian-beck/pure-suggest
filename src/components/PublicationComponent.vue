<template>
  <li
    class="publication-component media"
    v-bind:class="{
      active: publication.isActive,
      selected: publication.isSelected,
      linkedToActive: publication.isLinkedToActive,
    }"
    v-on:click="$emit('activate', publication.doi)"
  >
    <div
      class="media-left has-text-centered"
      v-bind:style="{ 'background-color': publication.scoreColor }"
    >
      <tippy>
        <template v-slot:trigger>
          <div class="tooltip-target">
            <div class="is-size-3 is-inline-block">{{ publication.score }}</div>
            <div
              class="has-background-warning is-size-7 is-inline-block p-1 ml-1"
              v-if="publication.boostFactor > 1"
            >
              <i class="fas fa-angle-double-up"></i>
            </div>
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
          <br />
          Marked as refered by or referencing currently active publication.
        </div>
        <div v-if="publication.isActive">
          <br />
          Currently active, with linked publications highlighted.
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
        <label>DOI:</label>
        <a :href="'https://doi.org/' + publication.doi" target="_blank">{{
          publication.doi
        }}</a>
      </div>
      <div v-if="publication.isActive" class="level is-size-7">
        <div class="doi level-left">
          <div class="level-item">
            <label>Citing:</label> {{ publication.referenceDois.length }}
          </div>
          <div class="level-item">
            <label>Cited by:</label> {{ publication.citationDois.length }}
          </div>
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
          data-tippy-content="Remove publication from the list and exclude for suggestions."
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

  &:hover {
    background: $white-ter;
  }

  &.active {
    background: $grey-lighter;
  }

  & .media-left {
    width: 5rem;
    height: 5rem;
    margin: 0.5rem;
    border-width: 0.125rem;
    border-color: $info;
    border-style: solid;
  }

  &.selected .media-left {
    border-color: $primary;
  }

  &.active .media-left {
    border-width: 0.375rem;
  }

  &.linkedToActive .media-left {
    border-width: 0.25rem;
  }

  & .media-content {
    padding: 0.5rem;
  }

  & .level {
    margin-bottom: 0.2rem !important;

    & .level-left .level-item {
      margin-right: 1.5rem;
    }
  }

  & .button {
    margin: 0.5rem 0;
  }

  & label {
    padding-right: 0.2rem;
  }

  & .media-right {
    margin-right: 0.5rem;
  }
}
</style>