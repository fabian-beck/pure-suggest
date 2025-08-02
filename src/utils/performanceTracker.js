// Performance tracking focused on PublicationComponent
class PerformanceTracker {
  constructor() {
    this.componentMounts = [];
    this.totalMountTime = 0;
  }

  // Track PublicationComponent mounting performance
  trackComponentMount(duration) {
    this.componentMounts.push(duration);
    this.totalMountTime += duration;
    
    // Only log extremely slow mounts
    if (duration > 300) {
      console.warn(`[PERF] 🐌 VERY SLOW PublicationComponent mount: ${duration.toFixed(0)}ms`);
    }
    
    // Report aggregate stats every 20 mounts
    if (this.componentMounts.length % 20 === 0) {
      const avg = this.totalMountTime / this.componentMounts.length;
      const slowCount = this.componentMounts.filter(d => d > 200).length;
      console.log(`[PERF] 📊 ${this.componentMounts.length} PublicationComponents mounted: avg ${avg.toFixed(0)}ms, ${slowCount} slow (>200ms), total ${this.totalMountTime.toFixed(0)}ms`);
    }
  }

  // Clear old stats (keep last 1000 entries)
  cleanup() {
    if (this.componentMounts.length > 1000) {
      const removed = this.componentMounts.length - 1000;
      const removedTime = this.componentMounts.slice(0, removed).reduce((sum, d) => sum + d, 0);
      this.componentMounts = this.componentMounts.slice(-1000);
      this.totalMountTime -= removedTime;
    }
  }
}

// Create global instance
const perfTracker = new PerformanceTracker();

// Cleanup old stats every 5 minutes
setInterval(() => perfTracker.cleanup(), 5 * 60 * 1000);

export default perfTracker;