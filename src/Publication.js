import cachedFetch from "./Cache.js";

export default class Publication {
    constructor(doi) {
        // identifier
        this.doi = doi;
        // meta-data
        this.title = "";
        this.titleHighlighted = "";
        this.container = "";
        this.year = undefined;
        this.author = undefined;
        this.authorShort = undefined;
        this.authorOrcid = undefined;
        this.oaLink = undefined;
        // citation-related data
        this.citationDois = [];
        this.referenceDois = [];
        this.citationCount = 0;
        this.referenceCount = 0;
        this.boostFactor = 1;
        this.score = 0;
        this.scoreColor = "#FFF"
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
                        this.authorOrcid = data.author.replace(/(\,\s+)(\d{4}-\d{4}-\d{4}-\d{4})/g, " <a href='https://orcid.org/$2' target='_blank'><img alt='ORCID logo' src='https://info.orcid.org/wp-content/uploads/2019/11/orcid_16x16.png' width='14' height='14' /></a>");
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
                    this.oaLink = data.oa_link;
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

    static sortPublications(publicationList) {
        publicationList.sort((a, b) => b.score - a.score);
    }

}