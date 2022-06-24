import { cachedFetch } from "./Cache.js";

export default class PublicationSearch {

    constructor(query) {
        this.query = query;
    }

    async execute() {
        const simplifiedQuery = this.query.replace(/\W+/g, "+").toLowerCase();
        console.log(`Searching for publications with title or similar to '${this.query}'.`)
        let results = [];
        await cachedFetch(
            `https://api.crossref.org/works?query=${simplifiedQuery}&mailto=fabian.beck@uni-bamberg.de&filter=has-references:true`,
            (data) => {
                data.message.items.filter(item => item.title).forEach((item) => {
                    results.push(item);
                });
            }
        );
        return results;
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