import { SCORING } from '@/constants/config.js'

const SCORE_COLOR_THRESHOLDS = {
  VERY_HIGH: 32,
  HIGH: 16,
  MEDIUM_HIGH: 8,
  MEDIUM: 4,
  LOW: 2
}

const SCORE_LIGHTNESS = {
  VERY_HIGH: 60,
  HIGH: 72,
  MEDIUM_HIGH: 80,
  MEDIUM: 90,
  LOW: 95,
  DEFAULT: 100
}

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
    // eslint-disable-next-line sonarjs/slow-regex -- Safe whitespace pattern
    .replace(/\s*,\s*/g, ', ') // treat spaces before/after commas
    // eslint-disable-next-line sonarjs/slow-regex -- Safe whitespace pattern
    .replace(/\s*\|\s*/g, '|') // remove spaces before/after vertical line
    .toUpperCase() // upper case
}

/**
 * Parses boost keyword string into unique keywords array
 * @param {string} boostKeywordString - Comma-separated keyword string
 * @returns {string[]} Array of unique keywords
 */
export function parseUniqueBoostKeywords(boostKeywordString) {
  return [
    ...new Set(
      boostKeywordString
        .toUpperCase()
        .split(/,\s*/)
        .map((keyword) => keyword.trim())
    )
  ]
}

/**
 * Finds all keyword matches in a title string with word boundary matching for short keywords
 * Each keyword (including alternatives) is matched only once - the first occurrence found
 * @param {string} title - The title text to search in
 * @param {string[]} boostKeywords - Keywords to search for
 * @returns {Array} Array of match objects with keyword, position, and length
 */
/**
 * Check if a new match would overlap with existing matches and add it if no overlap
 */
function tryAddMatch(matches, boostKeyword, alternativeKeyword, position) {
  if (position < 0) return false
  
  // Check for overlaps with existing matches
  const overlaps = matches.some(match => 
    position < match.position + match.length &&
    position + alternativeKeyword.length > match.position
  )
  
  if (!overlaps) {
    matches.push({
      keyword: boostKeyword,
      position,
      length: alternativeKeyword.length,
      text: alternativeKeyword
    })
    return true
  }
  
  return false
}

export function findKeywordMatches(title, boostKeywords) {
  const matches = []
  const upperTitle = title.toUpperCase()

  boostKeywords.forEach((boostKeyword) => {
    if (!boostKeyword) return

    // Filter out empty alternatives when splitting by "|"
    const alternatives = boostKeyword.split('|').filter((alt) => alt.trim())
    if (alternatives.length === 0) return

    // Find first matching alternative for this keyword group
    for (const alternativeKeyword of alternatives) {
      let position = -1
      
      // Use word boundary matching for short keywords (3 chars or less)
      if (alternativeKeyword.length <= 3) {
        const wordBoundaryRegex = new RegExp(`\\b${escapeRegExp(alternativeKeyword)}`, 'gi')
        const regexMatch = wordBoundaryRegex.exec(title)
        position = regexMatch?.index ?? -1
      } else {
        // Use substring matching for longer keywords
        const upperAlternativeKeyword = alternativeKeyword.toUpperCase()
        position = upperTitle.indexOf(upperAlternativeKeyword)
      }
      
      // Try to add match and break if successful (only match first alternative per keyword group)
      if (tryAddMatch(matches, boostKeyword, alternativeKeyword, position)) {
        break
      }
    }
  })

  return matches.sort((a, b) => a.position - b.position)
}

/**
 * Escapes special regex characters in a string
 * @param {string} string - String to escape
 * @returns {string} Escaped string safe for use in regex
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Generates highlighted title with matched keywords underlined
 * @param {string} title - The original title text
 * @param {Array} matches - Array of match objects with position and length
 * @returns {string} HTML string with highlighted keywords
 */
export function highlightTitle(title, matches) {
  if (matches.length === 0) return title

  let result = ''
  let lastPosition = 0

  matches.forEach((match) => {
    // Add text before match
    result += title.substring(lastPosition, match.position)
    // Add highlighted match
    result += `<u style='text-decoration-color: hsl(48, 100%, 67%); text-decoration-thickness: 0.25rem;'>${title.substring(match.position, match.position + match.length)}</u>`
    lastPosition = match.position + match.length
  })

  // Add remaining text
  result += title.substring(lastPosition)
  return result
}

/**
 * Calculates boost factor based on keyword matches
 * @param {number} matchCount - Number of keyword matches found
 * @param {boolean} isBoost - Whether boost is enabled
 * @returns {number} Boost factor to multiply score by
 */
export function calculateBoostFactor(matchCount, isBoost) {
  if (!isBoost || matchCount === 0) {
    return SCORING.DEFAULT_BOOST_FACTOR
  }
  return SCORING.DEFAULT_BOOST_FACTOR * SCORING.BOOST_MULTIPLIER**matchCount
}


/**
 * Gets color based on publication score
 * @param {number} score - Publication score
 * @returns {string} HSL color string
 */
export function getScoreColor(score) {
  let lightness
  if (score >= SCORE_COLOR_THRESHOLDS.VERY_HIGH) {
    lightness = SCORE_LIGHTNESS.VERY_HIGH
  } else if (score >= SCORE_COLOR_THRESHOLDS.HIGH) {
    lightness = SCORE_LIGHTNESS.HIGH
  } else if (score >= SCORE_COLOR_THRESHOLDS.MEDIUM_HIGH) {
    lightness = SCORE_LIGHTNESS.MEDIUM_HIGH
  } else if (score >= SCORE_COLOR_THRESHOLDS.MEDIUM) {
    lightness = SCORE_LIGHTNESS.MEDIUM
  } else if (score >= SCORE_COLOR_THRESHOLDS.LOW) {
    lightness = SCORE_LIGHTNESS.LOW
  } else {
    lightness = SCORE_LIGHTNESS.DEFAULT
  }
  return `hsl(0, 0%, ${lightness}%)`
}

/**
 * Updates publication scores for a list of publications
 * @param {Array} publications - Array of publication objects
 * @param {string[]} uniqueBoostKeywords - Array of boost keywords
 * @param {boolean} isBoost - Whether boost is enabled
 */
export function updatePublicationScores(publications, uniqueBoostKeywords, isBoost) {
  publications.forEach((publication) => {
    const matches = findKeywordMatches(publication.title, uniqueBoostKeywords)

    // Update boost metrics
    publication.boostMatches = matches.length
    publication.boostKeywords = matches.map((match) => match.keyword)
    publication.boostFactor = calculateBoostFactor(matches.length, isBoost)

    // Generate highlighted title
    publication.titleHighlighted = highlightTitle(publication.title, matches)

    // Calculate score: (citations + references + selected bonus) * boost factor
    publication.score = (publication.citationCount + publication.referenceCount + (publication.isSelected ? 1 : 0)) * publication.boostFactor

    // Set score color
    publication.scoreColor = getScoreColor(publication.score)
  })
}
