/**
 * Simple FPS (Frames Per Second) tracker for performance monitoring
 */
export class FpsTracker {
  constructor() {
    this.frameCount = 0
    this.lastTime = 0
    this.fps = 0
    this.updateInterval = 0.5 // Update FPS display every 500ms
  }

  /**
   * Call this method on each frame/tick to update FPS calculation
   */
  update() {
    this.frameCount++
    const now = performance.now()

    if (this.lastTime === 0) {
      this.lastTime = now
      return
    }

    const deltaTime = (now - this.lastTime) / 1000

    if (deltaTime >= this.updateInterval) {
      this.fps = this.frameCount / deltaTime
      this.frameCount = 0
      this.lastTime = now
    }
  }

  /**
   * Get the current FPS value
   * @returns {number} Current FPS
   */
  getFps() {
    return this.fps
  }

  /**
   * Reset the FPS tracker
   */
  reset() {
    this.frameCount = 0
    this.lastTime = 0
    this.fps = 0
  }
}
