import { cachedFetch } from "./Cache.js";
import { SURVEY_THRESHOLDS, CITATION_THRESHOLDS, PUBLICATION_AGE, SCORING, TEXT_PROCESSING, SURVEY_KEYWORDS, ORDINAL_REGEX, ROMAN_NUMERAL_REGEX, ORCID_REGEX, CURRENT_YEAR, TITLE_WORD_MAP, PUBLICATION_TAGS } from "./constants/publication.js";
import { API_ENDPOINTS, API_PARAMS } from "./constants/api.js";
import { ICON_SIZES, ORCID_ICON_URL } from "./constants/ui.js";
import { findKeywordMatches, highlightTitle, calculateBoostFactor, calculatePublicationScore, getScoreColor } from "./utils/scoringUtils.js";

/**
 * Represents an academic publication with metadata, citations, and scoring capabilities.
 */
export default class Publication {
    /**
     * Creates a new Publication instance.
     * @param {string} doi - The DOI identifier for the publication.
     */
    constructor(doi) {
        this.doi = doi.toLowerCase();
        this.resetToDefaults();
    }

    /**
     * Gets the full DOI URL for this publication.
     * @returns {string} The complete DOI URL.
     */
    get doiUrl() {
        return `https://doi.org/${this.doi}`;
    }

    /**
     * Calculates citations per year since publication.
     * @returns {number} Average citations per year.
     */
    get citationsPerYear() {
        const yearDiff = this.year ? CURRENT_YEAR - this.year : 1;
        return this.citationDois.length / Math.max(1, yearDiff);
    }

    /**
     * Generates Google Scholar search URL for this publication.
     * @returns {string} Google Scholar search URL.
     */
    get gsUrl() {
        const searchString = `${this.title} ${this.author?.split(',')[0]} ${this.container ?? ""}`;
        return `${API_ENDPOINTS.GOOGLE_SCHOLAR}?hl=en&q=${encodeURIComponent(searchString)}`;
    }

    get authorShort() {
        if (!this.author) return undefined;
        
        const authorArray = this.author.split('; ');
        const firstAuthor = authorArray[0].split(', ')[0];
        return authorArray.length === 1 ? firstAuthor 
            : authorArray.length === 2 ? `${firstAuthor} and ${authorArray[1].split(', ')[0]}`
            : `${firstAuthor} et al.`;
    }

    /**
     * Resets all publication properties to default values.
     */
    resetToDefaults() {
        // Meta-data
        this.title = this.titleHighlighted = "";
        this.year = this.author = this.authorOrcidHtml = undefined;
        this.container = this.volume = this.issue = this.page = this.abstract = undefined;
        
        // Citation arrays and counts
        this.citationDois = [];
        this.referenceDois = [];
        this.citationCount = this.referenceCount = this.boostMatches = this.score = 0;
        this.boostKeywords = [];
        this.boostFactor = SCORING.DEFAULT_BOOST_FACTOR;
        this.scoreColor = "#FFF";
        this.tooManyCitations = false;
        
        // Boolean flags (tags and interface state)
        this.isSurvey = this.isHighlyCited = this.isNew = this.isUnnoted = false;
        this.isActive = this.isLinkedToActive = this.isSelected = this.isRead = false;
        this.isHovered = this.isKeywordHovered = this.isAuthorHovered = this.wasFetched = false;
    }

    /**
     * Fetches publication data from the API.
     * @param {boolean} noCache - Whether to bypass cache.
     */
    async fetchData(noCache = false) {
        if (this.wasFetched && !noCache) return;
        try {
            // load data from data service
            await cachedFetch(`${API_ENDPOINTS.PUBLICATIONS}?doi=${this.doi}${noCache ? API_PARAMS.NO_CACHE_PARAM : ""}`, this.processData.bind(this), undefined, noCache);
        } catch (error) {
            console.log(error);
        }
        this.wasFetched = true;
    }

