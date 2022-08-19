export default class Filter {

    constructor() {
        this.string = "";
        this.yearStart = undefined;
        this.yearEnd = undefined;
        this.tag = "";
    }

    matchesString(publication) {
        if (!this.string) return true;
        return publication.getMetaString().toLowerCase().indexOf(this.string.toLowerCase()) >= 0;
    }

    matchesYearStart(publication) {
        if (!this.yearStart || !Number(this.yearStart)) return true;
        if (!publication.year) return false;
        return Number(this.yearStart) <= Number(publication.year);
    }

    matchesYearEnd(publication) {
        if (!this.yearEnd || !Number(this.yearEnd) || Number(this.yearEnd) < 1000 ) return true;
        if (!publication.year) return false;
        return Number(this.yearEnd) >= Number(publication.year);
    }

    matchesTag(publication) {
        if (!this.tag) return true;
        return publication[this.tag];
    }

    matches(publication) {
        return this.matchesString(publication)
            && this.matchesTag(publication)
            && this.matchesYearStart(publication)
            && this.matchesYearEnd(publication);
    }

}