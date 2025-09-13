/**
 * Protects acronyms in BibTeX by wrapping them in braces.
 * @param {string} s - Input string.
 * @returns {string} String with acronyms protected.
 */
function protectAcronyms(s) {
  let s2 = s
  const detectedAcronyms = []
  s.split(/\W/).forEach((word) => {
    if (word.slice(1) != word.slice(1).toLowerCase() && !detectedAcronyms.includes(word)) {
      s2 = s2.replaceAll(word, `{${word}}`)
      detectedAcronyms.push(word)
    }
  })
  return s2
}

/**
 * Translates special characters for BibTeX format.
 * @param {string} s - Input string.
 * @returns {string} String with special characters translated.
 */
function translateSpecialCharacters(s) {
  // &...; encoded characters
  s = s.replaceAll('&amp;', '\\&')
  s = s.replaceAll('&lt;', '<')
  s = s.replaceAll('&gt;', '>')
  s = s.replaceAll('&quot;', '\\"')
  s = s.replaceAll('&apos;', "'")
  s = s.replaceAll('&nbsp;', ' ')
  // less and greater than
  s = s.replaceAll('<', '{\\textless}')
  s = s.replaceAll('>', '{\\textgreater}')
  return s
}

/**
 * Extracts the last name from an author string.
 * @param {string} authorString - The author string (may contain multiple authors).
 * @returns {string} The sanitized last name of the first author.
 */
function extractAuthorLastName(authorString) {
    const firstAuthor = authorString.split(';')[0].trim();
    let lastName;

    // Check if name is in "lastname, firstname" format
    if (firstAuthor.includes(',')) {
        lastName = firstAuthor.split(',')[0].trim();
    } else {
        // Fall back to assuming "firstname lastname" format - take the last word
        const nameParts = firstAuthor.split(/\s+/);
        lastName = nameParts[nameParts.length - 1];
    }

    // Remove non-alphanumeric characters and keep only letters/numbers
    return lastName.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Processes a fallback word for title key generation.
 * @param {string} word - The word to process.
 * @returns {string} The processed word with appropriate capitalization.
 */
function processFallbackWord(word) {
    const fallbackWord = word.replace(/[^a-zA-Z0-9]/g, '');
    if (fallbackWord.length === 0) {
        return '';
    }

    // Check if word is all uppercase (like "AI") or has mixed case
    if (fallbackWord === fallbackWord.toUpperCase() || fallbackWord !== fallbackWord.toLowerCase()) {
        // Preserve case for acronyms and mixed-case words
        return fallbackWord;
    } else {
        // Capitalize first letter for all-lowercase words
        return fallbackWord.charAt(0).toUpperCase() + fallbackWord.slice(1);
    }
}

/**
 * Extracts a meaningful word from the publication title.
 * @param {string} title - The publication title.
 * @returns {string} A meaningful word from the title with case preserved.
 */
function extractTitleWord(title) {
    // Common short words to skip in academic citations
    const skipWords = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'how', 'can', 'you', 'use', 'new', 'way']);

    // Remove special characters, split by spaces, and find first meaningful word
    const titleWords = title
        .replace(/[^\w\s]/g, ' ')  // Replace non-word characters with spaces
        .split(/\s+/)             // Split by whitespace
        .filter(word => word.length > 0); // Remove empty strings

    // Find first word that's meaningful (not a common skip word and more than 2 characters)
    for (const word of titleWords) {
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
        const cleanWordLower = cleanWord.toLowerCase();
        if (cleanWordLower.length > 2 && !skipWords.has(cleanWordLower)) {
            return cleanWord; // Preserve original case
        }
    }

    // If no meaningful word found, fall back to first word
    if (titleWords.length > 0) {
        return processFallbackWord(titleWords[0]);
    }

    return '';
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
        key += extractAuthorLastName(publication.author);
    }

    // Add year
    if (publication.year) {
        key += publication.year;
    }

    // Add first meaningful word of title
    if (publication.title) {
        const titleWord = extractTitleWord(publication.title);
        if (titleWord) {
            key += titleWord;
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
  let type = 'misc'
  let bibString = ''

  if (publication.title) {
    bibString += `
    title = {${translateSpecialCharacters(protectAcronyms(publication.title))}},`
  }
  if (publication.author) {
    bibString += `
    author = {${translateSpecialCharacters(publication.author).replaceAll(/;\s*/g, ' and ')}},`
  }
  if (publication.year) {
    bibString += `
    year = {${publication.year}},`
  }
  if (publication.volume) {
    type = 'article'
    bibString += `
    journal = {${translateSpecialCharacters(publication.container || '')}},
    volume = {${publication.volume}},`
    if (publication.issue) {
      bibString += `
    number = {${publication.issue}},`
    }
  } else if (publication.container) {
    const container = publication.container.toLowerCase()
    type =
      container.indexOf('proceedings') >= 0 ||
      container.indexOf('conference') >= 0 ||
      container.indexOf('symposium') >= 0 ||
      container.indexOf('workshop') >= 0
        ? 'inproceedings'
        : 'incollection'
    bibString += `
    booktitle = {${translateSpecialCharacters(publication.container)}},`
  }
  if (publication.page) {
    bibString += `
    pages = {${publication.page}},`
  }
  return `@${type}{${generateBibtexKey(publication)},${bibString}
    doi = {${publication.doi}}
}`
}
