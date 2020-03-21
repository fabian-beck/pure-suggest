<template>
  <div class="selected-publications column">
    <div class="box has-background-primary">
      <div class="is-size-4">Selected publications</div>
      <form v-on:submit.prevent>
        <nav class="level">
          <label>Add:</label>
          <input class="input" type="text" placeholder="Paste DOI(s) here" v-model="addDois" />
          <button class="button is-link" type="submit" v-on:click="$emit('add', addDois)">+</button>
        </nav>
      </form>
      <ul class="publication-list has-background-white">
        <PublicationComponent
          v-for="publication in publications"
          v-bind:key="publication.doi"
          v-bind:publication="publication"
        ></PublicationComponent>
      </ul>
    </div>
  </div>
</template>

<script>
import PublicationComponent from "./PublicationComponent.vue";

export default {
  name: "SelectedPublicationsComponent",
  components: {
    PublicationComponent
  },
  props: {
    publications: Array
  },
  data() {
    return {
      addDois: ""
    };
  }
};
</script>

<style scoped>
.box {
  height: 100%;
  display: grid;
  grid-template-rows: 40px 60px auto;
}
.level > * {
  margin: 0.2rem;
}
.publication-list {
  max-height: 100%;
  overflow-y: scroll;
}
</style>