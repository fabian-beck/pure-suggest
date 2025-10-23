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

  toggleTag(tagValue) {
    if (this.tags.includes(tagValue)) {
      this.removeTag(tagValue)
    } else {
      this.addTag(tagValue)
    }
  }

  addTag(tagValue) {
    if (!this.tags.includes(tagValue)) {
      this.tags.push(tagValue)
    }
  }

  removeTag(tagValue) {
    this.tags = this.tags.filter((t) => t !== tagValue)
  }

  toggleDoi(doi) {
    if (this.dois.includes(doi)) {
      this.removeDoi(doi)
    } else {
      this.addDoi(doi)
    }
  }

  addDoi(doi) {
    if (!this.dois.includes(doi)) {
      this.dois.push(doi)
    }
  }

  removeDoi(doi) {
    console.log(`Removing DOI: ${doi}`)
    this.dois = this.dois.filter((d) => d !== doi)
    console.log(`Remaining DOIs: ${this.dois}`)
  }

  toggleAuthor(authorId) {
    if (this.authors.includes(authorId)) {
      this.removeAuthor(authorId)
    } else {
      this.addAuthor(authorId)
    }
  }

  addAuthor(authorId) {
    if (!this.authors.includes(authorId)) {
      this.authors.push(authorId)
    }
  }

  removeAuthor(authorId) {
    this.authors = this.authors.filter((a) => a !== authorId)
  }

  matchesDois(publication) {
    if (!this.dois.length) return true
    return this.dois.some(
      (doi) =>
        publication.doi === doi ||
        publication.citationDois.includes(doi) ||
        publication.referenceDois.includes(doi)
    )
  }

  matchesAuthors(publication) {
    if (!this.authors.length) return true
    if (!publication.author) return false
    
    // Split authors by semicolon to get individual author names
    const authorNames = publication.author.split(';').map((name) => name.trim())
    
    // Check if any of the publication's authors match any of the filtered author IDs
    return this.authors.some((authorId) => {
      return authorNames.some((authorName) => {
        // Normalize author name to ID format for comparison
        const normalizedName = authorName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[øØ]/g, 'o')
          .replace(/[åÅ]/g, 'a')
          .replace(/[æÆ]/g, 'ae')
          .replace(/[ðÐ]/g, 'd')
          .replace(/[þÞ]/g, 'th')
          .replace(/[ßẞ]/g, 'ss')
          .toLowerCase()
        return normalizedName === authorId
      })
    })
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
      Boolean(this.string || this.tags.length > 0 || this.isYearActive() || this.dois.length > 0 || this.authors.length > 0) &&
      (this.applyToSelected || this.applyToSuggested)
    )
  }
}
