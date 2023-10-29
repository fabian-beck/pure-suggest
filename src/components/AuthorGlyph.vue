<template>
    <tippy class="d-flex flex-column">
        <div><strong>{{ author.score }}</strong></div>
        <div>
            <v-avatar color="black" :size="authorIconSize(author.score) * 2">
                {{ initials(author.id) }}
            </v-avatar>
        </div>
        <div class="text-body-2">{{ author.firstAuthorCount }} : {{ author.count }}</div>
        <div class="is-size-7"><span v-if="author.yearMax != author.yearMin">{{ author.yearMin }} - </span>{{
            author.yearMax }}</div>
        <div v-if="author.newPublication">
            <InlineIcon icon="mdi-alarm"></InlineIcon>
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

<script>
import { useSessionStore } from "@/stores/session.js";

export default {
    props: {
        author: Object,
    },
    setup() {
        const sessionStore = useSessionStore();
        return { sessionStore };
    },
    methods: {
        initials(name) {
            if (!name)
                return "";
            return name
                .split(" ")
                .map((word) => word[0])
                .join("");
        },
        authorIconSize(score) {
            if (!this.sessionStore.isAuthorScoreEnabled) {
                score = score * 20;
            }
            if (!this.sessionStore.isFirstAuthorBoostEnabled) {
                score = score * 1.5;
            }
            if (score > 128) {
                return "24";
            }
            if (score > 64) {
                return "22";
            }
            if (score > 16) {
                return "20";
            }
            return "18";
        },
    }
}
</script>

<style scoped></style>
