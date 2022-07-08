import _ from "lodash";

import { cachedFetch } from "./Cache.js";
import { shuffle } from "./Util.js"

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
        this.authorOrcid = undefined;
        this.container = undefined;
        this.volume = undefined;
        this.issue = undefined;
        this.page = undefined;
        this.oaLink = undefined;
        this.abstract = undefined;
        // citation-related data
        this.citationDois = [];
        this.referenceDois = [];
        this.citationCount = 0;
        this.referenceCount = 0;
        this.boostMatches = 0;
        this.boostFactor = 1;
        this.score = 0;
        this.scoreColor = "#FFF";
        this.isSurvey = false;
        this.citationsPerYear = 0;
        this.isHighlyCited = false;
        this.isNew = false;
        // interface properties
        this.isActive = false;
        this.isLinkedToActive = false;
        this.isSelected = false;
        this.isRead = false;
    }

    async fetchData() {
        if (!this.title) {
            await cachedFetch(
                `https://opencitations.net/index/coci/api/v1/metadata/${this.doi}`,
                message => {
                    if (!message || message.length === 0) {
                        console.error(`Unable to process metadata for DOI "${this.doi}" because of empty message.`);
                        return;
                    }
                    const data = message[0];
                    // title
                    this.title = data.title;
                    this.title = "";
                    data.title.split(" ").forEach(word => {
                        const mappedWord = TITLE_WORD_MAP[word.toLowerCase()];
                        this.title += (mappedWord ? mappedWord : word) + " ";
                    });
                    this.title = this.title.charAt(0).toUpperCase() + this.title.slice(1); // make first character uppercase
                    this.title = this.title.trim();
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
                        this.author = data.author.replace(/(,\s+)(\d{4}-\d{4}-\d{4}-\d{3}[0-9X]{1})/g, "");
                        this.authorOrcid = data.author.replace(/(,\s+)(\d{4}-\d{4}-\d{4}-\d{3}[0-9X]{1})/g, " <a href='https://orcid.org/$2'><img alt='ORCID logo' src='https://info.orcid.org/wp-content/uploads/2019/11/orcid_16x16.png' width='14' height='14' /></a>");
                    }
                    // container (booktitle or journal) 
                    this.container = "";
                    data.source_title.split(" ").forEach(word => {
                        let mappedWord = "";
                        if (/\(.+\)/.test(word)) { // acronyms in brackets
                            mappedWord = word.toUpperCase();
                        } else if (/\d+(st|nd|rd|th)/i.test(word)) { // 1st 2nd 3rd 4th etc.
                            mappedWord = word.toLowerCase();
                        } else if (/^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})(\.?)$/i.test(word)) { // roman numerals - see: https://regexpattern.com/roman-numerals/
                            mappedWord = word.toUpperCase();
                        } else {
                            mappedWord = TITLE_WORD_MAP[word.toLowerCase()];
                        }
                        this.container += (mappedWord ? mappedWord : word) + " ";
                    });
                    this.container = _.trim(this.container, '. ');
                    this.container = this.container.charAt(0).toUpperCase() + this.container.slice(1); // make first character uppercase
                    // bibString meta-data
                    this.year = data.year;
                    if (!this.year) {
                        const match = this.doi.match(/\.((19|20)\d\d)\./);
                        if (match) {
                            this.year = match[1];
                        }
                    }
                    this.volume = data.volume;
                    this.issue = data.issue;
                    this.page = data.page;
                    this.oaLink = data.oa_link;
                    this.gsUrl = `https://scholar.google.de/scholar?hl=en&q=${this.title
                        } ${this.author ? this.author : ''}`
                    // references and citations
                    data.reference.split("; ").forEach(referenceDoi => {
                        if (referenceDoi) {
                            this.referenceDois.push(referenceDoi.toLowerCase());
                        }
                    });
                    data.citation.split("; ").forEach(citationDoi => {
                        if (citationDoi) {
                            this.citationDois.push(citationDoi.toLowerCase());
                        }
                    });
                    this.citationsPerYear = this.citationDois.length / (Math.max(1, CURRENT_YEAR - this.year));
                    // tags
                    if (this.referenceDois.length > 100) {
                        this.isSurvey = `more than 100 references (${this.referenceDois.length})`;
                    } else if (this.referenceDois.length >= 50 && /.*(survey|state|review|advances|future).*/i.test(this.title)) {
                        this.isSurvey = `more than 50 references (${this.referenceDois.length}) and "${/(survey|state|review|advances|future)/i.exec(this.title)[0]}" in the title`;
                    }
                    this.isHighlyCited = this.citationsPerYear > 10 ? `more than 10 citations per year (${this.citationsPerYear.toFixed(1)})` : false;
                    this.isNew = (CURRENT_YEAR - this.year) < 2 ? "published within the last two calendar years" : false;
                }
            );
            await cachedFetch(`https://api.crossref.org/v1/works/${this.doi}?mailto=fabian.beck@uni-bamberg.de`, response => {
                if (response.message.abstract) {
                    this.abstract = response.message.abstract.replaceAll(/<jats:/gi, "<").replaceAll(/<\/jats:/gi, "</").replaceAll(/<.*?>abstract<.*?>/gi, "");
                }
                const subtitle = response.message.subtitle;
                if (subtitle.length && this.title.toLowerCase().indexOf(subtitle[0].toLowerCase())) {
                    // merging title and subtitle, while adding a colon only when title does not end with a non-alpha-numeric character (cleaning potential html tags first)
                    const cleanedTitle = this.title.replaceAll(/<[^>]*>/g, "");
                    this.title = `${this.title}${cleanedTitle.match(/^.*\W$/) ? "" : ":"}  ${subtitle[0]}`;
                }
            });
        }
    }

    updateScore(boostKeywords) {
        this.boostMatches = 0;
        this.boostFactor = 1;
        // use an array to keep track of highlighted title fragements
        let titleFragments = [this.title];
        // iterate over all boost keywords
        boostKeywords.forEach(boostKeyword => {
            if (!boostKeyword) {
                return
            }
            // iterate overa all title fragments
            for (let i = 0; i < titleFragments.length; i++) {
                const titleFragment = titleFragments[i];
                // ignore already highlighted parts
                if (titleFragment.indexOf("<") == 0) {
                    continue
                }
                // search keyword in title fragement
                const index = titleFragment.toLowerCase().indexOf(boostKeyword);
                if (index >= 0) {
                    // split matched title fragement
                    this.boostMatches += 1;
                    this.boostFactor = this.boostFactor * 2;
                    titleFragments[i] = [
                        titleFragment.substring(0, index),
                        "<u style='text-decoration-color: hsl(48, 100%, 67%); text-decoration-thickness: 0.25rem;'>" + titleFragment.substring(index, index + boostKeyword.length) + "</u>",
                        titleFragment.substring(index + boostKeyword.length)
                    ];
                    break
                }
            }
            // flatten the array for matching the next keyword
            titleFragments = titleFragments.flat();
        });
        // join highlighted title
        this.titleHighlighted = titleFragments.join("");
        // update score
        this.score = (this.citationCount + this.referenceCount) * this.boostFactor;
        // update score color
        let lightness = 100;
        if (this.score >= 20) {
            lightness = 50;
        } else if (this.score >= 10) {
            lightness = 70;
        } else if (this.score >= 5) {
            lightness = 80;
        } else if (this.score >= 3) {
            lightness = 90;
        } else if (this.score >= 2) {
            lightness = 95;
        }
        this.scoreColor = `hsl(0, 0%, ${lightness}%)`;
    }

    toBibtex() {
        let type = "misc";
        let bibString = "";
        if (this.title) {
            bibString += `
    title = {${this.title}},`;
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
    journal = {${this.container}},
    volume = {${this.volume}},`;
            if (this.issue) {
                bibString += `
    number = {${this.issue}},`;
            }
        } else if (this.container) {
            const container = this.container.toLowerCase();
            type = (container.indexOf("proceedings") >= 0 || container.indexOf("conference") >= 0 || container.indexOf("symposium") >= 0 || container.indexOf("workshop") >= 0) ? "inproceedings" : "incollection";
            bibString += `
    booktitle = {${this.container}},`;
        }
        if (this.page) {
            bibString += `
    pages = {${this.page}},`;
        }
        return `@${type}{${this.doi},${bibString}
    doi = {${this.doi}}
}`;
    }

    static async computeSuggestions(publications, excludedPublicationsDois, boostKeywords, updateLoadingToast, maxSuggestions) {

        function incrementSuggestedPublicationCounter(
            doi,
            counter,
            doiList,
            sourceDoi
        ) {
            if (!excludedPublicationsDois.has(doi)) {
                if (!publications[doi]) {
                    if (!suggestedPublications[doi]) {
                        const citingPublication = new Publication(doi);
                        suggestedPublications[doi] = citingPublication;
                    }
                    suggestedPublications[doi][doiList].push(sourceDoi);
                    suggestedPublications[doi][counter]++;
                } else {
                    publications[doi][counter]++;
                }
            }
        }

        console.log(`Starting to compute new suggestions based on ${Object.keys(publications).length} selected (and ${excludedPublicationsDois.size} excluded).`);
        const suggestedPublications = {};
        Object.values(publications).forEach((publication) => {
            publication.citationCount = 0;
            publication.referenceCount = 0;
        });
        Object.values(publications).forEach((publication) => {
            publication.citationDois.forEach((citationDoi) => {
                incrementSuggestedPublicationCounter(
                    citationDoi,
                    "citationCount",
                    "referenceDois",
                    publication.doi
                );
            });
            publication.referenceDois.forEach((referenceDoi) => {
                incrementSuggestedPublicationCounter(
                    referenceDoi,
                    "referenceCount",
                    "citationDois",
                    publication.doi
                );
            });
        });
        Object.values(publications).forEach((publication) =>
            publication.updateScore(boostKeywords)
        );
        let filteredSuggestions = Object.values(suggestedPublications);
        filteredSuggestions = shuffle(filteredSuggestions, 0);
        console.log(`Identified ${filteredSuggestions.length} publications as suggestions.`);
        // titles not yet fetched, that is why sorting can be only done on citations/references
        filteredSuggestions.sort(
            (a, b) =>
                b.citationCount + b.referenceCount - (a.citationCount + a.referenceCount)
        );
        filteredSuggestions = filteredSuggestions.slice(0, maxSuggestions);
        console.log(`Filtered suggestions to ${filteredSuggestions.length} top candidates, loading metadata for these.`);
        let publicationsLoadedCount = 0;
        updateLoadingToast(`${publicationsLoadedCount}/${filteredSuggestions.length} suggestions loaded`, "is-info");
        await Promise.all(filteredSuggestions.map(async (suggestedPublication) => {
            await suggestedPublication.fetchData()
            publicationsLoadedCount++;
            updateLoadingToast(`${publicationsLoadedCount}/${filteredSuggestions.length} suggestions loaded`, "is-info");
        }));
        filteredSuggestions.forEach((publication) =>
            publication.updateScore(boostKeywords)
        );
        this.sortPublications(filteredSuggestions);
        console.log("Completed computing and loading of new suggestions.");
        return {
            publications: Object.values(filteredSuggestions),
            totalSuggestions: Object.values(suggestedPublications).length
        };
    }

    static sortPublications(publicationList) {
        publicationList.sort((a, b) => {
            return b.score - 1 / (b.citationsPerYear + 1) - (a.score - 1 / (a.citationsPerYear + 1))
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
    "in": "in",
    "not": "not",
    "of": "of",
    "or": "or",
    "on": "on",
    "the": "the",
    "their": "their",
    "through": "through",
    "to": "to",
    "with": "with",
    "within": "within",
}