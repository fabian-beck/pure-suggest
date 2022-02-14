<template>
  <div class="box p-0 m-0 is-radiusless">
    <b-navbar :fixed-top="isMobile">
      <template #brand>
        <b-navbar-item>
          <b-icon icon="tint" size="is-medium" class="has-text-grey"></b-icon>
          <h1 class="title">
            <span v-html="$appNameHtml"></span>
          </h1>
        </b-navbar-item>
      </template>
      <template #start>
        <b-navbar-dropdown
          :label="'Session (' + selectedPublicationsCount + ' selected)'"
          v-show="selectedPublicationsCount"
        >
          <b-navbar-item v-on:click="$emit('exportDois')">
            <b-icon icon="share-square" size="is-small"></b-icon>
            <span class="ml-2">Export selected as DOIs</span>
          </b-navbar-item>
          <b-navbar-item v-on:click="$emit('exportBibtex')">
            <b-icon icon="share-square" size="is-small"></b-icon>
            <span class="ml-2">Export selected as BibTeX</span>
          </b-navbar-item>
          <b-navbar-item
            v-on:click="$emit('clearSelection')"
            class="has-text-danger"
          >
            <b-icon icon="trash" size="is-small"></b-icon
            ><span class="ml-2">Clear</span>
          </b-navbar-item>
        </b-navbar-dropdown>
      </template>
      <template #end>
        <b-navbar-item v-on:click="$emit('openAbout')"> About </b-navbar-item>
      </template>
    </b-navbar>
    <div class="columns" v-show="selectedPublicationsCount === 0">
      <div class="column">
        <div class="subtitle level-item mt-2">
          {{ this.$appSubtitle }}
        </div>
      </div>
      <div class="column is-three-quarters">
        <div
          class="notification has-text-centered p-2"
          v-show="selectedPublicationsCount === 0"
        >
          <p>
            Based on a set of selected publications,
            <b class="has-text-info">suggest</b>ing related
            <b class="has-text-primary">pu</b>blications connected by
            <b class="has-text-primary">re</b>ferences.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "HeaderPanel",
  props: {
    isMobile: Boolean,
    selectedPublicationsCount: Number,
  },
};
</script>

<style lang="scss" scoped>
@import "~bulma/sass/utilities/_all";

.title {
  font-size: $size-4;
}

.subtitle {
  font-size: $size-5;
}

.columns {
  & .column {
    margin: $block-spacing;
  }
}
</style>