// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.enabled = true; // Set to false in production
  }

  logMemoryUsage() {
    if (!this.enabled || !performance.memory) return;
    const memory = performance.memory;
    console.debug(`[PERF] Memory: Used ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / Total ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
  }

  logPageMetrics() {
    if (!this.enabled) return;
    // Log navigation timing
    if (performance.navigation && performance.timing) {
      const timing = performance.timing;
      console.group('[PERF] Page Load Metrics');
      console.debug(`DNS Lookup: ${timing.domainLookupEnd - timing.domainLookupStart}ms`);
      console.debug(`TCP Connection: ${timing.connectEnd - timing.connectStart}ms`);
      console.debug(`Request/Response: ${timing.responseEnd - timing.requestStart}ms`);
      console.debug(`DOM Processing: ${timing.domComplete - timing.domLoading}ms`);
      console.debug(`Total Load Time: ${timing.loadEventEnd - timing.navigationStart}ms`);
      console.groupEnd();
    }

    // Log performance entries
    const entries = performance.getEntriesByType('navigation');
    if (entries.length > 0) {
      const navigation = entries[0];
      console.group('[PERF] Navigation Timing');
      console.debug(`DOM Content Loaded: ${navigation.domContentLoadedEventEnd}ms`);
      console.debug(`Load Complete: ${navigation.loadEventEnd}ms`);
      console.groupEnd();
    }
  }
}

// Create global instance
export const perfMonitor = new PerformanceMonitor();

