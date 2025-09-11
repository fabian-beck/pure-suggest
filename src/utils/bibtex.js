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
 * Generates a BibTeX-compatible citation key in the format [FirstAuthorLastName][Year][FirstWordOfTitle].
 * @param {Publication} publication - The publication object.
 * @returns {string} A sanitized BibTeX citation key.
 */
function generateBibtexKey(publication) {
    let key = "";
    
    // Extract first author's last name
    if (publication.author) {
        const firstAuthor = publication.author.split(';')[0].trim();
        // Split by space and take the last part as last name
        const nameParts = firstAuthor.split(/\s+/);
        const lastName = nameParts[nameParts.length - 1];
        // Remove non-alphanumeric characters and keep only letters/numbers
        key += lastName.replace(/[^a-zA-Z0-9]/g, '');
    }
    
    // Add year
    if (publication.year) {
        key += publication.year;
    }
    
    // Add first word of title
    if (publication.title) {
        // Remove special characters, split by spaces, and take first meaningful word
        const titleWords = publication.title
            .replace(/[^\w\s]/g, ' ')  // Replace non-word characters with spaces
            .split(/\s+/)             // Split by whitespace
            .filter(word => word.length > 0); // Remove empty strings
        
        if (titleWords.length > 0) {
            const firstWord = titleWords[0];
            // Remove non-alphanumeric characters and capitalize first letter
            const cleanFirstWord = firstWord.replace(/[^a-zA-Z0-9]/g, '');
            if (cleanFirstWord.length > 0) {
                key += cleanFirstWord.charAt(0).toUpperCase() + cleanFirstWord.slice(1).toLowerCase();
            }
        }
    }
    
    // Fallback to DOI if key is still empty
    if (!key) {
        key = publication.doi.replaceAll(/[^a-zA-Z0-9]/g, '');
    }
    
    return key;
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
    author = {${translateSpecialCharacters(publication.author).replaceAll(/;\s*/g, " and ")}},`;
    }
    if (publication.year) {
        bibString += `
    year = {${publication.year}},`;
    }
    if (publication.volume) {
        type = "article"
        bibString += `
    journal = {${translateSpecialCharacters(publication.container || "")}},
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
    return `@${type}{${generateBibtexKey(publication)},${bibString}
    doi = {${publication.doi}}
}`;
}