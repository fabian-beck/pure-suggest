import _ from "lodash";

import { cachedFetch } from "./Cache.js";

const minSimilarityDifference = 0.1;

export default class PublicationQuery {

    constructor(query) {
        this.query = query;
    }

    async execute() {
        let dois = [];
        let ambiguousResult = false;
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
                `https://api.crossref.org/works?query.bibliographic=${simplifiedQuery}&mailto=fabian.beck@uni-bamberg.de`,
                (data) => {
                    let maxSimilarity = 0.7;
                    let maxTitle = "";
                    ambiguousResult = true;
                    data.message.items.filter(item => item.title).forEach((item) => {
                        const title =
                            item.title[0] +
                            (item.subtitle && item.title[0] !== item.subtitle[0] ? " " + item.subtitle[0] : "")
                        const similarity = this.computeTitleSimilarity(simplifiedQuery, title);
                        const similarityDifference = similarity - maxSimilarity
                        if (similarityDifference > minSimilarityDifference) {
                            // clear new max 
                            ambiguousResult = false;
                        } else if (similarityDifference > -minSimilarityDifference) {
                            // close to max
                            ambiguousResult = true;
                        }
                        console.log(`  ... similarity to '${title}' is ${similarity}.`)
                        if (similarity > maxSimilarity) {
                            dois = [item.DOI];
                            maxTitle = title;
                            maxSimilarity = similarity;
                        }
                    });
                    if (maxTitle) {
                        if (!ambiguousResult) {
                            console.log(`  Identified as best fit: '${maxTitle}' (${dois[0]})`);
                        } else {
                            console.log("  Some publication titles are sufficiently similar, but the result is ambiguous.");
                        }
                    } else {
                        console.log("  None of the publication titles is sufficiently similar.");
                    }
                }
            );
        }
        return { dois: dois, ambiguousResult: ambiguousResult };
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