<script setup>
import { computed } from 'vue'

import { useAuthorStore } from '@/stores/author.js'
import { calculateAuthorColor } from '@/utils/authorColor.js'

const props = defineProps({
  author: {
    type: Object,
    default: () => ({})
  }
})

const authorStore = useAuthorStore()

const authorColor = computed(() => {
  return calculateAuthorColor(props.author.score, authorStore)
})
</script>

<template>
  <tippy class="d-flex flex-column">
    <div>
      <v-avatar :color="authorColor" size="80" class="d-flex flex-column">
        <div class="is-size-7">
          <b>{{ author.score }}</b>
        </div>
        <div class="is-size-4">{{ author.initials }}</div>
        <div class="is-size-7">
          {{ author.firstAuthorCount }} : {{ author.count }}
          <InlineIcon v-if="author.newPublication" icon="mdi-alarm"></InlineIcon>
        </div>
      </v-avatar>
    </div>
    <template #content>
      Aggregated score of <b>{{ author.score }}</b> through <b>{{ author.count }}</b> selected
      publication{{ author.count > 1 ? 's' : ''
      }}<span v-if="author.firstAuthorCount">
        (<b v-if="author.firstAuthorCount < author.count">{{ author.firstAuthorCount }}&nbsp;</b
        ><b v-else-if="author.firstAuthorCount > 1">all </b>as first author)</span
      ><span v-if="author.yearMin != author.yearMax"
        >, published between <b>{{ author.yearMin }}</b> and <b>{{ author.yearMax }}</b> </span
      ><span v-else-if="author.yearMin"
        >, published <b>{{ author.yearMin }}</b></span
      ><span v-if="author.newPublication"> (<InlineIcon icon="mdi-alarm"></InlineIcon> new) </span>.
    </template>
  </tippy>
</template>

<style scoped>
.v-avatar {
  cursor: default;
}
</style>
