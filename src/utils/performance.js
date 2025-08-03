// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.enabled = true; // Set to false in production
  }

  startTimer(label) {
    if (!this.enabled) return;
    this.metrics.set(label, performance.now());
  }

  endTimer(label, logLevel = 'debug') {
    if (!this.enabled) return;
    const startTime = this.metrics.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      console[logLevel](`[PERF] ${label}: ${duration.toFixed(2)}ms`);
      this.metrics.delete(label);
      return duration;
    }
  }

  logMemoryUsage() {
    if (!this.enabled || !performance.memory) return;
    const memory = performance.memory;
    console.debug(`[PERF] Memory: Used ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / Total ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
  }

  measureFunction(fn, label) {
    if (!this.enabled) return fn();
    const startTime = performance.now();
    const result = fn();
    const duration = performance.now() - startTime;
    console.debug(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
    return result;
  }

  measureAsyncFunction(asyncFn, label) {
    if (!this.enabled) return asyncFn();
    const startTime = performance.now();
    return asyncFn().finally(() => {
      const duration = performance.now() - startTime;
      console.debug(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
    });
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

// Helper functions for common patterns
export const withTiming = (fn, label) => perfMonitor.measureFunction(fn, label);
export const withAsyncTiming = (asyncFn, label) => perfMonitor.measureAsyncFunction(asyncFn, label);