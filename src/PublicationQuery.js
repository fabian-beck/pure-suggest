import cachedFetch from "./Cache.js";

export default class PublicationQuery {

    constructor(query) {
        this.query = query;
        this.dois = [];
    }

    async execute() {
        this.query.split(/ |"|\{|\}|doi:|doi.org\//).forEach((doi) => {
            doi = _.trim(doi, ".");
            if (doi.indexOf("10.") === 0) {
                this.dois.push(doi);
            }
        });
        if (this.dois.length === 0) {
            const simplifiedQuery = this.query.replace(/\W+/g, "+").toLowerCase();
            console.log(`Searching for publications with title or similar to '${this.query}'.`)
            await cachedFetch(
                "https://api.crossref.org/works?query.bibliographic=" + simplifiedQuery,
                (data) => {
                    let maxSimilarity = 0.7;
                    let maxTitle = "";
                    data.message.items.filter(item => item.title).forEach((item) => {
                        const title = (
                            item.title[0] +
                            (item.subtitle && item.title[0] !== item.subtitle[0] ? " " + item.subtitle[0] : "")
                        ).toLowerCase();
                        const similarity = this.computeTitleSimilarity(simplifiedQuery, title);
                        console.log(`  ... similarity to '${title}' is ${similarity}.`)
                        if (similarity > maxSimilarity) {
                            this.dois = [item.DOI];
                            maxTitle = title;
                            maxSimilarity = similarity;
                        }
                    });
                    if (maxTitle) {
                        console.log(`  Identified as best fit: '${maxTitle}' (${this.dois[0]})`);
                    } else {
                        console.log("  None of the publication titles is sufficiently similar.");
                    }
                }
            );

        }
    }

    computeTitleSimilarity(query, title) {
        let equivalentWordCounter = 0;
        let wordCounter = 0;
        let titleWithSpacing = " " + title + " "
        query.split("+").forEach((word) => {
            if (word.length > 2) {
                wordCounter++;
                if (titleWithSpacing.indexOf(" " + word + " ") >= 0) {
                    equivalentWordCounter++;
                }
            }
        });
        return (
            equivalentWordCounter / wordCounter
        );
    }

}