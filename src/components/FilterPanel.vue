<template>
    <div class="notification has-background-info-light p-2 is-gapless">
        <form>
            <v-row>
                <v-col cols="12" md="4">
                    <v-text-field label="Search" v-model="sessionStore.filter.string" placeholder="Text"
                        variant="underlined" prepend-inner-icon="mdi-card-search" clearable hide-details />
                </v-col>
                <v-col cols="12" md="4">
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
                <v-col cols="12" md="4">
                    <v-select label="Tag" v-model="sessionStore.filter.tag" :items="Publication.TAGS" item-title="name"
                        item-value="value" variant="underlined" prepend-inner-icon="mdi-tag" clearable hide-details />
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <!-- doi filter -->
                    <v-text-field label="DOI" v-model="sessionStore.filter.doi" placeholder="10.1234/abcd"
                        variant="underlined" prepend-inner-icon="mdi-file-document" clearable hide-details />
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
}
</script>