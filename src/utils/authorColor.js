/**
 * Calculate author color based on score and current author store settings
 * @param {number} score - The author's score
 * @param {Object} authorStore - The author store with settings
 * @returns {string} HSL color string
 */
export function calculateAuthorColor(score, authorStore) {
  let adjustedScore = score
  
  // Apply the same adjustments as in AuthorGlyph.vue
  if (!authorStore.isAuthorScoreEnabled) {
    adjustedScore = adjustedScore * 20
  }
  if (!authorStore.isFirstAuthorBoostEnabled) {
    adjustedScore = adjustedScore * 1.5
  }
  if (!authorStore.isAuthorNewBoostEnabled) {
    adjustedScore = adjustedScore * 1.5
  }
  
  return `hsl(0, 0%, ${Math.round(Math.max(60 - adjustedScore / 3, 0))}%)`
}