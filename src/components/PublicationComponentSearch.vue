<template>
    <li class="publication-component media">
        <div class="media-content">
            <PublicationDescription :publication="publication" :highlighted="searchQuery" :alwaysShowDetails="true" v-show="publication.wasFetched">
            </PublicationDescription>
        </div>
        <div class="media-right">
            <div>
                <CompactButton icon="mdi-plus-thick" v-tippy="'Mark publication to be added to selected publications.'"
                    @click="$emit('activate', publication.doi)" v-show="publication.wasFetched"  class="has-text-primary"></CompactButton>
            </div>
        </div>
    </li>
</template>

<script>
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
}
</script>
