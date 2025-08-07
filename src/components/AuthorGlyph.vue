<template>
    <tippy class="d-flex flex-column">
        <div>
            <v-avatar :color="authorColor" size="80" class="d-flex flex-column">
                <div class="is-size-7"><b>{{ author.score }}</b></div>
                <div class="is-size-4">{{ author.initials }}</div>
                <div class="is-size-7">{{ author.firstAuthorCount }} : {{ author.count }} <InlineIcon
                        v-if="author.newPublication" icon="mdi-alarm"></InlineIcon>
                </div>
            </v-avatar>
        </div>
        <template #content>
            Aggregated score of <b>{{ author.score }}</b> through
            <b>{{ author.count }}</b> selected publication{{
                author.count > 1 ? "s" : ""
            }}<span v-if="author.firstAuthorCount"> (<b v-if="author.firstAuthorCount < author.count">{{
    author.firstAuthorCount }}&nbsp;</b><b v-else-if="author.firstAuthorCount > 1">all
                </b>as
                first
                author)</span><span v-if="author.yearMin != author.yearMax">, published between <b>{{ author.yearMin
                }}</b> and
                <b>{{ author.yearMax }}</b>
            </span><span v-else-if="author.yearMin">, published <b>{{ author.yearMin }}</b></span><span
                v-if="author.newPublication">
                (<InlineIcon icon="mdi-alarm"></InlineIcon> new)
            </span>.
        </template>
    </tippy>
</template>

<script setup>
import { computed } from 'vue'
import { useSessionStore } from "@/stores/session.js"

const sessionStore = useSessionStore()

const props = defineProps({
    author: Object,
})

const authorColor = computed(() => {
    let score = props.author.score
    if (!sessionStore.isAuthorScoreEnabled) {
        score = score * 20
    }
    if (!sessionStore.isFirstAuthorBoostEnabled) {
        score = score * 1.5
    }
    if (!sessionStore.isNewPublicationBoostEnabled) {
        score = score * 1.5
    }
    return `hsl(0, 0%, ${Math.max(60 - score / 3, 0)}%)`
})

</script>

<style scoped>
.v-avatar {
    cursor: default;
}
</style>
