import { SCORING, CURRENT_YEAR, API_ENDPOINTS, API_PARAMS } from '../constants/config.js'
import { cachedFetch } from '../lib/Cache.js'


const SURVEY_THRESHOLDS = {
  REFERENCE_COUNT_HIGH: 100,
  REFERENCE_COUNT_MIN: 50
}

const CITATION_THRESHOLDS = {
  HIGHLY_CITED_PER_YEAR: 10,
  UNNOTED_PER_YEAR: 1
}

const PUBLICATION_AGE = {
  NEW_YEARS: 2
}

const TEXT_PROCESSING = {
  MAX_TITLE_LENGTH: 300,
  TITLE_TRUNCATION_POINT: 295,
  TITLE_TRUNCATION_SUFFIX: '[...]'
}

const SURVEY_KEYWORDS = /(survey|state|review|advances|future)/i

// Optimized with non-capturing group to prevent backtracking
// eslint-disable-next-line sonarjs/slow-regex
const ORDINAL_REGEX = /\d+(?:st|nd|rd|th)/i

const ROMAN_NUMERAL_REGEX = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})(\?.?)$/i

const ORCID_REGEX = /(,\s+)(\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx])/g

const TITLE_WORD_MAP = {
  a: 'a',
  an: 'an',
  acm: 'ACM',
  and: 'and',
  by: 'by',
  chi: 'CHI',
  during: 'during',
  for: 'for',
  from: 'from',
  ieee: 'IEEE',
  ii: 'II',
  iii: 'III',
  in: 'in',
  not: 'not',
  of: 'of',
  or: 'or',
  on: 'on',
  the: 'the',
  their: 'their',
  through: 'through',
  to: 'to',
  via: 'via',
  with: 'with',
  within: 'within'
}

const PUBLICATION_TAGS = [
  {
    value: 'isHighlyCited',
    name: 'Highly cited'
  },
  {
    value: 'isSurvey',
    name: 'Literature survey'
  },
  {
    value: 'isNew',
    name: 'New'
  },
  {
    value: 'isUnnoted',
    name: 'Unnoted'
  }
]

/**
 * Represents an academic publication with metadata, citations, and scoring capabilities.
 */
export default class Publication {
  /**
   * Creates a new Publication instance.
   * @param {string} doi - The DOI identifier for the publication.
   */
  constructor(doi) {
    this.doi = doi.toLowerCase()
    this.resetToDefaults()
  }

  /**
   * Gets the full DOI URL for this publication.
   * @returns {string} The complete DOI URL.
   */
  get doiUrl() {
    return `https://doi.org/${this.doi}`
  }

  /**
   * Calculates citations per year since publication.
   * @returns {number} Average citations per year.
   */
  get citationsPerYear() {
    const yearDiff = this.year ? CURRENT_YEAR - this.year : 1
    return this.citationDois.length / Math.max(1, yearDiff)
  }

  /**
   * Generates Google Scholar search URL for this publication.
   * @returns {string} Google Scholar search URL.
   */
  get gsUrl() {
    const searchString = `${this.title} ${this.author?.split(',')[0]} ${this.container ?? ''}`
    return `${API_ENDPOINTS.GOOGLE_SCHOLAR}?hl=en&q=${encodeURIComponent(searchString)}`
  }

  get authorShort() {
    if (!this.author) return undefined

    const authorArray = this.author.split('; ')
    const firstAuthor = authorArray[0].split(', ')[0]
    
    if (authorArray.length === 1) {
      return firstAuthor
    } else if (authorArray.length === 2) {
      return `${firstAuthor} and ${authorArray[1].split(', ')[0]}`
    } else {
      return `${firstAuthor} et al.`
    }
  }

  /**
   * Resets all publication properties to default values.
   */
  resetToDefaults() {
    // Meta-data
    this.title = this.titleHighlighted = ''
    this.year = this.author = this.authorOrcidData = undefined
    this.container = this.volume = this.issue = this.page = this.abstract = undefined

    // Citation arrays and counts
    this.citationDois = []
    this.referenceDois = []
    this.citationCount = this.referenceCount = this.boostMatches = this.score = 0
    this.boostKeywords = []
    this.boostFactor = SCORING.DEFAULT_BOOST_FACTOR
    this.scoreColor = '#FFF'
    this.tooManyCitations = false

    // Boolean flags (tags and interface state)
    this.isSurvey = this.isHighlyCited = this.isNew = this.isUnnoted = false
    this.isActive = this.isLinkedToActive = this.isSelected = this.isRead = false
    this.isHovered = this.isKeywordHovered = this.isAuthorHovered = this.wasFetched = false
    this.isNewlyAdded = false
  }

