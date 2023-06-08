import _ from "lodash";

import { cachedFetch } from "./Cache.js";

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
        this.boostKeywords = []
        this.boostFactor = 1;
        this.score = 0;
        this.scoreColor = "#FFF";
        this.citationsPerYear = 0;
        // tags
        this.isSurvey = false;
        this.isHighlyCited = false;
        this.isNew = false;
        this.isUnnoted = false;
        this.isOpenAccess = false;
        // interface properties
        this.isActive = false;
        this.isLinkedToActive = false;
        this.isSelected = false;
        this.isRead = false;
        this.isHovered = false;
        this.isKeywordHovered = false;
        // loading state
        this.wasFetched = false;
    }

    async fetchData(dataService = true) {
        if (this.wasFetched) return
        try {
            if (dataService) {
                // load data from data service
                await cachedFetch(`https://pure-publications-cw3de4q5va-ew.a.run.app/?doi=${this.doi}`, data => {
                    this.processData(data);
                });
            } else {
                const data = {};
                // load data from OpenCitations
                let dataOpenCitations = null;
                await cachedFetch(`https://opencitations.net/index/coci/api/v1/metadata/${this.doi}`, message => {
                    dataOpenCitations = message[0];
                }, {
                    headers: {
                        authorization: "aa9da96d-3c7b-49c1-a2d8-1c2d01ae10a5",
                    }
                }
                );
                // load data from Crossref
                let dataCrossref = null;
                await cachedFetch(`https://api.crossref.org/v1/works/${this.doi}?mailto=fabian.beck@uni-bamberg.de`, message => {
                    dataCrossref = message.message;
                });
                // merge data
                data.title = dataCrossref?.title?.[0] || dataOpenCitations?.title;
                data.subtitle = dataCrossref?.subtitle?.[0];
                data.year = dataOpenCitations?.year || dataCrossref?.created?.['date-parts']?.[0]?.[0] || this.doi.match(/\.((19|20)\d\d)\./)?.[1];
                data.author = dataOpenCitations?.author;
                data.container = dataOpenCitations?.source_title;
                data.volume = dataOpenCitations?.volume;
                data.issue = dataOpenCitations?.issue;
                data.page = dataOpenCitations?.page;
                data.oaLink = dataOpenCitations?.oa_link;
                data.reference = dataOpenCitations?.reference;
                data.citation = dataOpenCitations?.citation;
                data.abstract = dataCrossref?.abstract;
                // remove undefined/empty properties from data
                Object.keys(data).forEach(key => (data[key] === undefined || data[key] === '') && delete data[key]);
                // process data
                this.processData(data);
            }
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
            this.author = data.author.replace(/(,\s+)(\d{4}-\d{4}-\d{4}-\d{3}[0-9X]{1})/g, "");
            this.authorOrcid = data.author.replace(/(,\s+)(\d{4}-\d{4}-\d{4}-\d{3}[0-9X]{1})/g, " <a href='https://orcid.org/$2'><img alt='ORCID logo' src='https://info.orcid.org/wp-content/uploads/2019/11/orcid_16x16.png' width='14' height='14' /></a>");
        }
        // container
        this.container = "";
        data.container?.split(" ").forEach(word => {
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
        // Google Scholar link (not listing year as potentially misleading)
        const searchString = `${this.title} ${this.author?.split(',')[0]} ${this.container ?? ""}`;
        this.gsUrl = `https://scholar.google.de/scholar?hl=en&q=${encodeURIComponent(searchString)}`
        // tags
        if (this.referenceDois.length > 100) {
            this.isSurvey = `more than 100 references (${this.referenceDois.length})`;
        } else if (this.referenceDois.length >= 50 && /.*(survey|state|review|advances|future).*/i.test(this.title)) {
            this.isSurvey = `more than 50 references (${this.referenceDois.length}) and "${/(survey|state|review|advances|future)/i.exec(this.title)[0]}" in the title`;
        }
        this.isHighlyCited = this.citationsPerYear > 10 ? `more than 10 citations per year (${this.citationsPerYear.toFixed(1)})` : false;
        this.isNew = (CURRENT_YEAR - this.year) < 2 ? "published within the last two calendar years" : false;
        this.isUnnoted = this.citationsPerYear < 1 ? `less than 1 citation per year (${this.citationsPerYear.toFixed(1)})` : false;
        this.isOpenAccess = this.oaLink ? true : false;
    }

    updateScore(boostKeywords) {
        this.boostKeywords = [];
        this.boostMatches = 0;
        this.boostFactor = 1;
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
                    index = titleFragment.toLowerCase().indexOf(alternativeKeyword);
                    if (index >= 0) {
                        // split matched title fragement
                        this.boostMatches += 1;
                        this.boostKeywords.push(boostKeyword);
                        this.boostFactor = this.boostFactor * 2;
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
        this.score = (this.citationCount + this.referenceCount) * this.boostFactor;
        // update score color
        let lightness = 100;
        if (this.score >= 32) {
            lightness = 60;
        } else if (this.score >= 16) {
            lightness = 72;
        } else if (this.score >= 8) {
            lightness = 80;
        } else if (this.score >= 4) {
            lightness = 90;
        } else if (this.score >= 2) {
            lightness = 95;
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
        {
            value: "isOpenAccess",
            name: "Open access"
        }];
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
    if (cleanedTitle.length > 300) {
        cleanedTitle = cleanedTitle.substring(0, 295) + "[...]";
    }
    return cleanedTitle;
}