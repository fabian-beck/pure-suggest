<template>
  <ul class="publication-list has-background-white">
    <PublicationComponent
      v-for="publication in publications"
      :key="publication.doi"
      :publication="publication"
      :suggestion="suggestion"
      v-on:add="addPublication"
      v-on:remove="removePublication"
      v-on:activate="activatePublication"
    ></PublicationComponent>
  </ul>
</template>

<script>
import PublicationComponent from "./PublicationComponent.vue";

export default {
  name: "SelectedPublicationsComponent",
  components: {
    PublicationComponent
  },
  props: {
    publications: Array,
    suggestion: Boolean
  },
  watch: {
    publications: {
      deep: true,
      handler: function() {
        this.$nextTick(this.scrollToActivated);
      }
    }
  },
  data() {
    return {
      onNextActivatedScroll: true
    };
  },
  methods: {
    addPublication: function(doi) {
      this.$emit("add", doi);
    },
    removePublication: function(doi) {
      this.$emit("remove", doi);
    },
    activatePublication: function(doi) {
      this.onNextActivatedScroll = false;
      this.$emit("activate", doi);
    },
    scrollToActivated() {
      if (this.onNextActivatedScroll) {
        const publicationComponent = this.$el.getElementsByClassName(
          "active"
        )[0];
        if (publicationComponent) {
          publicationComponent.scrollIntoView();
        }
      } else {
        this.onNextActivatedScroll = true;
      }
    }
  }
};
</script>
