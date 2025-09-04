import { SCORING } from '../constants/config.js';

export default class Author {

    constructor(authorString, authorIndex, publication, isAuthorScoreEnabled, isFirstAuthorBoostEnabled, isAuthorNewBoostEnabled) {
        this.name = authorString.replace(/(,\s+)(\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]{1})/g, "");
        this.id = Author.nameToId(this.name);
        this.count = 1;
        this.firstAuthorCount = authorIndex === 0 ? 1 : 0;
        this.score = (isAuthorScoreEnabled ? publication.score : 1)
            * (isFirstAuthorBoostEnabled ? (authorIndex > 0 ? 1 : SCORING.FIRST_AUTHOR_BOOST) : 1)
            * (isAuthorNewBoostEnabled ? (publication.isNew ? SCORING.NEW_PUBLICATION_BOOST : 1) : 1);
        this.keywords = publication.boostKeywords.map(keyword => ({ [keyword]: 1 })).reduce((a, b) => ({ ...a, ...b }), {});
        const orcid = authorString.match(/(\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]{1})/g);
        this.orcid = orcid ? orcid[0] : undefined;
        this.alternativeNames = [this.name];
        this.coauthors = publication.author?.split("; ")
            ?.map(coauthor => Author.nameToId(coauthor))
            .filter(coauthorId => coauthorId !== this.id)
            .map(coauthorId => ({ [coauthorId]: 1 }))
            .reduce((a, b) => ({ ...a, ...b }), {}) ?? {}; // convert array to object;
        this.yearMin = publication.year;
        this.yearMax = publication.year;
        this.newPublication = publication.isNew;
        this.publicationDois = [publication.doi];
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
        this.orcid = this.orcid ? this.orcid : author.orcid;
        this.alternativeNames = [...new Set(this.alternativeNames.concat(author.alternativeNames))];
        this.coauthors = mergeCounts(this.coauthors, author.coauthors);
        this.yearMin = Math.min(this.yearMin || Infinity, author.yearMin || Infinity) || undefined;
        this.yearMax = Math.max(this.yearMax || -Infinity, author.yearMax || -Infinity) || undefined;
        this.newPublication = this.newPublication || author.newPublication;
        this.publicationDois = [...new Set(this.publicationDois.concat(author.publicationDois))];
    }

    static nameToId(str) {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            // Handle Nordic and other extended Latin characters not covered by NFD
            .replace(/[øØ]/g, "o")
            .replace(/[åÅ]/g, "a")
            .replace(/[æÆ]/g, "ae")
            .replace(/[ðÐ]/g, "d")
            .replace(/[þÞ]/g, "th")
            .replace(/[ßẞ]/g, "ss")
            .toLowerCase();
    }

    static generateEszettVariants(nameId) {
        // Generate possible variants for Eszett transcriptions
        const variants = new Set([nameId]);
        
        // If name contains 'ss', generate variants with 's' and 'b'
        if (nameId.includes('ss')) {
            // Replace 'ss' with 's' (single s transcription)
            variants.add(nameId.replace(/ss/g, 's'));
            // Replace 'ss' with 'b' (b transcription)
            variants.add(nameId.replace(/ss/g, 'b'));
        }
        
        // If name contains 'b', generate 'ss' and 's' variants (reverse transcription)
        if (nameId.includes('b')) {
            // Replace 'b' with 'ss' (most common transcription)
            variants.add(nameId.replace(/b/g, 'ss'));
            // Replace 'b' with 's' (single s transcription)
            variants.add(nameId.replace(/b/g, 's'));
        }
        
        // If name contains single 's' (but not 'ss'), generate 'ss' and 'b' variants
        // This is more conservative - only for names that likely had 'ß' originally
        // Apply this only to the surname part (before the comma)
        const nameParts = nameId.split(',');
        if (nameParts.length >= 2) {
            const surname = nameParts[0].trim();
            const restOfName = nameId.substring(surname.length);
            
            if (surname.length > 3 && surname.includes('s') && !surname.includes('ss') && !surname.includes('b')) {
                // Replace single 's' with 'ss' for common German patterns in surname only
                const doubleVariant = surname.replace(/s/g, 'ss') + restOfName;
                if (doubleVariant !== nameId) {
                    variants.add(doubleVariant);
                }
                // Replace single 's' with 'b' for b transcription in surname only
                const bVariant = surname.replace(/s/g, 'b') + restOfName;
                if (bVariant !== nameId) {
                    variants.add(bVariant);
                }
            }
        }
        
        return Array.from(variants);
    }

    static computePublicationsAuthors(publications, isAuthorScoreEnabled, isFirstAuthorBoostEnabled, isAuthorNewBoostEnabled) {

        function deleteAuthor(authorId, newAuthorId) {
            delete authors[authorId];
            Object.values(authors).forEach((author) => {
                if (author.coauthors[authorId]) {
                    author.coauthors[newAuthorId] = author.coauthors[newAuthorId] ? author.coauthors[newAuthorId] + author.coauthors[authorId] : author.coauthors[authorId];
                    delete author.coauthors[authorId];
                }
            });
        }

        const authors = {};
        // assemble authors from selected publications
        publications.forEach((publication) => {
            publication.authorOrcid?.split("; ").forEach((authorString, i) => {
                const author = new Author(authorString, i, publication,
                    isAuthorScoreEnabled,
                    isFirstAuthorBoostEnabled,
                    isAuthorNewBoostEnabled
                );
                if (!authors[author.id]) {
                    authors[author.id] = author;
                } else {
                    authors[author.id].mergeWith(author);
                }
            });
        });
        // merge author with same ORCID
        const orcidAuthors = Object.values(authors).filter((author) => author.orcid);
        orcidAuthors.forEach((author) => {
            const authorMatches = orcidAuthors.filter((author2) => author2.orcid === author.orcid);
            if (authorMatches.length > 1) {
                authorMatches.forEach((author2) => {
                    if (author.id.length > author2.id.length) {
                        author.mergeWith(author2);
                        deleteAuthor(author2.id, author.id);
                    }
                });
            }
        });
        // match authors with abbreviated names and merge them
        let authorsWithAbbreviatedNames = Object.values(authors).filter((author) => author.id.match(/^\w+,\s\w\.?(\s\w\.?)?$/));
        Object.values(authors).filter(author => !authorsWithAbbreviatedNames.includes(author)).forEach((author) => {
            // check if author has version with additional first name
            if (Object.values(authors).filter((author2) => author2.id.startsWith(author.id)).length > 1) {
                authorsWithAbbreviatedNames.push(author);
            }
        });
        const authorsWithoutAbbreviatedNames = Object.values(authors).filter((author) => !authorsWithAbbreviatedNames.includes(author));
        authorsWithAbbreviatedNames.forEach((author) => {
            const authorId = author.id.replace(/^(\w+,\s\w)\.?(\s\w\.?)?$/, "$1")
            const authorMatches = authorsWithoutAbbreviatedNames.filter((author2) => author2.id.startsWith(authorId));
            if (authorMatches.length === 1 && (!author.orcid || !authorMatches[0].orcid || author.orcid === authorMatches[0].orcid)) {
                authorMatches[0].mergeWith(author);
                deleteAuthor(author.id, authorMatches[0].id);
            }
        });
        
        // merge authors with Eszett transcription variants
        const remainingAuthors = Object.values(authors);
        const processedAuthors = new Set();
        
        remainingAuthors.forEach((author) => {
            if (processedAuthors.has(author.id)) return;
            
            const authorVariants = Author.generateEszettVariants(author.id);
            const matchingAuthors = remainingAuthors.filter((otherAuthor) => {
                if (otherAuthor.id === author.id || processedAuthors.has(otherAuthor.id)) return false;
                
                const otherVariants = Author.generateEszettVariants(otherAuthor.id);
                
                // Check if any variant of one author matches any variant of the other
                return authorVariants.some(variant => otherVariants.includes(variant)) ||
                       otherVariants.some(variant => authorVariants.includes(variant));
            });
            
            if (matchingAuthors.length > 0) {
                // Merge all matching authors into the first one found
                // Prefer authors with longer names (more complete information)
                const allMatches = [author, ...matchingAuthors];
                const primaryAuthor = allMatches.reduce((best, current) => 
                    current.id.length > best.id.length ? current : best
                );
                
                allMatches.forEach((matchingAuthor) => {
                    if (matchingAuthor.id !== primaryAuthor.id && !processedAuthors.has(matchingAuthor.id)) {
                        // Only merge if they don't have conflicting ORCIDs
                        if (!primaryAuthor.orcid || !matchingAuthor.orcid || primaryAuthor.orcid === matchingAuthor.orcid) {
                            primaryAuthor.mergeWith(matchingAuthor);
                            deleteAuthor(matchingAuthor.id, primaryAuthor.id);
                            processedAuthors.add(matchingAuthor.id);
                        }
                    }
                });
                
                processedAuthors.add(primaryAuthor.id);
            }
        });
        // set author initials
        Object.values(authors).forEach((author) => { author.initials = author.name.split(" ").map((word) => word[0]).join("") });
        // sort by score
        return Object.values(authors).sort(
            (a, b) => b.score + b.firstAuthorCount / 100 + b.count / 1000 - (a.score + a.firstAuthorCount / 100 + a.count / 1000)
        );
    }
}