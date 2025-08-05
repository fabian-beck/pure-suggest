export const PERFORMANCE_THRESHOLDS = {
  renderTime: 100,      // ms for initial render
  memoryUsage: 50,      // MB maximum
  scrollFPS: 30,        // minimum FPS during scroll
  hoverDelay: 16,       // ms maximum hover response
  rerenderTime: 50,     // ms for reactive updates
  batchRenderTime: 500  // ms for rendering multiple components
};

export function measureRenderTime(mountFn) {
  const start = performance.now();
  const result = mountFn();
  const end = performance.now();
  return { result, renderTime: end - start };
}

export function measureMemoryUsage() {
  if (performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      usedMB: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
    };
  }
  return null;
}

export function measureAsyncOperation(asyncFn) {
  return async (...args) => {
    const start = performance.now();
    const result = await asyncFn(...args);
    const end = performance.now();
    return { result, executionTime: end - start };
  };
}

export function createPerformanceObserver(entryTypes = ['measure']) {
  const entries = [];
  
  if (typeof PerformanceObserver !== 'undefined') {
    const observer = new PerformanceObserver((list) => {
      entries.push(...list.getEntries());
    });
    
    observer.observe({ entryTypes });
    
    return {
      observer,
      getEntries: () => [...entries],
      disconnect: () => observer.disconnect()
    };
  }
  
  return null;
}

export function measureFPS(duration = 1000) {
  return new Promise((resolve) => {
    let frameCount = 0;
    const startTime = performance.now();
    
    function countFrame() {
      frameCount++;
      const elapsed = performance.now() - startTime;
      
      if (elapsed < duration) {
        requestAnimationFrame(countFrame);
      } else {
        const fps = Math.round((frameCount * 1000) / elapsed);
        resolve(fps);
      }
    }
    
    requestAnimationFrame(countFrame);
  });
}

export function createMockPublication(id = 'test-doi', overrides = {}) {
  return {
    doi: id,
    title: 'Test Publication',
    author: 'Test Author',
    year: 2023,
    score: 5,
    scoreColor: '#ff0000',
    citationCount: 10,
    referenceCount: 5,
    referenceDois: ['ref1', 'ref2'],
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
  };
}

export function createMockPublications(count, baseProps = {}) {
  return Array.from({ length: count }, (_, i) => 
    createMockPublication(`doi-${i}`, { 
      ...baseProps, 
      score: Math.floor(Math.random() * 10) + 1 
    })
  );
}

export function logPerformanceMetrics(testName, metrics) {
  console.log(`\n=== ${testName} Performance Metrics ===`);
  Object.entries(metrics).forEach(([key, value]) => {
    const unit = key.includes('Time') ? 'ms' : 
                 key.includes('Memory') ? 'bytes' :
                 key.includes('FPS') ? 'fps' : '';
    console.log(`${key}: ${value}${unit}`);
  });
  console.log('=====================================\n');
}

export class PerformanceProfiler {
  constructor(name) {
    this.name = name;
    this.startTime = null;
    this.endTime = null;
    this.markers = [];
  }

  start() {
    this.startTime = performance.now();
    performance.mark(`${this.name}-start`);
    return this;
  }

  mark(label) {
    const time = performance.now();
    this.markers.push({ label, time: time - this.startTime });
    performance.mark(`${this.name}-${label}`);
    return this;
  }

  end() {
    this.endTime = performance.now();
    performance.mark(`${this.name}-end`);
    performance.measure(this.name, `${this.name}-start`, `${this.name}-end`);
    return this;
  }

  getDuration() {
    return this.endTime - this.startTime;
  }

  getMarkers() {
    return [...this.markers];
  }

  getReport() {
    return {
      name: this.name,
      duration: this.getDuration(),
      markers: this.getMarkers()
    };
  }
}