export function measureRenderTime(mountFn) {
  const start = performance.now()
  const result = mountFn()
  const end = performance.now()
  return { result, renderTime: end - start }
}

export function measureMemoryUsage() {
  if (performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      usedMB: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
    }
  }
  return null
}

function createMockPublication(id = 'test-doi', overrides = {}) {
  return {
    doi: id,
    title: 'Test Publication',
    author: 'Test Author',
    authorOrcidHtml: 'Test Author.',
    year: 2023,
    container: 'Test Journal',
    score: 5,
    scoreColor: '#ff0000',
    citationCount: 10,
    referenceCount: 5,
    referenceDois: new Set(['ref1', 'ref2']),
    citationDois: new Set(['cite1', 'cite2', 'cite3']),
    tooManyCitations: false,
    boostFactor: 2,
    boostMatches: 1,
    isActive: false,
    isSelected: false,
    isLinkedToActive: false,
    isRead: true,
    wasFetched: true,
    isHovered: false,
    isKeywordHovered: false,
    isAuthorHovered: false,
    ...overrides
  }
}

export function createMockPublications(count, baseProps = {}) {
  return Array.from({ length: count }, (_, i) =>
    createMockPublication(`doi-${i}`, {
      ...baseProps,
      score: Math.floor(Math.random() * 10) + 1
    })
  )
}

export class PerformanceProfiler {
  constructor(name) {
    this.name = name
    this.startTime = null
    this.endTime = null
    this.markers = []
  }

  start() {
    this.startTime = performance.now()
    performance.mark(`${this.name}-start`)
    return this
  }

  mark(label) {
    const time = performance.now()
    this.markers.push({ label, time: time - this.startTime })
    performance.mark(`${this.name}-${label}`)
    return this
  }

  end() {
    this.endTime = performance.now()
    performance.mark(`${this.name}-end`)
    performance.measure(this.name, `${this.name}-start`, `${this.name}-end`)
    return this
  }

  getDuration() {
    return this.endTime - this.startTime
  }

  getMarkers() {
    return [...this.markers]
  }

  getReport() {
    return {
      name: this.name,
      duration: this.getDuration(),
      markers: this.getMarkers()
    }
  }
}
