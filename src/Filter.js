export default class Filter {

    constructor() {
        this.string = "";
        this.yearStart = undefined;
        this.yearEnd = undefined;
        this.tag = "";
        this.doi = "";
    }

    matchesString(publication) {
        if (!this.string) return true;
        return publication.getMetaString().toLowerCase().indexOf(this.string.toLowerCase()) >= 0;
    }

    isSpecificYearActive(yearNumeric) {
        return (yearNumeric && yearNumeric >= 1000 && yearNumeric < 10000);
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
        return publication[this.tag];
    }

    matchesDoi(publication) {
        if (!this.doi) return true;
        let dois = this.doi.split(',').map(doi => doi.trim());
        return dois.some(doi => publication.citationDois.includes(doi) || publication.referenceDois.includes(doi));
    }

    matches(publication) {
        return this.matchesString(publication)
            && this.matchesTag(publication)
            && this.matchesYear(publication)
            && this.matchesDoi(publication);
    }

}