  /**
   * Fetches publication data from the API.
   * @param {boolean} noCache - Whether to bypass cache.
   */
  async fetchData(noCache = false) {
    if (this.wasFetched && !noCache) return
    try {
      // load data from data service
      await cachedFetch(
        `${API_ENDPOINTS.PUBLICATIONS}?doi=${this.doi}${noCache ? API_PARAMS.NO_CACHE_PARAM : ''}`,
        this.processData.bind(this),
        undefined,
        noCache
      )
    } catch (error) {
      console.log(error)
    }
    this.wasFetched = true
  }

  /**
   * Processes and cleans the publication title from API data.
   * @param {Object} data - Raw publication data from API.
   */
  processTitle(data) {
    // Set basic title first
    this.title = data.title || ''
    this.abstract = data.abstract
    this.year = data.year

    const subtitle = data.subtitle
    if (subtitle?.length && this.title.toLowerCase().indexOf(subtitle.toLowerCase())) {
      const cleanedTitle = removeHtmlTags(this.title)
      this.title += `${cleanedTitle.match(/^.*\W$/) ? '' : ':'}  ${subtitle}`
    }
    this.title = cleanTitle(this.title)
  }

  /**
   * Processes author information and creates display formats.
   * @param {Object} data - Raw publication data from API.
   */
  processAuthor(data) {
    if (!data.author) return

    this.author = data.author.replace(ORCID_REGEX, '')
    this.authorOrcid = data.author

    // Extract ORCID IDs and their positions for cleaner template handling
    this.authorOrcidData = []
    const authorParts = data.author.split('; ')

    authorParts.forEach((authorPart, index) => {
      const match = ORCID_REGEX.exec(authorPart)
      if (match) {
        this.authorOrcidData.push({
          index,
          orcidId: match[2],
          authorName: authorPart.replace(ORCID_REGEX, '').trim()
        })
      }
      // Reset regex for next iteration
      ORCID_REGEX.lastIndex = 0
    })

  }