    /**
     * Processes and cleans the publication title from API data.
     * @param {Object} data - Raw publication data from API.
     */
    processTitle(data) {
        const subtitle = data.subtitle;
        if (subtitle?.length && this.title.toLowerCase().indexOf(subtitle.toLowerCase())) {
            const cleanedTitle = removeHtmlTags(this.title);
            this.title += `${cleanedTitle.match(/^.*\W$/) ? "" : ":"}  ${subtitle}`;
        }
        this.title = cleanTitle(this.title);
    }

    /**
     * Processes author information and creates display formats.
     * @param {Object} data - Raw publication data from API.
     */
    processAuthor(data) {
        if (!data.author) return;
        
        this.author = data.author.replace(ORCID_REGEX, "");
        this.authorOrcid = data.author;
        this.authorOrcidHtml = data.author.replace(ORCID_REGEX, ` <a href='https://orcid.org/$2'><img alt='ORCID logo' src='${ORCID_ICON_URL}' width='${ICON_SIZES.ORCID_WIDTH}' height='${ICON_SIZES.ORCID_HEIGHT}' /></a>`);
    }

    /**
     * Processes publication container (journal/conference) name.
     * @param {Object} data - Raw publication data from API.
     */
    processContainer(data) {
        this.container = "";
        data.container?.split(" ").forEach(word => {
            let mappedWord = "";
            if (/\(.+\)/.test(word)) {
                mappedWord = word.toUpperCase();
            } else if (ORDINAL_REGEX.test(word)) {
                mappedWord = word.toLowerCase();
            } else if (ROMAN_NUMERAL_REGEX.test(word)) {
                mappedWord = word.toUpperCase();
            } else {
                mappedWord = TITLE_WORD_MAP[word.toLowerCase()];
            }
            this.container += (mappedWord ? mappedWord : word) + " ";
        });
        this.container = this.container.trim().replace(/^[. ]+|[. ]+$/g, '');
        this.container = cleanTitle(this.container);
    }

    /**
     * Processes citation and reference DOI lists.
     * @param {Object} data - Raw publication data from API.
     */
    processCitations(data) {
        const addUniqueDoi = (list, doi) => doi && !list.includes(doi.toLowerCase()) && list.push(doi.toLowerCase());
        data.reference?.split("; ").forEach(doi => addUniqueDoi(this.referenceDois, doi));
        data.citation?.split("; ").forEach(doi => addUniqueDoi(this.citationDois, doi));
        this.tooManyCitations = data.tooManyCitations;
    }


    /**
     * Analyzes publication data to assign classification tags.
     */
    processTags() {
        if (this.referenceDois.length > SURVEY_THRESHOLDS.REFERENCE_COUNT_HIGH) {
            this.isSurvey = `more than ${SURVEY_THRESHOLDS.REFERENCE_COUNT_HIGH} references (${this.referenceDois.length})`;
        } else if (this.referenceDois.length >= SURVEY_THRESHOLDS.REFERENCE_COUNT_MIN && SURVEY_KEYWORDS.test(this.title)) {
            this.isSurvey = `more than ${SURVEY_THRESHOLDS.REFERENCE_COUNT_MIN} references (${this.referenceDois.length}) and "${SURVEY_KEYWORDS.exec(this.title)[0]}" in the title`;
        }
        this.isHighlyCited = this.citationsPerYear > CITATION_THRESHOLDS.HIGHLY_CITED_PER_YEAR || this.tooManyCitations
            ? `more than ${CITATION_THRESHOLDS.HIGHLY_CITED_PER_YEAR} citations per year` : false;
        this.isNew = (CURRENT_YEAR - this.year) <= PUBLICATION_AGE.NEW_YEARS ? "published within this or the previous two calendar years" : false;
        this.isUnnoted = this.citationsPerYear < CITATION_THRESHOLDS.UNNOTED_PER_YEAR && !this.tooManyCitations
            ? `less than ${CITATION_THRESHOLDS.UNNOTED_PER_YEAR} citation per year` : false;
    }

