<template>
    <div class="notification has-background-info-light p-2 is-gapless">
        <form>
            <v-row dense>
                <v-col cols="12" md="4" class="py-1">
                    <v-text-field label="Search" v-model="sessionStore.filter.string" placeholder="Text"
                        variant="underlined" prepend-inner-icon="mdi-card-search" clearable hide-details />
                </v-col>
                <v-col cols="12" md="4" class="py-1">
                    <v-row no-gutters>
                        <v-col cols="12" md="7">
                            <v-text-field label="Year from" v-model="sessionStore.filter.yearStart" placeholder="YYYY"
                                variant="underlined" prepend-inner-icon="mdi-calendar" clearable :rules="yearRules"
                                validate-on="blur" hide-details />
                        </v-col>
                        <v-col cols="12" md="5">
                            <v-text-field label="to" v-model="sessionStore.filter.yearEnd" placeholder="YYYY"
                                variant="underlined" clearable :rules="yearRules" validate-on="blur" hide-details />
                        </v-col>
                    </v-row>
                </v-col>
                <v-col cols="12" md="4" class="py-1">
                    <v-select label="Tag" v-model="sessionStore.filter.tag" :items="Publication.TAGS" item-title="name"
                        item-value="value" variant="underlined" prepend-inner-icon="mdi-tag" clearable hide-details />
                </v-col>
            </v-row>
            <v-row dense v-if="sessionStore.filter.dois.length > 0">
                <v-col class="py-1">
                    <v-chip v-for="doi in sessionStore.filter.dois" :key="doi" class="ma-1" closable
                        @click:close="removeDoi(doi)" v-tippy="{ content: getDoiTooltip(doi), allowHTML: true }">
                        <v-icon left>mdi-file-document</v-icon>
                        {{ doi }}
                    </v-chip>
                </v-col>
            </v-row>
        </form>
    </div>
</template>

<script>
// import session store
import { useSessionStore } from "@/stores/session.js";
import Publication from "@/Publication.js";

export default {
    setup() {
        const sessionStore = useSessionStore();
        return { sessionStore, Publication };
    },
    data: () => ({
        yearRules: [
            value => {
                if (!value) return true;
                const regex = /^\d{4}$/;
                return regex.test(value) || "Year must be a four digit number.";
            },
        ],
    }),
    methods: {
        removeDoi(doi) {
            this.sessionStore.filter.removeDoi(doi);
        },
        getDoiTooltip(doi) {
            const publication = this.sessionStore.getSelectedPublicationByDoi(doi);
            return `Filtered to publications citing or cited by <b>${publication.title} (${publication.authorShort}, ${publication.year})</b>`;
        },
    },
}
</script>