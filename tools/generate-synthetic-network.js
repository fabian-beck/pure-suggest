#!/usr/bin/env node

// Generates a synthetic, reproducible citation network: metadata of all publications in the
// format of the publications data service, and a session selecting a large share of them.
// Used to try out the app (e.g., large networks) without access to the data service.
// With --subtopics, each topic splits into subtopics that mostly cite each other and have
// their own authors, as in real literature (used for benchmarking the network layout).
//
// Usage: node tools/generate-synthetic-network.js [--subtopics] [seed] [output directory]

const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const HAS_SUBTOPICS = args.includes('--subtopics')
const [SEED = '20261119', OUTPUT_DIR = path.join(__dirname, '..', 'test', 'synthetic-network')] =
  args.filter((arg) => arg !== '--subtopics')
const SUBTOPIC_COUNT = HAS_SUBTOPICS ? 3 : 1
const PUBLICATION_COUNT = 500
const SELECTED_COUNT = 120
const FIRST_YEAR = 1990
const LAST_YEAR = 2025

const TOPICS = [
  {
    key: 'graph',
    subjects: [
      'Graph Drawing',
      'Network Visualization',
      'Edge Bundling',
      'Node-Link Diagrams',
      'Adjacency Matrices',
      'Dynamic Graphs'
    ],
    venues: [
      'IEEE Transactions on Visualization and Computer Graphics',
      'Computer Graphics Forum',
      'Journal of Graph Algorithms and Applications'
    ],
    terms: ['layout', 'readability', 'clutter', 'force-directed placement', 'crossings']
  },
  {
    key: 'text',
    subjects: [
      'Text Visualization',
      'Visual Storytelling',
      'Word Clouds',
      'Topic Model Visualization',
      'Document Collections'
    ],
    venues: [
      'IEEE Transactions on Visualization and Computer Graphics',
      'Information Visualization',
      'Proceedings of the CHI Conference on Human Factors in Computing Systems'
    ],
    terms: ['narrative', 'reading', 'annotation', 'summarization', 'linking text and charts']
  },
  {
    key: 'uncertainty',
    subjects: [
      'Uncertainty Visualization',
      'Ensemble Visualization',
      'Probabilistic Charts',
      'Risk Communication',
      'Error Bars'
    ],
    venues: [
      'Computer Graphics Forum',
      'IEEE Transactions on Visualization and Computer Graphics',
      'Journal of Experimental Psychology: Applied'
    ],
    terms: ['perception', 'decision making', 'variability', 'trust', 'quantile dotplots']
  },
  {
    key: 'perception',
    subjects: [
      'Visual Perception',
      'Graphical Perception',
      'Color Scales',
      'Visual Attention',
      'Chart Comprehension'
    ],
    venues: [
      'IEEE Transactions on Visualization and Computer Graphics',
      'Journal of Vision',
      'ACM Transactions on Applied Perception'
    ],
    terms: [
      'accuracy',
      'crowdsourced experiments',
      'preattentive processing',
      'color',
      'working memory'
    ]
  }
]

const TITLE_PATTERNS = [
  (s, t) => `${s}: A Study of ${t}`,
  (s, t) => `Towards Better ${s} Through ${t}`,
  (s, t) => `Evaluating ${t} in ${s}`,
  (s, t) => `${t} in ${s}: A Survey`,
  (s, t) => `${s} Revisited: The Role of ${t}`,
  (s, t) => `Scalable ${s} with ${t}`,
  (s, t) => `Understanding ${t} for ${s}`,
  (s, t) => `On the Design Space of ${s} and ${t}`
]

const FIRST_NAMES = [
  'Anna',
  'Ben',
  'Chiara',
  'David',
  'Elif',
  'Felix',
  'Greta',
  'Hiro',
  'Ines',
  'Jonas',
  'Kira',
  'Lars',
  'Mei',
  'Nils',
  'Olga',
  'Pavel',
  'Rosa',
  'Sven',
  'Tara',
  'Umar',
  'Vera',
  'Wen',
  'Yara',
  'Zeno'
]
const LAST_NAMES = [
  'Achterberg',
  'Brandt',
  'Castell',
  'Dunmore',
  'Eklund',
  'Falkner',
  'Gerhardt',
  'Holloway',
  'Ibarra',
  'Jansen',
  'Kowalczyk',
  'Lindqvist',
  'Moreau',
  'Nakamura',
  'Okafor',
  'Petrov',
  'Quintero',
  'Rasmussen',
  'Sandoval',
  'Takeda',
  'Underwood',
  'Valente',
  'Whitfield',
  'Xiang',
  'Yilmaz',
  'Zeller',
  'Abernathy',
  'Bergstrom',
  'Calloway',
  'Delacroix',
  'Eriksen',
  'Fontaine',
  'Grimaldi',
  'Hartmann',
  'Iversen',
  'Jovanovic'
]

