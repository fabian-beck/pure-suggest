<template>
    <div class="
            notification
            has-background-info-light
            p-2
            pt-3
            is-gapless
          ">
        <form>
            <v-row>
                <v-col cols="12" md="4">
                    <v-text-field label="Search" v-model="sessionStore.filter.string" placeholder="Text" density="compact"
                        prepend-inner-icon="mdi-card-search" clearable />
                </v-col>
                <v-col cols="12" md="4">
                    <v-row no-gutters>
                        <v-col cols="12" md="7">
                            <v-text-field label="Year from" v-model="sessionStore.filter.yearStart" placeholder="YYYY"
                                density="compact" prepend-inner-icon="mdi-calendar" clearable />
                        </v-col>
                        <v-col>
                            <v-text-field label="to" v-model="sessionStore.filter.yearEnd" placeholder="YYYY"
                                density="compact" clearable />
                        </v-col>
                    </v-row>
                </v-col>
                <v-col cols="12" md="4">
                    <v-select label="Tag" v-model="sessionStore.filter.tag" :items="Publication.TAGS" item-title="name" 
                        item-value="value" density="compact" prepend-inner-icon="mdi-tag" clearable />
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
}
</script>