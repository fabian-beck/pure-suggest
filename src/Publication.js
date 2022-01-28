import cachedFetch from "./Cache.js";

export default class Publication {
    constructor(doi) {
        this.doi = doi;
        this.citationDois = [];
        this.referenceDois = [];
        this.citationCount = 0;
        this.referenceCount = 0;
        this.boostFactor = 1;
        this.score = 0;
        this.title = "";
        this.container = "";
        this.year = undefined;
        this.authorShort = undefined;
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
                        console.error(`Could not retrieve metadata for DOI "${this.doi}".`)
                        this.title = "[unknown metadata]"
                        return;
                    }
                    const data = message[0];
                    this.title = data.title;
                    this.year = data.year;
                    if (data.author) {
                        const authorArray = data.author.split('; ');
                        if (authorArray.length === 1) {
                            this.authorShort = authorArray[0].split(', ')[0];
                        } else if (authorArray.length === 2) {
                            this.authorShort = `${authorArray[0].split(', ')[0]} and ${authorArray[1].split(', ')[1]}`;
                        } else if (authorArray.length > 2) {
                            this.authorShort = `${authorArray[0].split(', ')[0]} et al.`;
                        }
                        this.author = data.author;
                    }
                    this.container = data.source_title;
                    this.shortReference = `${this.authorShort ? this.authorShort : "[unknown author]"
                        }, ${this.year ? this.year : "[unknown year]"}`;
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
                }
            );
        }
    }

    updateScore(boostKeywords) {
        this.boostFactor = 1;
        boostKeywords.forEach(boostKeyword => {
            if (boostKeyword && this.title.toLowerCase().indexOf(boostKeyword) >= 0) {
                this.boostFactor = this.boostFactor * 2;
            }
        });
        this.score = (this.citationCount + this.referenceCount) * this.boostFactor;
    }

    static sortPublications(publicationList) {
        publicationList.sort((a, b) => b.score - a.score);
    }

}