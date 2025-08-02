import _ from "lodash";

import { cachedFetch } from "./Cache.js";
import { SURVEY_THRESHOLDS, CITATION_THRESHOLDS, PUBLICATION_AGE, SCORING, TEXT_PROCESSING, SURVEY_KEYWORDS, ORDINAL_REGEX, ROMAN_NUMERAL_REGEX } from "./constants/publication.js";
import { API_ENDPOINTS, API_PARAMS } from "./constants/api.js";
import { ICON_SIZES, ORCID_ICON_URL, SCORE_COLOR_THRESHOLDS, SCORE_LIGHTNESS } from "./constants/ui.js";

const ORCID_REGEX = /(,\s+)(\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]{1})/g;

export default class Publication {
    constructor(doi) {
        // identifier
        this.doi = doi.toLowerCase();
        this.doiUrl = "https://doi.org/" + doi;
        // meta-data
        this.title = "";
        this.titleHighlighted = "";
        this.year = undefined;
        this.author = undefined;
        this.authorShort = undefined;
        this.authorOrcidHtml = undefined;
        this.container = undefined;
        this.volume = undefined;
        this.issue = undefined;
        this.page = undefined;
        this.abstract = undefined;
        // citation-related data
        this.citationDois = [];
        this.referenceDois = [];
        this.citationCount = 0;
        this.referenceCount = 0;
        this.boostMatches = 0;
        this.boostKeywords = []
        this.boostFactor = SCORING.DEFAULT_BOOST_FACTOR;
        this.score = 0;
        this.scoreColor = "#FFF";
        this.citationsPerYear = 0;
        this.tooManyCitations = false;
        // tags
        this.isSurvey = false;
        this.isHighlyCited = false;
        this.isNew = false;
        this.isUnnoted = false;
        // interface properties
        this.isActive = false;
        this.isLinkedToActive = false;
        this.isSelected = false;
        this.isRead = false;
        this.isHovered = false;
        this.isKeywordHovered = false;
        this.isAuthorHovered = false;
        // loading state
        this.wasFetched = false;
    }

    async fetchData(noCache = false) {
        if (this.wasFetched && !noCache) return;
        try {
            // load data from data service
            await cachedFetch(`${API_ENDPOINTS.PUBLICATIONS}?doi=${this.doi}${noCache ? API_PARAMS.NO_CACHE_PARAM : ""}`, data => {
                this.processData(data);
            }, undefined, noCache);
        } catch (error) {
            console.log(error);
        }
        this.wasFetched = true;
    }

