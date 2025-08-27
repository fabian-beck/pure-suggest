import { SCORING } from "@/constants/publication.js";
import { SCORE_COLOR_THRESHOLDS, SCORE_LIGHTNESS } from "@/constants/ui.js";

/**
 * Utility functions for publication scoring and keyword matching
 */

/**
 * Normalizes boost keyword string by cleaning up spacing and casing
 * @param {string} boostKeywordString - Raw boost keyword string
 * @returns {string} Normalized boost keyword string
 */
export function normalizeBoostKeywordString(boostKeywordString) {
  return boostKeywordString
    .replace(/\s*,\s*/g, ", ") // treat spaces before/after commas
    .replace(/\s*\|\s*/g, "|") // remove spaces before/after vertical line
    .toUpperCase(); // upper case
}

/**
 * Parses boost keyword string into unique keywords array
 * @param {string} boostKeywordString - Comma-separated keyword string
 * @returns {string[]} Array of unique keywords
 */
export function parseUniqueBoostKeywords(boostKeywordString) {
  return [...new Set(boostKeywordString.toUpperCase().split(/,\s*/).map(keyword => keyword.trim()))];
}

/**
 * Finds all keyword matches in a title string
 * @param {string} title - The title text to search in
 * @param {string[]} boostKeywords - Keywords to search for
 * @returns {Array} Array of match objects with keyword, position, and length
 */
export function findKeywordMatches(title, boostKeywords) {
  const matches = [];
  const upperTitle = title.toUpperCase();
  
  boostKeywords.forEach(boostKeyword => {
    if (!boostKeyword) return;
    
    let keywordMatched = false;
    boostKeyword.split("|").forEach(alternativeKeyword => {
      if (keywordMatched) return; // Skip if this keyword group already has a match
      
      const index = upperTitle.indexOf(alternativeKeyword);
      if (index >= 0) {
        // Check if this position is already matched
        const overlaps = matches.some(match => 
          index < match.position + match.length && index + alternativeKeyword.length > match.position
        );
        if (!overlaps) {
          matches.push({
            keyword: boostKeyword,
            position: index,
            length: alternativeKeyword.length,
            text: alternativeKeyword
          });
          keywordMatched = true; // Mark this keyword group as matched
        }
      }
    });
  });
  
  return matches.sort((a, b) => a.position - b.position);
}

/**
 * Generates highlighted title with matched keywords underlined
 * @param {string} title - The original title text
 * @param {Array} matches - Array of match objects with position and length
 * @returns {string} HTML string with highlighted keywords
 */
export function highlightTitle(title, matches) {
  if (matches.length === 0) return title;
  
  let result = "";
  let lastPosition = 0;
  
  matches.forEach(match => {
    // Add text before match
    result += title.substring(lastPosition, match.position);
    // Add highlighted match
    result += `<u style='text-decoration-color: hsl(48, 100%, 67%); text-decoration-thickness: 0.25rem;'>${title.substring(match.position, match.position + match.length)}</u>`;
    lastPosition = match.position + match.length;
  });
  
  // Add remaining text
  result += title.substring(lastPosition);
  return result;
}

/**
 * Calculates boost factor based on keyword matches
 * @param {number} matchCount - Number of keyword matches found
 * @param {boolean} isBoost - Whether boost is enabled
 * @returns {number} Boost factor to multiply score by
 */
export function calculateBoostFactor(matchCount, isBoost) {
  if (!isBoost || matchCount === 0) {
    return SCORING.DEFAULT_BOOST_FACTOR;
  }
  return SCORING.DEFAULT_BOOST_FACTOR * Math.pow(SCORING.BOOST_MULTIPLIER, matchCount);
}

/**
 * Calculates publication score based on citations, references, and boost
 * @param {number} citationCount - Number of citations
 * @param {number} referenceCount - Number of references  
 * @param {boolean} isSelected - Whether publication is selected
 * @param {number} boostFactor - Boost multiplier factor
 * @returns {number} Calculated score
 */
export function calculatePublicationScore(citationCount, referenceCount, isSelected, boostFactor) {
  return (citationCount + referenceCount + (isSelected ? 1 : 0)) * boostFactor;
}

/**
 * Gets color based on publication score
 * @param {number} score - Publication score
 * @returns {string} HSL color string
 */
export function getScoreColor(score) {
  const lightness = score >= SCORE_COLOR_THRESHOLDS.VERY_HIGH ? SCORE_LIGHTNESS.VERY_HIGH
    : score >= SCORE_COLOR_THRESHOLDS.HIGH ? SCORE_LIGHTNESS.HIGH
    : score >= SCORE_COLOR_THRESHOLDS.MEDIUM_HIGH ? SCORE_LIGHTNESS.MEDIUM_HIGH
    : score >= SCORE_COLOR_THRESHOLDS.MEDIUM ? SCORE_LIGHTNESS.MEDIUM
    : score >= SCORE_COLOR_THRESHOLDS.LOW ? SCORE_LIGHTNESS.LOW
    : SCORE_LIGHTNESS.DEFAULT;
  return `hsl(0, 0%, ${lightness}%)`;
}

/**
 * Updates publication scores for a list of publications
 * @param {Array} publications - Array of publication objects
 * @param {string[]} uniqueBoostKeywords - Array of boost keywords
 * @param {boolean} isBoost - Whether boost is enabled
 */
export function updatePublicationScores(publications, uniqueBoostKeywords, isBoost) {
  publications.forEach(publication => {
    const matches = findKeywordMatches(publication.title, uniqueBoostKeywords);
    
    // Update boost metrics
    publication.boostMatches = matches.length;
    publication.boostKeywords = matches.map(match => match.keyword);
    publication.boostFactor = calculateBoostFactor(matches.length, isBoost);
    
    // Generate highlighted title
    publication.titleHighlighted = highlightTitle(publication.title, matches);
    
    // Calculate score
    publication.score = calculatePublicationScore(
      publication.citationCount, 
      publication.referenceCount, 
      publication.isSelected,
      publication.boostFactor
    );
    
    // Set score color
    publication.scoreColor = getScoreColor(publication.score);
  });
}