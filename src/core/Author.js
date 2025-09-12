import { SCORING } from '../constants/config.js'

export default class Author {
  constructor(authorString, authorIndex, publication) {
    this.name = authorString.replace(/(,\s+)(\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]{1})/g, '')
    this.id = Author.nameToId(this.name)
    this.count = 1
    this.firstAuthorCount = authorIndex === 0 ? 1 : 0
    this.authorIndex = authorIndex
    this.publication = publication
    this.score = 1 // Default score, set via setScoring method

    this.keywords = publication.boostKeywords
      .map((keyword) => ({ [keyword]: 1 }))
      .reduce((a, b) => ({ ...a, ...b }), {})
    const orcid = authorString.match(/(\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx]{1})/g)
    this.orcid = orcid ? orcid[0] : undefined
    this.alternativeNames = [this.name]
    this.coauthors =
      publication.author
        ?.split('; ')
        ?.map((coauthor) => Author.nameToId(coauthor))
        .filter((coauthorId) => coauthorId !== this.id)
        .map((coauthorId) => ({ [coauthorId]: 1 }))
        .reduce((a, b) => ({ ...a, ...b }), {}) ?? {} // convert array to object;
    this.yearMin = publication.year
    this.yearMax = publication.year
    this.newPublication = publication.isNew
    this.publicationDois = [publication.doi]
  }

  setScoring(isAuthorScoreEnabled, isFirstAuthorBoostEnabled, isAuthorNewBoostEnabled) {
    this.score =
      (isAuthorScoreEnabled ? this.publication.score : 1) *
      (isFirstAuthorBoostEnabled ? (this.authorIndex > 0 ? 1 : SCORING.FIRST_AUTHOR_BOOST) : 1) *
      (isAuthorNewBoostEnabled ? (this.publication.isNew ? SCORING.NEW_PUBLICATION_BOOST : 1) : 1)
  }

  mergeWith(author) {
    function mergeCounts(counts1, counts2) {
      const counts = { ...counts1 }
      Object.entries(counts2).forEach(([key, value]) => {
        counts[key] = (counts[key] || 0) + value
      })
      return counts
    }

    this.count += author.count
    this.firstAuthorCount += author.firstAuthorCount
    this.score += author.score
    this.keywords = mergeCounts(this.keywords, author.keywords)
    this.orcid = this.orcid ? this.orcid : author.orcid
    this.alternativeNames = [...new Set(this.alternativeNames.concat(author.alternativeNames))]
    this.coauthors = mergeCounts(this.coauthors, author.coauthors)
    this.yearMin = Math.min(this.yearMin || Infinity, author.yearMin || Infinity) || undefined
    this.yearMax = Math.max(this.yearMax || -Infinity, author.yearMax || -Infinity) || undefined
    this.newPublication = this.newPublication || author.newPublication
    this.publicationDois = [...new Set(this.publicationDois.concat(author.publicationDois))]
  }

  static nameToId(str) {
    return (
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // Handle Nordic and other extended Latin characters not covered by NFD
        .replace(/[øØ]/g, 'o')
        .replace(/[åÅ]/g, 'a')
        .replace(/[æÆ]/g, 'ae')
        .replace(/[ðÐ]/g, 'd')
        .replace(/[þÞ]/g, 'th')
        .replace(/[ßẞ]/g, 'ss')
        .toLowerCase()
    )
  }

  static generateEszettVariants(nameId) {
    // Generate possible variants for Eszett transcriptions
    const variants = new Set([nameId])

    // Helper function to add variant if different from original
    const addVariant = (variant) => {
      if (variant !== nameId) variants.add(variant)
    }

    // Handle 'ss' transcriptions
    if (nameId.includes('ss')) {
      addVariant(nameId.replace(/ss/g, 's'))
      addVariant(nameId.replace(/ss/g, 'b'))
    }

    // Handle 'b' transcriptions
    if (nameId.includes('b')) {
      addVariant(nameId.replace(/b/g, 'ss'))
      addVariant(nameId.replace(/b/g, 's'))
    }

    // Handle single 's' in surname for names with 'ß' patterns
    const nameParts = nameId.split(',')
    if (nameParts.length >= 2) {
      const surname = nameParts[0].trim()
      const restOfName = nameId.substring(surname.length)

      const hasEszettPattern =
        surname.length > 3 &&
        surname.includes('s') &&
        !surname.includes('ss') &&
        !surname.includes('b')

      if (hasEszettPattern) {
        addVariant(surname.replace(/s/g, 'ss') + restOfName)
        addVariant(surname.replace(/s/g, 'b') + restOfName)
      }
    }

    return Array.from(variants)
  }

  static computePublicationsAuthors(
    publications,
    isAuthorScoreEnabled,
    isFirstAuthorBoostEnabled,
    isAuthorNewBoostEnabled
  ) {
    function deleteAuthor(authorId, newAuthorId) {
      delete authors[authorId]
      Object.values(authors).forEach((author) => {
        if (author.coauthors[authorId]) {
          author.coauthors[newAuthorId] = author.coauthors[newAuthorId]
            ? author.coauthors[newAuthorId] + author.coauthors[authorId]
            : author.coauthors[authorId]
          delete author.coauthors[authorId]
        }
      })
    }

    const authors = {}
    // assemble authors from selected publications
    publications.forEach((publication) => {
      publication.authorOrcid?.split('; ').forEach((authorString, i) => {
        const author = new Author(authorString, i, publication)
        author.setScoring(isAuthorScoreEnabled, isFirstAuthorBoostEnabled, isAuthorNewBoostEnabled)
        if (!authors[author.id]) {
          authors[author.id] = author
        } else {
          authors[author.id].mergeWith(author)
        }
      })
    })
    // merge author with same ORCID
    // Sort authors to ensure deterministic processing order
    const orcidAuthors = Object.values(authors)
      .filter((author) => author.orcid)
      .sort((a, b) => a.id.localeCompare(b.id))
    orcidAuthors.forEach((author) => {
      const authorMatches = orcidAuthors.filter((author2) => author2.orcid === author.orcid)
      if (authorMatches.length > 1) {
        // Sort matches to ensure deterministic processing order
        authorMatches
          .sort((a, b) => a.id.localeCompare(b.id))
          .forEach((author2) => {
            if (author.id.length > author2.id.length) {
              author.mergeWith(author2)
              deleteAuthor(author2.id, author.id)
            }
          })
      }
    })
    // match authors with abbreviated names and merge them
    // Sort authors to ensure deterministic processing order
    const authorsWithAbbreviatedNames = Object.values(authors)
      .filter((author) => author.id.match(/^\w+,\s\w\.?(\s\w\.?)?$/))
      .sort((a, b) => a.id.localeCompare(b.id))
    Object.values(authors)
      .filter((author) => !authorsWithAbbreviatedNames.includes(author))
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((author) => {
        // check if author has version with additional first name
        if (
          Object.values(authors).filter((author2) => author2.id.startsWith(author.id)).length > 1
        ) {
          authorsWithAbbreviatedNames.push(author)
        }
      })
    const authorsWithoutAbbreviatedNames = Object.values(authors)
      .filter((author) => !authorsWithAbbreviatedNames.includes(author))
      .sort((a, b) => a.id.localeCompare(b.id))
    authorsWithAbbreviatedNames
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((author) => {
        const authorId = author.id.replace(/^(\w+,\s\w)\.?(\s\w\.?)?$/, '$1')
        const authorMatches = authorsWithoutAbbreviatedNames.filter((author2) =>
          author2.id.startsWith(authorId)
        )
        if (
          authorMatches.length === 1 &&
          (!author.orcid || !authorMatches[0].orcid || author.orcid === authorMatches[0].orcid)
        ) {
          authorMatches[0].mergeWith(author)
          deleteAuthor(author.id, authorMatches[0].id)
        }
      })

    // merge authors with Eszett transcription variants
    // Sort authors by ID to ensure deterministic processing order
    const remainingAuthors = Object.values(authors).sort((a, b) => a.id.localeCompare(b.id))
    const processedAuthors = new Set()

    remainingAuthors.forEach((author) => {
      if (processedAuthors.has(author.id)) return

      const authorVariants = Author.generateEszettVariants(author.id)
      const matchingAuthors = remainingAuthors.filter((otherAuthor) => {
        if (otherAuthor.id === author.id || processedAuthors.has(otherAuthor.id)) return false

        const otherVariants = Author.generateEszettVariants(otherAuthor.id)

        // Check if any variant of one author matches any variant of the other
        return (
          authorVariants.some((variant) => otherVariants.includes(variant)) ||
          otherVariants.some((variant) => authorVariants.includes(variant))
        )
      })

      if (matchingAuthors.length > 0) {
        // Merge all matching authors into the first one found
        // Prefer authors with longer names (more complete information)
        // Sort by name length first, then by ID for deterministic order
        const allMatches = [author, ...matchingAuthors].sort((a, b) => {
          const lengthDiff = b.id.length - a.id.length
          if (lengthDiff !== 0) return lengthDiff
          return a.id.localeCompare(b.id)
        })
        const primaryAuthor = allMatches[0] // First after sorting is the best

        allMatches.forEach((matchingAuthor) => {
          if (matchingAuthor.id !== primaryAuthor.id && !processedAuthors.has(matchingAuthor.id)) {
            // Only merge if they don't have conflicting ORCIDs
            if (
              !primaryAuthor.orcid ||
              !matchingAuthor.orcid ||
              primaryAuthor.orcid === matchingAuthor.orcid
            ) {
              primaryAuthor.mergeWith(matchingAuthor)
              deleteAuthor(matchingAuthor.id, primaryAuthor.id)
              processedAuthors.add(matchingAuthor.id)
            }
          }
        })

        processedAuthors.add(primaryAuthor.id)
      }
    })
    // set author initials
    Object.values(authors).forEach((author) => {
      author.initials = author.name
        .split(' ')
        .map((word) => word[0])
        .join('')
    })

    // Ensure deterministic processing order for author merging and result consistency
    // Convert to array and sort by ID to ensure consistent processing order
    const authorArray = Object.values(authors)

    // Sort by score with deterministic tiebreaker for identical scores
    return authorArray.sort((a, b) => {
      const scoreA = a.score + a.firstAuthorCount / 100 + a.count / 1000
      const scoreB = b.score + b.firstAuthorCount / 100 + b.count / 1000
      const scoreDiff = scoreB - scoreA

      // If scores are different, use score comparison
      if (scoreDiff !== 0) {
        return scoreDiff
      }

      // For identical scores, use lexicographic order of author ID as tiebreaker
      // This ensures deterministic sorting when composite scores are equal
      return a.id.localeCompare(b.id)
    })
  }
}
