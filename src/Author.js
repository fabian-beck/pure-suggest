export default class Author {

    constructor(authorString, authorIndex, publication, isAuthorScoreEnabled, isFirstAuthorBoostEnabled, isAuthorNewBoostEnabled) {
        this.name = authorString.replace(/(,\s+)(\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]{1})/g, "");
        this.id = Author.nameToId(this.name);
        this.count = 1;
        this.firstAuthorCount = authorIndex === 0 ? 1 : 0;
        this.score = (isAuthorScoreEnabled ? publication.score : 1)
          * (isFirstAuthorBoostEnabled ? (authorIndex > 0 ? 1 : 2) : 1)
          * (isAuthorNewBoostEnabled ? (publication.isNew ? 2 : 1) : 1);
        this.keywords = publication.boostKeywords.map(keyword => ({ [keyword]: 1 })).reduce((a, b) => Object.assign(a, b), {});
        const orcid = authorString.match(/(\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]{1})/g);
        this.orcid = orcid ? orcid[0] : undefined;
        this.alternativeNames = [this.name];
        this.coauthors = publication.author?.split("; ")
            .map(coauthor => Author.nameToId(coauthor))
            .filter(coauthorId => coauthorId !== this.id)
            .map(coauthorId => ({ [coauthorId]: 1 }))
            .reduce((a, b) => Object.assign(a, b), {}); // convert array to object;
        this.yearMin = publication.year;
        this.yearMax = publication.year;
        this.newPublication = publication.isNew;
    }

    mergeWith(author) {
        function mergeCounts(counts1, counts2) {
            const counts = {};
            Object.keys(counts1).forEach((key) => {
                counts[key] = counts1[key];
            });
            Object.keys(counts2).forEach((key) => {
                if (!counts[key]) {
                    counts[key] = 0;
                }
                counts[key] += counts2[key];
            });
            return counts;
        }

        this.count += author.count;
        this.firstAuthorCount += author.firstAuthorCount;
        this.score += author.score;
        this.keywords = mergeCounts(this.keywords, author.keywords);
        this.orcid = this.orcid? this.orcid : author.orcid;
        this.alternativeNames = [...new Set(this.alternativeNames.concat(author.alternativeNames))];
        this.coauthors = mergeCounts(this.coauthors, author.coauthors);
        this.yearMin = Math.min(this.yearMin, author.yearMin);
        this.yearMax = Math.max(this.yearMax, author.yearMax);
        this.newPublication = this.newPublication || author.newPublication;
    }

    static nameToId(str) {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }
}