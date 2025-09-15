import { describe, it, expect } from 'vitest'

import { findKeywordMatches, highlightTitle } from '@/utils/scoringUtils.js'

describe('scoringUtils', () => {
  describe('findKeywordMatches', () => {
    describe('word boundary matching for short keywords', () => {
      it('should match short keywords only at the start of words', () => {
        const title = 'AI-powered machine learning and contained information'
        const keywords = ['AI']

        const matches = findKeywordMatches(title, keywords)

        // Should match "AI" at the beginning but NOT "AI" within "contained"
        expect(matches).toHaveLength(1)
        expect(matches[0].position).toBe(0)
        expect(matches[0].text).toBe('AI')
      })

      it('should not match short keywords in the middle of words', () => {
        const title = 'This contains AI in the middle of contained'
        const keywords = ['AI']

        const matches = findKeywordMatches(title, keywords)

        // Should only match "AI" as standalone word, not within "contained"
        expect(matches).toHaveLength(1)
        expect(matches[0].position).toBe(14) // Position of standalone "AI"
        expect(matches[0].text).toBe('AI')
      })

      it('should match short keywords at word boundaries with punctuation', () => {
        const title = 'The AI-driven approach, ML.method, and (API) system'
        const keywords = ['AI', 'ML', 'API']

        const matches = findKeywordMatches(title, keywords)

        // Should match each different keyword once: "AI-", "ML.", "(API)"
        expect(matches).toHaveLength(3)
        expect(matches[0].position).toBe(4) // "AI-driven"
        expect(matches[1].position).toBe(24) // "ML.method"
        expect(matches[2].position).toBe(40) // "(API)"
      })
    })

    describe('substring matching for longer keywords', () => {
      it('should allow substring matching for longer keywords', () => {
        const title = 'Machine learning and computational approaches'
        const keywords = ['learning', 'computation']

        const matches = findKeywordMatches(title, keywords)

        // "learning" should match exactly, "computation" should match within "computational"
        expect(matches).toHaveLength(2)
        expect(matches[0].position).toBe(8) // "learning"
        expect(matches[1].position).toBe(21) // "computation" within "computational" (corrected position)
      })

      it('should match longer keywords anywhere in words', () => {
        const title = 'Subcomputation and relearning processes'
        const keywords = ['computation', 'learning']

        const matches = findKeywordMatches(title, keywords)

        // Both should match as substrings
        expect(matches).toHaveLength(2)
        expect(matches[0].position).toBe(3) // "computation" within "Subcomputation"
        expect(matches[1].position).toBe(21) // "learning" within "relearning" (corrected position)
      })
    })

    describe('keyword length threshold behavior', () => {
      it('should use word boundary matching for keywords 3 characters or less', () => {
        const title = 'AI ML API contained maintained citation'
        const keywords = ['AI', 'ML', 'API', 'cit']

        const matches = findKeywordMatches(title, keywords)

        // Should match "AI", "ML", "API" as whole words but not within "contained" or "maintained"
        // Should match "cit" at start of "citation" (word boundary start matching)
        expect(matches).toHaveLength(4)
        expect(matches[0].position).toBe(0) // "AI"
        expect(matches[1].position).toBe(3) // "ML"
        expect(matches[2].position).toBe(6) // "API"
        expect(matches[3].position).toBe(31) // "cit" at start of "citation"
      })

      it('should use substring matching for keywords longer than 3 characters', () => {
        const title = 'Preprocessing and postprocessing data'
        const keywords = ['process']

        const matches = findKeywordMatches(title, keywords)

        // Should match "process" only once - the first occurrence within "Preprocessing"
        expect(matches).toHaveLength(1)
        expect(matches[0].position).toBe(3) // within "Preprocessing"
        expect(matches[0].text).toBe('process')
      })
    })

    describe('case insensitive matching', () => {
      it('should match keywords case-insensitively with word boundaries', () => {
        const title = 'ai ML Api contained'
        const keywords = ['AI', 'ml', 'api']

        const matches = findKeywordMatches(title, keywords)

        expect(matches).toHaveLength(3)
        expect(matches[0].position).toBe(0) // "ai" matches "AI"
        expect(matches[1].position).toBe(3) // "ML" matches "ml"
        expect(matches[2].position).toBe(6) // "Api" matches "api"
      })
    })

    describe('existing functionality preservation', () => {
      it('should handle alternative keywords with pipe separator', () => {
        const title = 'Machine learning and artificial intelligence'
        const keywords = ['ML|machine learning', 'AI|artificial intelligence']

        const matches = findKeywordMatches(title, keywords)

        expect(matches).toHaveLength(2)
        expect(matches[0].keyword).toBe('ML|machine learning')
        expect(matches[1].keyword).toBe('AI|artificial intelligence')
      })

      it('should ignore empty alternatives in keyword strings', () => {
        const title = 'Machine learning and artificial intelligence AI'
        const keywords = ['machine|', '|learning', 'artificial||intelligence', 'AI|||']

        const matches = findKeywordMatches(title, keywords)

        expect(matches).toHaveLength(4)
        expect(matches[0].keyword).toBe('machine|')
        expect(matches[0].text).toBe('machine') // Should match "machine" part, ignoring empty alternative
        expect(matches[1].keyword).toBe('|learning')
        expect(matches[1].text).toBe('learning') // Should match "learning" part, ignoring empty alternative
        expect(matches[2].keyword).toBe('artificial||intelligence')
        expect(matches[2].text).toBe('artificial') // Should match first valid alternative
        expect(matches[3].keyword).toBe('AI|||')
        expect(matches[3].text).toBe('AI') // Should match "AI" part, ignoring empty alternatives
      })

      it('should handle keywords with only empty alternatives', () => {
        const title = 'Machine learning test'
        const keywords = ['|', '||', '|||', 'test']

        const matches = findKeywordMatches(title, keywords)

        // Should only match "test", ignore keywords with only empty alternatives
        expect(matches).toHaveLength(1)
        expect(matches[0].keyword).toBe('test')
        expect(matches[0].text).toBe('test')
      })

      it('should preserve original keyword string format', () => {
        const title = 'Machine learning'
        const keywords = ['machine|'] // Original format should be preserved in result

        const matches = findKeywordMatches(title, keywords)

        expect(matches).toHaveLength(1)
        expect(matches[0].keyword).toBe('machine|') // Original string preserved
        expect(matches[0].text).toBe('machine') // But only valid alternative matched
      })

      it('should make "keyword|" behave the same as "keyword"', () => {
        const title = 'Machine learning test'

        // Test both "keyword|" and "keyword" separately
        const matchesWithPipe = findKeywordMatches(title, ['machine|'])
        const matchesWithoutPipe = findKeywordMatches(title, ['machine'])

        // Both should have same number of matches and same positions
        expect(matchesWithPipe).toHaveLength(matchesWithoutPipe.length)
        expect(matchesWithPipe[0].position).toBe(matchesWithoutPipe[0].position)
        expect(matchesWithPipe[0].text).toBe(matchesWithoutPipe[0].text)

        // But original keyword strings should be preserved as provided
        expect(matchesWithPipe[0].keyword).toBe('machine|')
        expect(matchesWithoutPipe[0].keyword).toBe('machine')
      })

      it('should prevent overlapping matches', () => {
        const title = 'Machine learning'
        const keywords = ['machine', 'machine learning']

        const matches = findKeywordMatches(title, keywords)

        // Should only match the first non-overlapping occurrence
        expect(matches).toHaveLength(1)
      })

      it('should handle empty and undefined keywords', () => {
        const title = 'Test title'
        const keywords = ['', null, undefined, 'test']

        const matches = findKeywordMatches(title, keywords)

        expect(matches).toHaveLength(1)
        expect(matches[0].text).toBe('test')
      })
    })

    describe('single keyword matching constraint', () => {
      it('should match each keyword only once, even if it appears multiple times', () => {
        const title = 'AI research in AI systems and AI applications'
        const keywords = ['AI']

        const matches = findKeywordMatches(title, keywords)

        // Should only match the first occurrence of "AI", not all three
        expect(matches).toHaveLength(1)
        expect(matches[0].position).toBe(0) // First "AI" at position 0
        expect(matches[0].text).toBe('AI')
      })

      it('should match each alternative keyword only once', () => {
        const title = 'Citation analysis and reference management for citing papers'
        const keywords = ['cit|ref']

        const matches = findKeywordMatches(title, keywords)

        // Should only match the first alternative found ("cit" in "Citation"), not "ref" in "reference"
        expect(matches).toHaveLength(1)
        expect(matches[0].position).toBe(0) // "Cit" in "Citation"
        expect(matches[0].keyword).toBe('cit|ref')
        expect(matches[0].text).toBe('cit')
      })

      it('should match different keywords independently', () => {
        const title = 'Machine learning and AI research in ML applications'
        const keywords = ['AI', 'ML']

        const matches = findKeywordMatches(title, keywords)

        // Should match both keywords once each
        expect(matches).toHaveLength(2)
        expect(matches[0].text).toBe('AI') // First occurrence of AI
        expect(matches[1].text).toBe('ML') // First occurrence of ML
      })

      it('should handle mixed short and long keywords with single matching', () => {
        const title = 'Machine learning algorithms in machine learning research'
        const keywords = ['AI', 'machine learning']

        const matches = findKeywordMatches(title, keywords)

        // Should match "machine learning" once (first occurrence) but not find "AI"
        expect(matches).toHaveLength(1)
        expect(matches[0].text).toBe('machine learning')
        expect(matches[0].position).toBe(0) // First occurrence
      })
    })
  })

  describe('integration with existing functions', () => {
    it('should work correctly with highlightTitle', () => {
      const title = 'AI-powered contained system'
      const keywords = ['AI']

      const matches = findKeywordMatches(title, keywords)
      const highlighted = highlightTitle(title, matches)

      // Should only highlight the word-boundary "AI", not within "contained"
      expect(highlighted).toContain('<u')
      expect(highlighted.indexOf('<u')).toBe(0) // Should start highlighting at position 0
      expect((highlighted.match(/<u/g) || []).length).toBe(1) // Only one highlight
    })

    it('should highlight only first occurrence when keyword appears multiple times', () => {
      const title = 'AI research in AI systems'
      const keywords = ['AI']

      const matches = findKeywordMatches(title, keywords)
      const highlighted = highlightTitle(title, matches)

      // Should only highlight the first "AI"
      expect((highlighted.match(/<u/g) || []).length).toBe(1) // Only one highlight
      expect(highlighted.indexOf('<u')).toBe(0) // Should start highlighting at position 0
    })
  })
})
