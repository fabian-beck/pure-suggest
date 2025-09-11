import { describe, it, expect } from 'vitest'
import { calculateAuthorColor } from '@/utils/authorColor.js'

describe('calculateAuthorColor', () => {
  const mockAuthorStore = {
    isAuthorScoreEnabled: true,
    isFirstAuthorBoostEnabled: true,
    isAuthorNewBoostEnabled: true
  }

  it('should return darker color for higher scores', () => {
    const highScore = 20
    const lowScore = 5

    const highScoreColor = calculateAuthorColor(highScore, mockAuthorStore)
    const lowScoreColor = calculateAuthorColor(lowScore, mockAuthorStore)

    // Extract lightness values
    const highScoreLightness = parseInt(highScoreColor.match(/hsl\(0, 0%, (\d+)%/)[1], 10)
    const lowScoreLightness = parseInt(lowScoreColor.match(/hsl\(0, 0%, (\d+)%/)[1], 10)

    // Higher score should result in lower lightness (darker color)
    expect(highScoreLightness).toBeLessThan(lowScoreLightness)
  })

  it('should return HSL color string format', () => {
    const score = 10
    const color = calculateAuthorColor(score, mockAuthorStore)

    expect(color).toMatch(/^hsl\(0, 0%, \d+%\)$/)
  })

  it('should adjust score based on author store settings', () => {
    const score = 10

    // Test with score disabled (should multiply by 20)
    const storeScoreDisabled = { ...mockAuthorStore, isAuthorScoreEnabled: false }
    const colorScoreDisabled = calculateAuthorColor(score, storeScoreDisabled)

    // Test with all boosts disabled
    const storeBoostsDisabled = {
      isAuthorScoreEnabled: true,
      isFirstAuthorBoostEnabled: false,
      isAuthorNewBoostEnabled: false
    }
    const colorBoostsDisabled = calculateAuthorColor(score, storeBoostsDisabled)

    // Test with default settings
    const colorDefault = calculateAuthorColor(score, mockAuthorStore)

    // All should be valid HSL colors
    expect(colorScoreDisabled).toMatch(/^hsl\(0, 0%, \d+%\)$/)
    expect(colorBoostsDisabled).toMatch(/^hsl\(0, 0%, \d+%\)$/)
    expect(colorDefault).toMatch(/^hsl\(0, 0%, \d+%\)$/)

    // Different settings should produce different results
    expect(colorScoreDisabled).not.toBe(colorDefault)
    expect(colorBoostsDisabled).not.toBe(colorDefault)
  })

  it('should never return negative lightness values', () => {
    const veryHighScore = 1000
    const color = calculateAuthorColor(veryHighScore, mockAuthorStore)

    const lightness = parseInt(color.match(/hsl\(0, 0%, (\d+)%/)[1], 10)
    expect(lightness).toBeGreaterThanOrEqual(0)
  })
})
