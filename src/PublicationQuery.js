import _ from "lodash";

import cachedFetch from "./Cache.js";

export default class PublicationQuery {

    constructor(query) {
        this.query = query;
    }

    async execute() {
        let dois = [];
        this.query.split(/ |"|\{|\}|doi:|doi.org\//).forEach((doi) => {
            doi = _.trim(doi, ".");
            if (doi.indexOf("10.") === 0) {
                dois.push(doi);
            }
        });
        if (dois.length === 0) {
            const simplifiedQuery = this.query.replace(/\W+/g, "+").toLowerCase();
            console.log(`Searching for publications with title or similar to '${this.query}'.`)
            await cachedFetch(
                "https://api.crossref.org/works?query.bibliographic=" + simplifiedQuery,
                (data) => {
                    let maxSimilarity = 0.7;
                    let maxTitle = "";
                    data.message.items.filter(item => item.title).forEach((item) => {
                        const title =
                            item.title[0] +
                            (item.subtitle && item.title[0] !== item.subtitle[0] ? " " + item.subtitle[0] : "")
                        const similarity = this.computeTitleSimilarity(simplifiedQuery, title);
                        console.log(`  ... similarity to '${title}' is ${similarity}.`)
                        if (similarity > maxSimilarity) {
                            dois = [item.DOI];
                            maxTitle = title;
                            maxSimilarity = similarity;
                        }
                    });
                    if (maxTitle) {
                        console.log(`  Identified as best fit: '${maxTitle}' (${dois[0]})`);
                    } else {
                        console.log("  None of the publication titles is sufficiently similar.");
                    }
                }
            );
        }
        return dois;
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