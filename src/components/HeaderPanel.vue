<template>
  <div class="box p-0 m-0 is-radiusless">
    <b-navbar :fixed-top="isMobile" class="box p-0 m-0 is-radiusless">
      <template #brand>
        <b-navbar-item>
          <b-icon
            icon="water-plus-outline"
            size="is-medium"
            class="has-text-grey"
          ></b-icon>
          <h1 class="title ml-2">
            <span v-html="$appNameHtml"></span>
          </h1>
        </b-navbar-item>
      </template>
      <template #start>
        <b-navbar-dropdown
          :label="`Session (${selectedPublicationsCount} selected${
            excludedPublicationsCount
              ? `; ${excludedPublicationsCount} excluded`
              : ''
          })`"
          v-show="selectedPublicationsCount"
        >
          <b-navbar-item @click="$emit('exportSession')">
            <b-icon icon="export"></b-icon>
            <span class="ml-2">Export session as JSON</span>
          </b-navbar-item>
          <b-navbar-item @click="$emit('exportBibtex')">
            <b-icon icon="export"></b-icon>
            <span class="ml-2">Export selected as BibTeX</span>
          </b-navbar-item>
          <b-navbar-item
            @click="$emit('clearSession')"
            class="has-text-danger"
          >
            <b-icon icon="delete"></b-icon
            ><span class="ml-2"><span class="key">C</span>lear session</span>
          </b-navbar-item>
        </b-navbar-dropdown>
      </template>
      <template #end>
        <b-navbar-dropdown
          label="⋮"
          icon-left="dots-vertical"
          right
          collapsible
        >
          <b-navbar-item
            @click="$emit('openKeyboardControls')"
            class="is-hidden-touch"
            >Keyboard controls</b-navbar-item
          >
          <b-navbar-item @click="$emit('openAbout')">About</b-navbar-item>
          <b-navbar-item @click="$emit('clearCache')" class="has-text-danger">
            <b-icon icon="cached"></b-icon
            ><span class="ml-2">Clear cache (and session)</span>
          </b-navbar-item>
        </b-navbar-dropdown>
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
    excludedPublicationsCount: Number,
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