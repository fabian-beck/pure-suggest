export default class Filter {

    constructor() {
        this.tag = "";
        this.string = ""
    }

    matchesString(publication) {
        if (!this.string) return true;
        return publication.getMetaString().toLowerCase().indexOf(this.string.toLowerCase()) >= 0;
    }

    matchesTag(publication) {
        if (!this.tag) return true;
        return publication[this.tag];
    }

    matches(publication) {
        return this.matchesString(publication) && this.matchesTag(publication);
    }

}