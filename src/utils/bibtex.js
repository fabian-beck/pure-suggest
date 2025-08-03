/**
 * Protects acronyms in BibTeX by wrapping them in braces.
 * @param {string} s - Input string.
 * @returns {string} String with acronyms protected.
 */
function protectAcronyms(s) {
    let s2 = s;
    let detectedAcronyms = [];
    s.split(/\W/).forEach(word => {
        if (word.slice(1) != word.slice(1).toLowerCase() && !detectedAcronyms.includes(word)) {
            s2 = s2.replaceAll(word, `{${word}}`)
            detectedAcronyms.push(word);
        }
    });
    return s2;
}

/**
 * Translates special characters for BibTeX format.
 * @param {string} s - Input string.
 * @returns {string} String with special characters translated.
 */
function translateSpecialCharacters(s) {
    // &...; encoded characters
    s = s.replaceAll("&amp;", "\\&")
    s = s.replaceAll("&lt;", "<")
    s = s.replaceAll("&gt;", ">")
    s = s.replaceAll("&quot;", "\\\"")
    s = s.replaceAll("&apos;", "'");
    s = s.replaceAll("&nbsp;", " ");
    // less and greater than
    s = s.replaceAll("<", "{\\textless}")
    s = s.replaceAll(">", "{\\textgreater}")
    return s;
}

/**
 * Generates BibTeX citation format for a publication.
 * @param {Publication} publication - The publication object.
 * @returns {string} BibTeX formatted citation.
 */
export function generateBibtex(publication) {
    let type = "misc";
    let bibString = "";
    
    if (publication.title) {
        bibString += `
    title = {${translateSpecialCharacters(protectAcronyms(publication.title))}},`;
    }
    if (publication.author) {
        bibString += `
    author = {${publication.author.replaceAll(/;\s*/g, " and ")}},`;
    }
    if (publication.year) {
        bibString += `
    year = {${publication.year}},`;
    }
    if (publication.volume) {
        type = "article"
        bibString += `
    journal = {${translateSpecialCharacters(publication.container)}},
    volume = {${publication.volume}},`;
        if (publication.issue) {
            bibString += `
    number = {${publication.issue}},`;
        }
    } else if (publication.container) {
        const container = publication.container.toLowerCase();
        type = (container.indexOf("proceedings") >= 0 || container.indexOf("conference") >= 0 || container.indexOf("symposium") >= 0 || container.indexOf("workshop") >= 0) ? "inproceedings" : "incollection";
        bibString += `
    booktitle = {${translateSpecialCharacters(publication.container)}},`;
    }
    if (publication.page) {
        bibString += `
    pages = {${publication.page}},`;
    }
    return `@${type}{${publication.doi.replaceAll(/_/g, "")},${bibString}
    doi = {${publication.doi}}
}`;
}