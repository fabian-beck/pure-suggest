import { VALIDATION } from './constants/ui.js';

export default class Filter {

    constructor() {
        this.string = "";
        this.yearStart = undefined;
        this.yearEnd = undefined;
        this.tag = "";
        this.doi = "";
        this.dois = [];
    }

    matchesString(publication) {
        if (!this.string) return true;
        return publication.getMetaString().toLowerCase().indexOf(this.string.toLowerCase()) >= 0;
    }

    isSpecificYearActive(yearNumeric) {
        return (yearNumeric != null && !isNaN(yearNumeric) && yearNumeric >= VALIDATION.MIN_YEAR && yearNumeric < VALIDATION.MAX_YEAR);
    }

    isYearActive() {
        return this.isSpecificYearActive(Number(this.yearStart)) || this.isSpecificYearActive(Number(this.yearEnd));
    }

    matchesYearStart(publication) {
        const yearStartNumeric = Number(this.yearStart);
        if (!this.isSpecificYearActive(yearStartNumeric)) return true;
        return yearStartNumeric <= Number(publication.year);
    }

    matchesYearEnd(publication) {
        const yearEndNumeric = Number(this.yearEnd);
        if (!this.isSpecificYearActive(yearEndNumeric)) return true;
        return yearEndNumeric >= Number(publication.year);
    }

    matchesYear(publication) {
        if (!publication.year) return false;
        return this.matchesYearStart(publication) && this.matchesYearEnd(publication);
    }

    matchesTag(publication) {
        if (!this.tag) return true;
        return Boolean(publication[this.tag]);
    }

    toggleDoi(doi) {
        if (this.dois.includes(doi)) {
            this.removeDoi(doi);
        } else {
            this.addDoi(doi);
        }
    }

    addDoi(doi) {
        if (!this.dois.includes(doi)) {
            this.dois.push(doi);
        }
    }

    removeDoi(doi) {
        console.log(`Removing DOI: ${doi}`);
        this.dois = this.dois.filter(d => d !== doi);
        console.log(`Remaining DOIs: ${this.dois}`);
    }

    matchesDois(publication) {
        if (!this.dois.length) return true;
        return this.dois.some(doi => publication.citationDois.includes(doi) || publication.referenceDois.includes(doi));
    }

    matches(publication) {
        return this.matchesString(publication)
            && this.matchesTag(publication)
            && this.matchesYear(publication)
            && this.matchesDois(publication);
    }

}