import Author from './Author.js'

const VALIDATION = {
  MIN_YEAR: 1000,
  MAX_YEAR: 10000
}

export default class Filter {
  constructor() {
    this.string = ''
    this.yearStart = undefined
    this.yearEnd = undefined
    this.tags = []
    this.doi = ''
    this.dois = []
    this.authors = []
    this.isActive = true
    this.applyToSelected = true
    this.applyToSuggested = true
  }

  matchesString(publication) {
    if (!this.string) return true
    return publication.getMetaString().toLowerCase().indexOf(this.string.toLowerCase()) >= 0
  }

  isSpecificYearActive(yearNumeric) {
    return (
      yearNumeric != null &&
      !isNaN(yearNumeric) &&
      yearNumeric >= VALIDATION.MIN_YEAR &&
      yearNumeric < VALIDATION.MAX_YEAR
    )
  }

  isYearActive() {
    return (
      this.isSpecificYearActive(Number(this.yearStart)) ||
      this.isSpecificYearActive(Number(this.yearEnd))
    )
  }

  matchesYearStart(publication) {
    const yearStartNumeric = Number(this.yearStart)
    if (!this.isSpecificYearActive(yearStartNumeric)) return true
    return yearStartNumeric <= Number(publication.year)
  }

  matchesYearEnd(publication) {
    const yearEndNumeric = Number(this.yearEnd)
    if (!this.isSpecificYearActive(yearEndNumeric)) return true
    return yearEndNumeric >= Number(publication.year)
  }

  matchesYear(publication) {
    if (!publication.year) return false
    return this.matchesYearStart(publication) && this.matchesYearEnd(publication)
  }

  matchesTag(publication) {
    if (!this.tags || this.tags.length === 0) return true
    return this.tags.some((tag) => Boolean(publication[tag]))
  }

  toggleFilterValue(filterKey, value) {
    if (this[filterKey].includes(value)) {
      this.removeFilterValue(filterKey, value)
    } else {
      this.addFilterValue(filterKey, value)
    }
  }

  addFilterValue(filterKey, value) {
    if (!this[filterKey].includes(value)) {
      this[filterKey].push(value)
    }
  }

  removeFilterValue(filterKey, value) {
    this[filterKey] = this[filterKey].filter((item) => item !== value)
  }

  toggleTag(tagValue) {
    this.toggleFilterValue('tags', tagValue)
  }

  addTag(tagValue) {
    this.addFilterValue('tags', tagValue)
  }

  removeTag(tagValue) {
    this.removeFilterValue('tags', tagValue)
  }

  toggleDoi(doi) {
    this.toggleFilterValue('dois', doi)
  }

  addDoi(doi) {
    this.addFilterValue('dois', doi)
  }

  removeDoi(doi) {
    this.removeFilterValue('dois', doi)
  }

  toggleAuthor(authorId) {
    this.toggleFilterValue('authors', authorId)
  }

  addAuthor(authorId) {
    this.addFilterValue('authors', authorId)
  }

  removeAuthor(authorId) {
    this.removeFilterValue('authors', authorId)
  }

  matchesDois(publication) {
    if (!this.dois.length) return true
    return this.dois.some(
      (doi) =>
        publication.doi === doi ||
        publication.citationDois.has(doi) ||
        publication.referenceDois.has(doi)
    )
  }

  matchesAuthors(publication) {
    if (!this.authors.length) return true
    if (!publication.author) return false

    const authorNames = publication.author.split(';').map((name) => name.trim())

    return this.authors.some((authorId) =>
      authorNames.some((authorName) => Author.nameToId(authorName) === authorId)
    )
  }

  matches(publication) {
    if (!this.isActive) return true
    return (
      this.matchesString(publication) &&
      this.matchesTag(publication) &&
      this.matchesYear(publication) &&
      this.matchesDois(publication) &&
      this.matchesAuthors(publication)
    )
  }

  hasActiveFilters() {
    return (
      this.isActive &&
      Boolean(
        this.string ||
          this.tags.length > 0 ||
          this.isYearActive() ||
          this.dois.length > 0 ||
          this.authors.length > 0
      ) &&
      (this.applyToSelected || this.applyToSuggested)
    )
  }
}
