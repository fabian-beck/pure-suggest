export default class Filter {

    constructor() {
        this.tag = "";
    }

    matches(publication) {
        if (!this.tag) return true
        return publication[this.tag];
    }

}