    processData(data) {
        // map each data property to the publication object
        Object.keys(data).forEach(key => {
            this[key] = data[key];
        });
        // title
        const subtitle = data.subtitle;
        if (subtitle?.length && this.title.toLowerCase().indexOf(subtitle.toLowerCase())) {
            // merging title and subtitle, while adding a colon only when title does not end with a non-alpha-numeric character (cleaning potential html tags first)
            const cleanedTitle = this.title.replaceAll(/<[^>]*>/g, "");
            this.title += `${cleanedTitle.match(/^.*\W$/) ? "" : ":"}  ${subtitle}`;
        }
        this.title = cleanTitle(this.title);
        // author
        if (data.author) {
            const authorArray = data.author.split('; ');
            if (authorArray.length === 1) {
                this.authorShort = authorArray[0].split(', ')[0];
            } else if (authorArray.length === 2) {
                this.authorShort = `${authorArray[0].split(', ')[0]} and ${authorArray[1].split(', ')[0]}`;
            } else if (authorArray.length > 2) {
                this.authorShort = `${authorArray[0].split(', ')[0]} et al.`;
            }
            this.author = data.author.replace(ORCID_REGEX, "");
            this.authorOrcid = data.author;
            this.authorOrcidHtml = data.author.replace(ORCID_REGEX, ` <a href='https://orcid.org/$2'><img alt='ORCID logo' src='${ORCID_ICON_URL}' width='${ICON_SIZES.ORCID_WIDTH}' height='${ICON_SIZES.ORCID_HEIGHT}' /></a>`);
        }
        // container
        this.container = "";
        data.container?.split(" ").forEach(word => {
            let mappedWord = "";
            if (/\(.+\)/.test(word)) { // acronyms in brackets
                mappedWord = word.toUpperCase();
            } else if (ORDINAL_REGEX.test(word)) { // 1st 2nd 3rd 4th etc.
                mappedWord = word.toLowerCase();
            } else if (ROMAN_NUMERAL_REGEX.test(word)) { // roman numerals - see: https://regexpattern.com/roman-numerals/
                mappedWord = word.toUpperCase();
            } else {
                mappedWord = TITLE_WORD_MAP[word.toLowerCase()];
            }
            this.container += (mappedWord ? mappedWord : word) + " ";
        });
        this.container = _.trim(this.container, '. ');
        this.container = cleanTitle(this.container);
        // citations
        data.reference?.split("; ").forEach(referenceDoi => {
            if (referenceDoi && !this.referenceDois.includes(referenceDoi.toLowerCase())) {
                this.referenceDois.push(referenceDoi.toLowerCase());
            }
        });
        data.citation?.split("; ").forEach(citationDoi => {
            if (citationDoi && !this.citationDois.includes(citationDoi.toLowerCase())) {
                this.citationDois.push(citationDoi.toLowerCase());
            }
        });
        this.citationsPerYear = this.citationDois.length / (Math.max(1, CURRENT_YEAR - this.year));
        this.tooManyCitations = data.tooManyCitations;
        // Google Scholar link (not listing year as potentially misleading)
        const searchString = `${this.title} ${this.author?.split(',')[0]} ${this.container ?? ""}`;
        this.gsUrl = `${API_ENDPOINTS.GOOGLE_SCHOLAR}?hl=en&q=${encodeURIComponent(searchString)}`
        // tags
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

    updateScore(boostKeywords, isBoost) {
        this.boostKeywords = [];
        this.boostMatches = 0;
        this.boostFactor = SCORING.DEFAULT_BOOST_FACTOR;
        // use an array to keep track of highlighted title fragements
        let titleFragments = [this.title];
        // iterate over all boost keywords
        boostKeywords.forEach(boostKeyword => {
            if (!boostKeyword) {
                return
            }
            let index = -1;
            boostKeyword.split("|").forEach(alternativeKeyword => {
                if (index >= 0) {
                    return;
                }
                // iterate overa all title fragments
                for (let i = 0; i < titleFragments.length; i++) {
                    const titleFragment = titleFragments[i];
                    // ignore already highlighted parts
                    if (titleFragment.indexOf("<") == 0) {
                        continue
                    }
                    // search keyword in title fragement
                    index = titleFragment.toUpperCase().indexOf(alternativeKeyword);
                    if (index >= 0) {
                        // split matched title fragement
                        this.boostMatches += 1;
                        this.boostKeywords.push(boostKeyword);
                        if (isBoost) {
                            this.boostFactor = this.boostFactor * SCORING.BOOST_MULTIPLIER;
                        }
                        titleFragments[i] = [
                            titleFragment.substring(0, index),
                            "<u style='text-decoration-color: hsl(48, 100%, 67%); text-decoration-thickness: 0.25rem;'>" + titleFragment.substring(index, index + alternativeKeyword.length) + "</u>",
                            titleFragment.substring(index + alternativeKeyword.length)
                        ];
                        break
                    }
                }
                // flatten the array for matching the next keyword
                titleFragments = titleFragments.flat();
            });

        });
        // join highlighted title
        this.titleHighlighted = titleFragments.join("");
        // update score
        this.score = (this.citationCount + this.referenceCount + (this.isSelected ? 1 : 0)) * this.boostFactor;
        // update score color
        let lightness = SCORE_LIGHTNESS.DEFAULT;
        if (this.score >= SCORE_COLOR_THRESHOLDS.VERY_HIGH) {
            lightness = SCORE_LIGHTNESS.VERY_HIGH;
        } else if (this.score >= SCORE_COLOR_THRESHOLDS.HIGH) {
            lightness = SCORE_LIGHTNESS.HIGH;
        } else if (this.score >= SCORE_COLOR_THRESHOLDS.MEDIUM_HIGH) {
            lightness = SCORE_LIGHTNESS.MEDIUM_HIGH;
        } else if (this.score >= SCORE_COLOR_THRESHOLDS.MEDIUM) {
            lightness = SCORE_LIGHTNESS.MEDIUM;
        } else if (this.score >= SCORE_COLOR_THRESHOLDS.LOW) {
            lightness = SCORE_LIGHTNESS.LOW;
        }
        this.scoreColor = `hsl(0, 0%, ${lightness}%)`;
    }

    toBibtex() {
        function protectAcronyms(s) {
            let s2 = s;
            let detectedAcronyms = [];
            s.split(/\W/).forEach(word => {
                if (word.slice(1) != word.slice(1).toLowerCase() && !detectedAcronyms.includes(word)) {
                    s2 = s2.replaceAll(word, `{${word}}`)
                    detectedAcronyms.push(word);
                }
            });
            return s2;
        }
        function translateSpecialCharaters(s) {
            // &...; encoded characters
            s = s.replaceAll("&amp;", "\\&")
            s = s.replaceAll("&lt;", "<")
            s = s.replaceAll("&gt;", ">")
            s = s.replaceAll("&quot;", "\\\"")
            s = s.replaceAll("&apos;", "'");
            s = s.replaceAll("&nbsp;", " ");
            // less and greater than
            s = s.replaceAll("<", "{\\textless}")
            s = s.replaceAll(">", "{\\textgreater}")
            return s;
        }

        let type = "misc";
        let bibString = "";
        if (this.title) {
            bibString += `
    title = {${translateSpecialCharaters(protectAcronyms(this.title))}},`;
        }
        if (this.author) {
            bibString += `
    author = {${this.author.replaceAll(";", " and")}},`;
        }
        if (this.year) {
            bibString += `
    year = {${this.year}},`;
        }
        if (this.volume) {
            type = "article"
            bibString += `
    journal = {${translateSpecialCharaters(this.container)}},
    volume = {${this.volume}},`;
            if (this.issue) {
                bibString += `
    number = {${this.issue}},`;
            }
        } else if (this.container) {
            const container = this.container.toLowerCase();
            type = (container.indexOf("proceedings") >= 0 || container.indexOf("conference") >= 0 || container.indexOf("symposium") >= 0 || container.indexOf("workshop") >= 0) ? "inproceedings" : "incollection";
            bibString += `
    booktitle = {${translateSpecialCharaters(this.container)}},`;
        }
        if (this.page) {
            bibString += `
    pages = {${this.page}},`;
        }
        return `@${type}{${this.doi.replaceAll(/_/g, "")},${bibString}
    doi = {${this.doi}}
}`;
    }

    hasTag() {
        return Publication.TAGS.some(tag => this[tag.value]);
    }

    getMetaString() {
        let string = ""
        if (this.title) string += this.title + " ";
        if (this.author) string += this.author + " ";
        if (this.container) string += this.container + " ";
        return string;
    }

    setHover(isHovered) {
        this.isHovered = isHovered;
    }

    static get TAGS() {
        return [{
            value: "isHighlyCited",
            name: "Highly cited"
        },
        {
            value: "isSurvey",
            name: "Literature survey"
        },
        {
            value: "isNew",
            name: "New"
        },
        {
            value: "isUnnoted",
            name: "Unnoted"
        },
        ];
    }

    static sortPublications(publicationList) {
        publicationList.sort((a, b) => {
            return b.score - 1 / ((b.year ? b.year : 0) + 2) - (a.score - 1 / ((a.year ? a.year : 0) + 2))
        });
    }

}

const CURRENT_YEAR = new Date().getFullYear();

const TITLE_WORD_MAP = {
    "a": "a",
    "an": "an",
    "acm": "ACM",
    "and": "and",
    "by": "by",
    "chi": "CHI",
    "during": "during",
    "for": "for",
    "from": "from",
    "ieee": "IEEE",
    "ii": "II",
    "iii": "III",
    "in": "in",
    "not": "not",
    "of": "of",
    "or": "or",
    "on": "on",
    "the": "the",
    "their": "their",
    "through": "through",
    "to": "to",
    "via": "via",
    "with": "with",
    "within": "within",
}

function removeHtmlTags(string) {
    return string.replaceAll(/<[^>]*>/g, "");
}

function cleanTitle(title) {
    let cleanedTitle = "";
    removeHtmlTags(title).split(" ").forEach(word => {
        const mappedWord = TITLE_WORD_MAP[word.toLowerCase()];
        cleanedTitle += (mappedWord ? mappedWord : word) + " ";
    });
    cleanedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1); // make first character uppercase
    cleanedTitle = cleanedTitle.trim();
    cleanedTitle = cleanedTitle.replaceAll(/--/g, "–"); // en dash 
    cleanedTitle = cleanedTitle.replaceAll(/ - /g, " – "); // en dash
    cleanedTitle = cleanedTitle.replaceAll(/---/g, "—"); // em dash 
    cleanedTitle = cleanedTitle.replaceAll(/ ?— ?/g, "—"); // em dash 
    cleanedTitle = cleanedTitle.replaceAll(/&[A-Z]/g, match => match.toLowerCase()); // converting &-encoded charachters to lower case, e.g., "&Amp;" -> "&amp;"
    if (cleanedTitle.length > TEXT_PROCESSING.MAX_TITLE_LENGTH) {
        cleanedTitle = cleanedTitle.substring(0, TEXT_PROCESSING.TITLE_TRUNCATION_POINT) + TEXT_PROCESSING.TITLE_TRUNCATION_SUFFIX;
    }
    return cleanedTitle;
}