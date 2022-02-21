import _ from "lodash";

import cachedFetch from "./Cache.js";

export default class Publication {
    constructor(doi) {
        // identifier
        this.doi = doi;
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
        // citation-related data
        this.citationDois = [];
        this.referenceDois = [];
        this.citationCount = 0;
        this.referenceCount = 0;
        this.boostFactor = 1;
        this.score = 0;
        this.scoreColor = "#FFF";
        this.isSurvey = false;
        this.citationsPerYear = 0;
        this.isHighlyCited = false;
        // interface properties
        this.isActive = false;
        this.isLinkedToActive = false;
        this.isSelected = false;
    }

    async fetchData() {
        if (!this.title) {
            await cachedFetch(
                `https://opencitations.net/index/coci/api/v1/metadata/${this.doi}`,
                message => {
                    if (!message || message.length === 0) {
                        console.error(`Unable to process metadata for DOI "${this.doi}" because of empty message.`)
                        this.title = "[unknown metadata]"
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
                    // other meta-data
                    this.year = data.year;
                    this.volume = data.volume;
                    this.issue = data.issue;
                    this.page = data.page;
                    this.oaLink = data.oa_link;
                    // short reference
                    this.shortReference = `${this.authorShort ? this.authorShort : "[unknown author]"
                        }, ${this.year ? this.year : "[unknown year]"}`;
                    // references and citations
                    data.reference.split("; ").forEach(referenceDoi => {
                        if (referenceDoi) {
                            this.referenceDois.push(referenceDoi);
                        }
                    });
                    data.citation.split("; ").forEach(citationDoi => {
                        if (citationDoi) {
                            this.citationDois.push(citationDoi);
                        }
                    });
                    this.citationsPerYear = this.citationDois.length / (Math.max(1, CURRENT_YEAR - this.year));
                    // tags
                    if (this.referenceDois.length > 100) {
                        this.isSurvey = `more than 100 references (${this.referenceDois.length})`;
                    } else if (this.referenceDois.length >= 50 && /.*(survey|state|review|advances|future).*/i.test(this.title)) {
                        this.isSurvey = `more than 50 references (${this.referenceDois.length}) and "${/(survey|state|review|advances|future)/i.exec(this.title)[0]}" in the title`;
                    }
                    this.isHighlyCited = this.citationsPerYear > 10 ? `more than 10 citations per year (${this.citationsPerYear})` : false;
                }
            );
        }
    }

    updateScore(boostKeywords) {
        this.boostFactor = 1;
        this.titleHighlighted = this.title;
        boostKeywords.forEach(boostKeyword => {
            const index = this.titleHighlighted.toLowerCase().indexOf(boostKeyword);
            if (boostKeyword && index >= 0) {
                this.boostFactor = this.boostFactor * 2;
                this.titleHighlighted = this.titleHighlighted.substring(0, index) + "<u style='text-decoration-color: hsl(48, 100%, 67%); text-decoration-thickness: 0.25rem;'>" + this.titleHighlighted.substring(index, index + boostKeyword.length) + "</u>" + this.titleHighlighted.substring(index + boostKeyword.length);
            }
        });
        this.score = (this.citationCount + this.referenceCount) * this.boostFactor;
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
        let other = "";
        if (this.volume) {
            type = "article"
            other += `
    journal = {${this.container}},
    volume = {${this.volume}},`
            if (this.issue) {
                other += `
    number = {${this.issue}},`
            }
        } else if (this.container) {
            const container = this.container.toLowerCase();
            type = (container.indexOf("proceedings") >= 0 || container.indexOf("conference") >= 0 || container.indexOf("symposium") >= 0 || container.indexOf("workshop") >= 0) ? "inproceedings" : "incollection";
            other += `
    booktitle = {${this.container}},`
        }
        if (this.page) {
            other += `
    pages = {${this.page}},`
        }
        return `@${type}{${this.author.split(",")[0] + this.year + this.title.split(/\W/)[0]},
    title = {${this.title}},
    author = {${this.author.replaceAll(";", " and")}},${other}
    year = {${this.year}},
    doi = {${this.doi}}
}`
    }

    static async computeSuggestions(publications, removedPublicationDois, boostKeywords) {
        function incrementSuggestedPublicationCounter(
            doi,
            counter,
            doiList,
            sourceDoi
        ) {
            if (!removedPublicationDois.has(doi)) {
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

        console.log("Starting to compute new suggestions.");
        const suggestedPublications = {};
        await Promise.all(
            Object.values(publications).map(async (publication) => {
                await publication.fetchData();
                publication.isSelected = true;
            })
        );
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
        let filteredSuggestions = Object.values(suggestedPublications);
        console.log(`Identified ${filteredSuggestions.length} publications as suggestions.`);
        // titles not yet fetched, that is why sorting can be only done on citations/references
        filteredSuggestions.sort(
            (a, b) =>
                b.citationCount + b.referenceCount - (a.citationCount + a.referenceCount)
        );
        filteredSuggestions = filteredSuggestions.slice(0, 30 * Math.sqrt(Object.keys(publications).length));
        console.log(`Filtered suggestions to ${filteredSuggestions.length} top candidates, loading metadata for these.`);
        await Promise.all(filteredSuggestions.map(async (suggestedPublication) => await suggestedPublication.fetchData()));
        filteredSuggestions.forEach((publication) =>
            publication.updateScore(boostKeywords)
        );
        this.sortPublications(filteredSuggestions);
        console.log("Completed computing and loading of new suggestions.");
        return filteredSuggestions;
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