// Seeded pseudo-random numbers (mulberry32) to always generate the same network
let seed = Number(SEED)
function random() {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const randomInt = (min, max) => min + Math.floor(random() * (max - min + 1))
const pick = (list) => list[Math.floor(random() * list.length)]

function pickWeighted(candidates, weight) {
  const total = candidates.reduce((sum, candidate) => sum + weight(candidate), 0)
  let threshold = random() * total
  return candidates.find((candidate) => (threshold -= weight(candidate)) <= 0) || candidates.at(-1)
}

// Each (sub)topic has its own community of authors, some of them prolific
const authorsBySubtopic = Array.from({ length: TOPICS.length * SUBTOPIC_COUNT }, () =>
  Array.from({ length: HAS_SUBTOPICS ? 9 : 22 }, () => ({
    name: `${pick(LAST_NAMES)}, ${pick(FIRST_NAMES)}`,
    productivity: random() < 0.15 ? 8 : 1
  }))
)

function getTopicWeight(publication, other) {
  if (other.topicIndex !== publication.topicIndex) return 1
  if (!HAS_SUBTOPICS) return 8
  return other.subtopicIndex === publication.subtopicIndex ? 20 : 3
}

// More publications in recent years
const publications = Array.from({ length: PUBLICATION_COUNT }, (_, i) => {
  const topicIndex = i % TOPICS.length
  const topic = TOPICS[topicIndex]
  const subtopicIndex = HAS_SUBTOPICS ? randomInt(0, SUBTOPIC_COUNT - 1) : 0
  const year = Math.round(FIRST_YEAR + (LAST_YEAR - FIRST_YEAR) * Math.sqrt(random()))
  const subject = pick(topic.subjects)
  const term = pick(topic.terms)
  const authors = new Set()
  const authorCount = randomInt(1, 5)
  while (authors.size < authorCount) {
    authors.add(
      pickWeighted(
        authorsBySubtopic[topicIndex * SUBTOPIC_COUNT + subtopicIndex],
        (author) => author.productivity
      ).name
    )
  }
  return {
    doi: `10.5555/synth.${topic.key}${HAS_SUBTOPICS ? subtopicIndex : ''}.${String(i).padStart(3, '0')}`,
    topicIndex,
    subtopicIndex,
    year,
    title: pick(TITLE_PATTERNS)(
      subject,
      term.replace(/\b\w/g, (c) => c.toUpperCase())
    ),
    author: [...authors].join('; '),
    container: pick(topic.venues),
    abstract: `We investigate ${term} in the context of ${subject.toLowerCase()}. Our results inform the design of future ${topic.key} visualization approaches.`,
    references: new Set(),
    citations: new Set()
  }
})
publications.sort((a, b) => a.year - b.year)

// References point to older publications, mostly of the same (sub)topic, preferring recent
// and well-cited ones
publications.forEach((publication, index) => {
  const older = publications.slice(0, index).filter((other) => other.year < publication.year)
  if (!older.length) return
  const referenceCount = Math.min(older.length, randomInt(4, 25))
  while (publication.references.size < referenceCount) {
    const reference = pickWeighted(
      older,
      (other) =>
        getTopicWeight(publication, other) *
        Math.sqrt(1 + other.citations.size) *
        Math.exp((other.year - publication.year) / 6) *
        (publication.references.has(other.doi) ? 0 : 1)
    )
    publication.references.add(reference.doi)
    reference.citations.add(publication.doi)
  }
})

// The selection focuses on two topics, preferring well-cited publications
const selected = new Set()
while (selected.size < SELECTED_COUNT) {
  const candidates = publications.filter((publication) => !selected.has(publication.doi))
  selected.add(
    pickWeighted(
      candidates,
      (publication) => (publication.topicIndex <= 1 ? 6 : 1) * (1 + publication.citations.size)
    ).doi
  )
}

const publicationData = Object.fromEntries(
  publications.map((publication) => [
    publication.doi,
    {
      doi: publication.doi,
      title: publication.title,
      author: publication.author,
      year: publication.year,
      container: publication.container,
      abstract: publication.abstract,
      reference: [...publication.references].join('; '),
      citation: [...publication.citations].join('; '),
      tooManyCitations: false
    }
  ])
)

const session = {
  name: 'Synthetic network',
  selected: [...selected],
  excluded: [],
  boost: 'graph, text, uncert'
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true })
// One publication per line
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'publications.json'),
  `{\n${Object.entries(publicationData)
    .map(([doi, data]) => `${JSON.stringify(doi)}: ${JSON.stringify(data)}`)
    .join(',\n')}\n}\n`
)
fs.writeFileSync(
  path.join(OUTPUT_DIR, `session-${SELECTED_COUNT}-selected.json`),
  `${JSON.stringify(session, null, 2)}\n`
)
console.log(
  `Generated ${publications.length} publications, ${selected.size} selected, in ${OUTPUT_DIR}`
)
