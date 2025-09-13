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
        let lastName;
        
        // Check if name is in "lastname, firstname" format
        if (firstAuthor.includes(',')) {
            // Extract part before the comma as last name
            lastName = firstAuthor.split(',')[0].trim();
        } else {
            // Fall back to assuming "firstname lastname" format - take the last word
            const nameParts = firstAuthor.split(/\s+/);
            lastName = nameParts[nameParts.length - 1];
        }
        
        // Remove non-alphanumeric characters and keep only letters/numbers
        key += lastName.replace(/[^a-zA-Z0-9]/g, '');
    }
    
    // Add year
    if (publication.year) {
        key += publication.year;
    }
    
    // Add first meaningful word of title
    if (publication.title) {
        // Common short words to skip in academic citations
        const skipWords = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'and', 'or', 'but', 'is', 'are', 'was', 'were']);
        
        // Remove special characters, split by spaces, and find first meaningful word
        const titleWords = publication.title
            .replace(/[^\w\s]/g, ' ')  // Replace non-word characters with spaces
            .split(/\s+/)             // Split by whitespace
            .filter(word => word.length > 0); // Remove empty strings
        
        // Find first word that's meaningful (not a common skip word and at least 2 characters)
        let meaningfulWord = null;
        for (const word of titleWords) {
            const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            if (cleanWord.length >= 2 && !skipWords.has(cleanWord)) {
                meaningfulWord = cleanWord;
                break;
            }
        }
        
        // If no meaningful word found, fall back to first word
        if (!meaningfulWord && titleWords.length > 0) {
            meaningfulWord = titleWords[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        }
        
        if (meaningfulWord && meaningfulWord.length > 0) {
            key += meaningfulWord.charAt(0).toUpperCase() + meaningfulWord.slice(1);
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