<template>
    <div>
        <div class="summary" v-show="publication.wasFetched">
            <span v-if="publication.title">
                <b><span v-html="publication.titleHighlighted
                    ? highlight(publication.titleHighlighted)
                    : highlight(publication.title)
                    "></span></b>&ensp;</span>
            <span v-if="!publication.title" class="unknown">
                <b>[unknown title] </b>
            </span>
            <span v-show="publication.author && !alwaysShowDetails">
                (<span v-html="highlight(publication.authorShort) + ', '" v-show="publication.authorShort"></span><span
                    :class="publication.year ? '' : 'unknown'"
                    v-html="publication.year ? highlight(String(publication.year)) : '[unknown year]'"></span>)</span>
            <div>
                <!-- Refactor: replace by for loop over Publication.TAGS -->
                <PublicationTag v-if="publication.isHighlyCited" icon="mdi-star"
                    v-tippy="`Identified as highly cited: ${publication.isHighlyCited}.`">Highly cited
                </PublicationTag>
                <PublicationTag v-if="publication.isSurvey" icon="mdi-table"
                    v-tippy="`Identified as literature survey: ${publication.isSurvey}.`">Literature survey
                </PublicationTag>
                <PublicationTag v-if="publication.isNew" icon="mdi-alarm"
                    v-tippy="`Identified as new: ${publication.isNew}.`">
                    New</PublicationTag>
                <PublicationTag v-if="publication.isUnnoted" icon="mdi-alert-box-outline"
                    v-tippy="`Identified as yet unnoted: ${publication.isUnnoted}.`">Unnoted
                </PublicationTag>
            </div>
        </div>
        <div v-if="showDetails">
            <span>
                <span v-html="highlight(publication.authorOrcidHtml) +
                    (publication.authorOrcidHtml.endsWith('.') ? ' ' : '. ')
                    " v-if="publication.author" @click.stop="refocus" @click.middle.stop="refocus"></span>
            </span>
            <span v-if="publication.container">
                <em v-html="` ${highlight(publication.container)}`"></em>, <span :class="publication.year ? '' : 'unknown'"
                    v-html="publication.year ? highlight(String(publication.year)) : '[unknown year]'"></span>.
            </span>
            <label><span class="key">D</span>OI:</label>
            <a :href="publication.doiUrl" @click.stop="refocus" @click.middle.stop="refocus">{{ publication.doi }}</a>
        </div>
        <div v-if="showDetails" class="stats-and-links level">
            <div class="level-left">
                <div :class="`level-item ${publication.referenceDois.length ? '' : 'unknown'
                    }`">
                    <label>
                        <InlineIcon icon="mdi-arrow-bottom-left-thick"
                            :color="publication.referenceDois.length ? 'dark' : 'danger'" /> Citing:
                    </label>
                    <b>{{
                        publication.referenceDois.length
                        ? publication.referenceDois.length.toLocaleString("en")
                        : "not available"
                    }}</b>
                </div>
                <div class="level-item">
                    <label>
                        <InlineIcon icon="mdi-arrow-top-left-thick" color="dark" /> Cited by:
                    </label>
                    <b v-if="!publication.tooManyCitations">{{ publication.citationDois.length.toLocaleString("en") }}</b>
                    <span v-if="publication.citationsPerYear > 0 && !publication.tooManyCitations">
                        &nbsp;({{ publication.citationsPerYear.toFixed(1) }}/year)
                    </span>
                    <span v-if="publication.tooManyCitations">
                        <span
                            v-tippy="'The citations of this publication are too numerous to be considered for suggestions.'"><b>&ge;1000
                            </b>
                            <InlineIcon icon="mdi-alert-box-outline" color="danger" />
                        </span>
                    </span>
                </div>
            </div>
            <div class="level-right" v-if="publication.title && showDetails">
                <div class="level-item">
                    <CompactButton icon="mdi-text" class="ml-5" v-if="publication.abstract && !alwaysShowDetails"
                        v-on:click="showAbstract" v-tippy="`Abs<span class='key'>t</span>ract`"></CompactButton>
                    <CompactButton icon="mdi-school" class="ml-5" :href="publication.gsUrl"
                        v-tippy="`<span class='key'>G</span>oogle Scholar`"></CompactButton>
                    <CompactButton icon="mdi-format-quote-close" class="ml-5" v-on:click="exportBibtex"
                        v-if="!alwaysShowDetails" v-tippy="`Export as BibTe<span class='key'>X</span> citation`">
                    </CompactButton>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";

export default {
    setup() {
        const sessionStore = useSessionStore();
        const interfaceStore = useInterfaceStore();
        return { sessionStore, interfaceStore };
    },
    props: {
        publication: Object,
        highlighted: String,
        alwaysShowDetails: Boolean,
    },
    computed: {
        showDetails() {
            return this.alwaysShowDetails || this.publication.isActive;
        }
    },
    methods: {
        highlight(string) {
            if (!string) {
                return "";
            }
            if (!this.highlighted) {
                return string;
            }
            const substrings = this.highlighted.split(' ');
            let highlightedString = string;
            substrings.forEach(substring => {
                if (substring.length < 3)
                    return;
                const regex = new RegExp(substring, 'gi');
                highlightedString = highlightedString.replace(regex, match => {
                    return `<span class="has-background-grey-light">${match}</span>`;
                });
            });
            return highlightedString;
        },
        showAbstract: function () {
            this.interfaceStore.showAbstract(this.publication);
        },
        exportBibtex: function () {
            this.sessionStore.exportSingleBibtex(this.publication);
            this.refocus();
        },
        refocus: function () {
            document.getElementById(this.publication.doi)?.focus();
        },
    },
}
</script>

<style scoped>
div.summary {
    margin-bottom: 0.5rem;
}

label {
    padding-right: 0.25rem;
}

.abstract {
    font-style: italic;
    font-size: 0.95rem;
    padding: 0.5rem 0;

    &::before {
        content: "Abstract: ";
        font-weight: bold;
    }
}

& .stats-and-links {
    flex-wrap: wrap;

    & .level-left,
    & .level-right {
        margin-top: 0.25rem;
        flex-wrap: wrap;
        flex-grow: 1;
    }

    & .level-item {
        flex-wrap: wrap;
    }

    & .level-left .level-item {
        margin-right: 1.5rem;
    }

    & .level-right .level-item {
        justify-content: right;
        margin: 0;
    }
}
</style>