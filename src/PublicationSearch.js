import _ from "lodash";
import { cachedFetch } from "./Cache.js";
import Publication from "./Publication.js";

export default class PublicationSearch {

    constructor(query) {
        this.query = query;
    }

    async execute() {
        let dois = [];
        let results = [];
        // splitting query by characters that must be encoded differently in DOIs or by typical prefixes
        // see: https://www.doi.org/doi_handbook/2_Numbering.html
        this.query.split(/ |"|%|#|\?|doi:|doi.org\//).forEach((doi) => {
            // cutting characters that might be included in DOI, but very unlikely at the end
            doi = _.trim(doi, ".,;");
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
            `https://api.crossref.org/works?query=${simplifiedQuery}&mailto=fabian.beck@uni-bamberg.de&filter=has-references:true`,
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