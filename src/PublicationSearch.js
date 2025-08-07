import { cachedFetch } from "./Cache.js";
import Publication from "./Publication.js";
import { API_ENDPOINTS, API_PARAMS } from "./constants/api.js";

export default class PublicationSearch {

    constructor(query) {
        this.query = query;
    }

    async execute() {
        let dois = [];
        let results = [];
        // removing whitespace (e.g., through line breaks) in DOIs
        this.query = this.query.replace(/(10\.\d+\/)\s?(\S{0,12})\s([^[])/g, "$1$2$3");
        // splitting query by characters that must (or partly: should) be encoded differently in DOIs or by typical prefixes
        // see: https://www.doi.org/doi_handbook/2_Numbering.html
        // "\{|\}" necessary to read DOIs from BibTeX
        this.query.split(/ |"|%|#|\?|\{|\}|doi:|doi.org\//).forEach((doi) => {
            // cutting characters that might be included in DOI, but very unlikely at the end
            doi = doi.trim().replace(/^[.,;]+|[.,;]+$/g, '').replace("\\_", "_");
            if (doi.indexOf("10.") === 0 && !dois.includes(doi)) {
                dois.push(doi);
                const publication = new Publication(doi);
                publication.fetchData();
                results.push(publication);
            }
        });
        if (dois.length) {
            console.log(`Identified ${results.length} DOI(s) in input; do not perform search.`)
            return {results: results, type: "doi"};
        }
        const simplifiedQuery = this.query.replace(/\W+/g, "+").toLowerCase();
        console.log(`Searching for publications matching '${this.query}'.`)
        await cachedFetch(
            `${API_ENDPOINTS.CROSSREF}?query=${simplifiedQuery}&mailto=${API_PARAMS.CROSSREF_EMAIL}&filter=${API_PARAMS.CROSSREF_FILTER}`,
            (data) => {
                data.message.items.filter(item => item.title).forEach((item) => {
                    const publication = new Publication(item.DOI);
                    publication.fetchData();
                    results.push(publication);
                });
            }
        );
        return {results: results, type: "search"};
    }

    computeTitleSimilarity(query, title) {
        const stopwords = ["the", "for", "with", "and"]; // for words with length > 2
        let equivalentWordCounter = 0;
        let wordCounter = 0;
        let normalizedTitle = " " + title.replace(/\W+/g, " ").toLowerCase() + " "
        query.split("+").forEach((word) => {
            if (word.length > 2 && stopwords.indexOf(word) === -1) {
                wordCounter++;
                if (normalizedTitle.indexOf(" " + word + " ") >= 0) {
                    equivalentWordCounter++;
                }
            }
        });
        return (
            equivalentWordCounter / wordCounter
        );
    }

}