<template>
    <li class="publication-component media">
        <div class="media-content">
            <b v-if="loaded && !publication.title" class="has-text-danger-dark">[No metadata
                available]</b>
            <b v-if="loaded" v-html="highlightedString(publication.title)"></b>
            <span v-show="publication.author">
                (<span v-html="highlightedString(publication.authorShort) + ', '"
                    v-show="publication.authorShort"></span><span :class="publication.year ? '' : 'unknown'"
                    v-html="publication.year ? highlightedString(String(publication.year)) : '[unknown year]'"></span>)</span>
            <span>
                DOI:
                <a :href=" `https://doi.org/${publication.doi}` ">{{
                    publication.doi
                    }}</a>
            </span>
            <span v-show=" publication.title ">
                <CompactButton icon="mdi-school" v-tippy=" 'Google Scholar' " :href=" publication.gsUrl " class="ml-2">
                </CompactButton>
            </span>
        </div>
        <div class="media-right">
            <div>
                <CompactButton icon="mdi-plus-thick" v-tippy=" 'Mark publication to be added to selected publications.' "
                    @click="$emit('activate', publication.doi)" v-show=" loaded "></CompactButton>
            </div>
        </div>
        <v-overlay :model-value=" !loaded " contained class="align-center justify-center" persistent theme="dark">
            <v-icon class="has-text-grey-light">mdi-progress-clock</v-icon>
        </v-overlay>
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
        }
    },
    methods: {
        highlightedString(string) {
            if (!string) return "";
            if (!this.searchQuery) return string;
            const substrings = this.searchQuery.split(' ');
            let highlightedString = string;
            substrings.forEach(substring => {
                if (substring.length < 3) return;
                const regex = new RegExp(substring, 'gi');
                highlightedString = highlightedString.replace(regex, match => {
                    return `<span class="has-background-grey-light">${match}</span>`;
                });
            });
            return highlightedString;
        }
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
}
</script>