  /**
   * Processes publication container (journal/conference) name.
   * @param {Object} data - Raw publication data from API.
   */
  processContainer(data) {
    // Set basic metadata
    this.volume = data.volume
    this.issue = data.issue
    this.page = data.page

    this.container = ''
    data.container?.split(' ').forEach((word) => {
      let mappedWord = ''
      // Optimized with negated character class to prevent backtracking
      // eslint-disable-next-line sonarjs/slow-regex
      if (/\([^)]+\)/.test(word)) {
        mappedWord = word.toUpperCase()
      } else if (ORDINAL_REGEX.test(word)) {
        mappedWord = word.toLowerCase()
      } else if (ROMAN_NUMERAL_REGEX.test(word)) {
        mappedWord = word.toUpperCase()
      } else {
        mappedWord = TITLE_WORD_MAP[word.toLowerCase()]
      }
      this.container += `${mappedWord ? mappedWord : word  } `
    })
    // Optimized with separate replace calls to avoid alternation backtracking
    // eslint-disable-next-line sonarjs/slow-regex
    this.container = this.container.trim().replace(/^[. ]+/, '').replace(/[. ]+$/, '')
    this.container = cleanTitle(this.container)
  }

  /**
   * Processes citation and reference DOI lists.
   * @param {Object} data - Raw publication data from API.
   */
  processCitations(data) {
    const addUniqueDoi = (list, doi) =>
      doi && !list.includes(doi.toLowerCase()) && list.push(doi.toLowerCase())
    data.reference?.split('; ').forEach((doi) => addUniqueDoi(this.referenceDois, doi))
    data.citation?.split('; ').forEach((doi) => addUniqueDoi(this.citationDois, doi))
    this.tooManyCitations = data.tooManyCitations
  }

  /**
   * Analyzes publication data to assign classification tags.
   */
  processTags() {
    if (this.referenceDois.length > SURVEY_THRESHOLDS.REFERENCE_COUNT_HIGH) {
      this.isSurvey = `more than ${SURVEY_THRESHOLDS.REFERENCE_COUNT_HIGH} references (${this.referenceDois.length})`
    } else if (
      this.referenceDois.length >= SURVEY_THRESHOLDS.REFERENCE_COUNT_MIN &&
      SURVEY_KEYWORDS.test(this.title)
    ) {
      this.isSurvey = `more than ${SURVEY_THRESHOLDS.REFERENCE_COUNT_MIN} references (${this.referenceDois.length}) and "${SURVEY_KEYWORDS.exec(this.title)[0]}" in the title`
    }
    this.isHighlyCited =
      this.citationsPerYear > CITATION_THRESHOLDS.HIGHLY_CITED_PER_YEAR || this.tooManyCitations
        ? `more than ${CITATION_THRESHOLDS.HIGHLY_CITED_PER_YEAR} citations per year`
        : false
    this.isNew =
      CURRENT_YEAR - this.year <= PUBLICATION_AGE.NEW_YEARS
        ? 'published within this or the previous two calendar years'
        : false
    this.isUnnoted =
      this.citationsPerYear < CITATION_THRESHOLDS.UNNOTED_PER_YEAR && !this.tooManyCitations
        ? `less than ${CITATION_THRESHOLDS.UNNOTED_PER_YEAR} citation per year`
        : false
  }

  /**
   * Main data processing method that coordinates all data processing steps.
   * @param {Object} data - Raw publication data from API.
   */
  processData(data) {
    // Process specific aspects of the publication data
    this.processTitle(data)
    this.processAuthor(data)
    this.processContainer(data)
    this.processCitations(data)
    this.processTags()
  }



  /**
   * Returns concatenated metadata for search purposes.
   * @returns {string} Combined title, author, and container string.
   */
  getMetaString() {
    return `${[this.title, this.author, this.container].filter(Boolean).join(' ')  } `
  }


  /**
   * Gets the available publication tag definitions.
   * @returns {Array} Array of tag configuration objects.
   */
  static get TAGS() {
    return PUBLICATION_TAGS
  }

  /**
   * Sorts publications by score and year (in-place).
   * @param {Publication[]} publicationList - Array of publications to sort.
   */
  static sortPublications(publicationList) {
    publicationList.sort((a, b) => {
      return b.score - 1 / ((b.year ? b.year : 0) + 2) - (a.score - 1 / ((a.year ? a.year : 0) + 2))
    })
  }
}

/**
 * Cleans and formats publication titles with proper capitalization and punctuation.
 * @param {string} title - Raw title string.
 * @returns {string} Cleaned and formatted title.
 */
/**
 * Removes HTML tags from a string.
 * @param {string} string - Input string with HTML tags.
 * @returns {string} String with HTML tags removed.
 */
function removeHtmlTags(string) {
  if (!string || typeof string !== 'string') {
    return string || ''
  }
  
  // First decode HTML entities to actual HTML characters
  const decodedString = string
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
  
  // Then remove HTML tags
  // Use replaceAll if available (modern browsers), otherwise fallback to replace with global flag
  // This handles the case where replaceAll might not be supported in older environments
  if (typeof decodedString.replaceAll === 'function') {
    return decodedString.replaceAll(/<[^<>]*>/g, '')
  } else {
    // Fallback for older browsers - use replace with global flag
    return decodedString.replace(/<[^<>]*>/g, '')
  }
}

/**
 * Clean and standardize publication title
 * @param {string} title - Raw title string
 * @returns {string} Cleaned title
 */
function cleanTitle(title) {
  let cleanedTitle = removeHtmlTags(title)
    .split(' ')
    .map((word) => TITLE_WORD_MAP[word.toLowerCase()] || word)
    .join(' ')
    .trim()
    .replace(/--/g, '–')
    .replace(/ - /g, ' – ')
    .replace(/---/g, '—')
    .replace(/ ?— ?/g, '—')
    .replace(/&[A-Z]/g, (match) => match.toLowerCase())

  cleanedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1)
  return cleanedTitle.length > TEXT_PROCESSING.MAX_TITLE_LENGTH
    ? cleanedTitle.substring(0, TEXT_PROCESSING.TITLE_TRUNCATION_POINT) +
        TEXT_PROCESSING.TITLE_TRUNCATION_SUFFIX
    : cleanedTitle
}
