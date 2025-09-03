<template>
    <div>
        <div class="summary" v-show="publication.wasFetched">
            <v-icon v-if="sessionStore.filter.dois?.includes(publication.doi)"
                size="16" class="mr-1" @click.stop="addToFilter(publication.doi)"
                v-tippy="'DOI is in filter.'">mdi-filter</v-icon>
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
                <span v-html="makeAuthorsClickable(publication.authorOrcidHtml) +
                    (publication.authorOrcidHtml.endsWith('.') ? ' ' : '. ')
                    " v-if="publication.author" @click.stop="handleAuthorClick" @click.middle.stop="refocus"></span>
            </span>
            <span v-if="publication.container">
                <em v-html="` ${highlight(publication.container)}`"></em>, <span
                    :class="publication.year ? '' : 'unknown'"
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
                    <b v-if="!publication.tooManyCitations">{{ publication.citationDois.length.toLocaleString("en")
                        }}</b>
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
                    <CompactButton icon="mdi-filter-plus" class="ml-5" v-tippy="getFilterDoiTooltip(publication.doi)"
                        :active="isDoiFiltered(publication.doi)" @click="toggleDoi(publication.doi)"
                        v-if="publication.isSelected">
                    </CompactButton>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSessionStore } from "@/stores/session.js"
import { useInterfaceStore } from "@/stores/interface.js"

const sessionStore = useSessionStore()
const interfaceStore = useInterfaceStore()

const props = defineProps({
    publication: Object,
    highlighted: String,
    alwaysShowDetails: Boolean,
})

const showDetails = computed(() => {
    return props.alwaysShowDetails || props.publication.isActive
})

function highlight(string) {
    if (!string) {
        return ""
    }
    if (!props.highlighted) {
        return string
    }
    const substrings = props.highlighted.split(' ')
    let highlightedString = string
    substrings.forEach(substring => {
        if (substring.length < 3)
            return
        const regex = new RegExp(substring, 'gi')
        highlightedString = highlightedString.replace(regex, match => {
            return `<span class="has-background-grey-light">${match}</span>`
        })
    })
    return highlightedString
}

function showAbstract() {
    interfaceStore.showAbstract(props.publication)
}

function exportBibtex() {
    sessionStore.exportSingleBibtex(props.publication)
    refocus()
}

function toggleDoi(doi) {
    // Check if the filter menu is open
    if (!interfaceStore.isFilterMenuOpen) {
        // Open the filter menu and add the DOI
        interfaceStore.openFilterMenu()
        sessionStore.filter.addDoi(doi)
    }
    else {
        // Menu is already open, just toggle the DOI
        sessionStore.filter.toggleDoi(doi)
    }
}

function isDoiFiltered(doi) {
    return sessionStore.filter.dois.includes(doi)
}

function getFilterDoiTooltip(doi) {
    return isDoiFiltered(doi) ? 'Active as f<span class="key">i</span>lter; click to remove DOI from filter' : 'Add DOI to f<span class="key">i</span>lter'
}

function refocus() {
    document.getElementById(props.publication.doi)?.focus()
}

function makeAuthorsClickable(authorHtml) {
    if (!authorHtml) return '';
    
    // Apply highlighting first to preserve existing highlighting functionality
    const highlighted = highlight(authorHtml);
    
    // Use the same parsing logic as Publication.js - authors are separated by '; '
    // This leverages the existing well-tested structure instead of complex regex
    const authorSeparator = '; ';
    
    // Check if this looks like a structured author list (contains the separator)
    if (highlighted.includes(authorSeparator)) {
        // Split by the known separator and wrap each author
        return highlighted
            .split(authorSeparator)
            .map(author => {
                const trimmedAuthor = author.trim();
                if (trimmedAuthor) {
                    return `<span class="clickable-author" data-author="${trimmedAuthor}">${trimmedAuthor}</span>`;
                }
                return trimmedAuthor;
            })
            .join(authorSeparator);
    }
    
    // If no structured separator found, treat as single author
    const trimmedHtml = highlighted.trim();
    if (trimmedHtml) {
        return `<span class="clickable-author" data-author="${trimmedHtml}">${trimmedHtml}</span>`;
    }
    
    return highlighted;
}

function handleAuthorClick(event) {
    // Check if clicked element or its parent has the clickable-author class
    const authorElement = event.target.closest('.clickable-author');
    if (authorElement) {
        event.stopPropagation();
        const authorName = authorElement.getAttribute('data-author');
        if (authorName) {
            // Convert the author name to an author ID and open modal with that ID
            const authorId = findAuthorIdByName(authorName.trim());
            if (authorId) {
                interfaceStore.openAuthorModalDialog(authorId);
            }
        }
        return;
    }
    // Fallback to original behavior
    refocus();
}

function findAuthorIdByName(authorName) {
    // Use the same nameToId logic as Author.js
    return authorName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        // Handle Nordic and other extended Latin characters not covered by NFD
        .replace(/[øØ]/g, "o")
        .replace(/[åÅ]/g, "a")
        .replace(/[æÆ]/g, "ae")
        .replace(/[ðÐ]/g, "d")
        .replace(/[þÞ]/g, "th")
        .replace(/[ßẞ]/g, "ss")
        .toLowerCase();
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

:deep(.clickable-author) {
    cursor: pointer;
    transition: background-color 0.2s ease;
    border-radius: 2px;
    padding: 1px 2px;
    
    &:hover {
        background-color: rgba(0, 0, 0, 0.1);
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