    /**
     * Main data processing method that coordinates all data processing steps.
     * @param {Object} data - Raw publication data from API.
     */
    processData(data) {
        // Map each data property to the publication object
        Object.keys(data).forEach(key => {
            this[key] = data[key];
        });
        
        // Process different aspects of the publication data
        this.processTitle(data);
        this.processAuthor(data);
        this.processContainer(data);
        this.processCitations(data);
        this.processTags();
    }

    /**
     * Processes keywords to calculate boost metrics and highlight title.
     * @param {string[]} boostKeywords - Keywords to search for.
     * @param {boolean} isBoost - Whether to apply score boost for matches.
     */
    processKeywordMatching(boostKeywords, isBoost) {
        const matches = findKeywordMatches(this.title, boostKeywords);
        
        // Update boost metrics
        this.boostMatches = matches.length;
        this.boostKeywords = matches.map(match => match.keyword);
        this.boostFactor = calculateBoostFactor(matches.length, isBoost);
        
        // Generate highlighted title
        this.titleHighlighted = highlightTitle(this.title, matches);
    }



    /**
     * Updates the publication score based on keyword matches.
     * @param {string[]} boostKeywords - Keywords to boost score.
     * @param {boolean} isBoost - Whether to apply boost multiplier.
     */
    updateScore(boostKeywords, isBoost) {
        this.boostKeywords = [];
        this.boostMatches = 0;
        this.boostFactor = SCORING.DEFAULT_BOOST_FACTOR;
        this.processKeywordMatching(boostKeywords, isBoost);
        this.score = calculatePublicationScore(this.citationCount, this.referenceCount, this.isSelected, this.boostFactor);
        this.scoreColor = getScoreColor(this.score);
    }


    /**
     * Checks if the publication has any classification tags.
     * @returns {boolean} True if publication has any tags.
     */
    hasTag() {
        return Publication.TAGS.some(tag => this[tag.value]);
    }

    /**
     * Returns concatenated metadata for search purposes.
     * @returns {string} Combined title, author, and container string.
     */
    getMetaString() {
        return [this.title, this.author, this.container].filter(Boolean).join(" ") + " ";
    }

    /**
     * Sets the hover state for UI interactions.
     * @param {boolean} isHovered - Whether the publication is hovered.
     */
    setHover(isHovered) {
        this.isHovered = isHovered;
    }

    /**
     * Gets the available publication tag definitions.
     * @returns {Array} Array of tag configuration objects.
     */
    static get TAGS() {
        return PUBLICATION_TAGS;
    }

    /**
     * Sorts publications by score and year (in-place).
     * @param {Publication[]} publicationList - Array of publications to sort.
     */
    static sortPublications(publicationList) {
        publicationList.sort((a, b) => {
            return b.score - 1 / ((b.year ? b.year : 0) + 2) - (a.score - 1 / ((a.year ? a.year : 0) + 2))
        });
    }

}




/**
 * Cleans and formats publication titles with proper capitalization and punctuation.
 * @param {string} title - Raw title string.
 * @returns {string} Cleaned and formatted title.
 */
/**
 * Removes HTML tags from a string.
 * @param {string} string - Input string with HTML tags.
 * @returns {string} String with HTML tags removed.
 */
function removeHtmlTags(string) {
    return string.replaceAll(/<[^>]*>/g, "");
}

/**
 * Clean and standardize publication title
 * @param {string} title - Raw title string
 * @returns {string} Cleaned title
 */
function cleanTitle(title) {
    let cleanedTitle = removeHtmlTags(title)
        .split(" ")
        .map(word => TITLE_WORD_MAP[word.toLowerCase()] || word)
        .join(" ")
        .trim()
        .replace(/--/g, "–")
        .replace(/ - /g, " – ")
        .replace(/---/g, "—")
        .replace(/ ?— ?/g, "—")
        .replace(/&[A-Z]/g, match => match.toLowerCase());
    
    cleanedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);
    return cleanedTitle.length > TEXT_PROCESSING.MAX_TITLE_LENGTH 
        ? cleanedTitle.substring(0, TEXT_PROCESSING.TITLE_TRUNCATION_POINT) + TEXT_PROCESSING.TITLE_TRUNCATION_SUFFIX
        : cleanedTitle;
}