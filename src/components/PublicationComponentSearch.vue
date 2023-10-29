<template>
    <li class="publication-component media">
        <div class="media-content">
            <PublicationDescription :publication="publication" :highlighted="searchQuery" :alwaysShowDetails="true" v-show="loaded">
            </PublicationDescription>
        </div>
        <div class="media-right">
            <div>
                <CompactButton icon="mdi-plus-thick" v-tippy="'Mark publication to be added to selected publications.'"
                    @click="$emit('activate', publication.doi)" v-show="loaded"  class="has-text-primary"></CompactButton>
            </div>
        </div>
        <v-overlay :model-value="!loaded" contained class="align-center justify-center" persistent theme="dark">
            <v-icon class="has-text-grey-light">mdi-progress-clock</v-icon>
        </v-overlay>
    </li>
</template>

<script>
import PublicationDescription from './PublicationDescription.vue';

export default {
    props: {
        publication: Object,
        searchQuery: String,
    },
    data() {
        return {
            loaded: false,
        };
    },
    mounted() {
        // set a timer to check if the publication was fetched (ugly hack - somehow it doesn't work automatically)
        function check() {
            if (this.publication.wasFetched) {
                this.loaded = true;
                return;
            }
            setTimeout(check.bind(this), 200);
        }
        this.loaded = false;
        check.bind(this)();
    },
    components: { PublicationDescription }
}
</script>
