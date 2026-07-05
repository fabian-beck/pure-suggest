import { describe, it, expect, vi, beforeEach } from 'vitest'

import { SuggestionService } from '@/services/SuggestionService.js'

// Mock dependencies - must be before imports
vi.mock('@/core/Publication.js', () => ({
  default: vi.fn()
}))
vi.mock('@/lib/Util.js', () => ({
  shuffle: vi.fn((arr) => arr) // Return array as-is for predictable tests
}))
vi.mock('@/lib/Cache.js', () => ({
  cachedFetch: vi.fn()
}))

const Publication = vi.mocked(await import('@/core/Publication.js')).default

describe('SuggestionService', () => {
  let mockSelectedPublications
  let mockOptions

  beforeEach(() => {
    vi.clearAllMocks()

    // Static bulk prefetch is a no-op in tests; per-pub fetchData is asserted instead
    Publication.prefetch = vi.fn().mockResolvedValue()
    Publication.fetchAll = vi.fn(async (publications, onPublicationLoaded) => {
      for (const publication of publications) {
        await publication.fetchData()
        onPublicationLoaded?.(publication)
      }
    })

    // Mock Publication constructor
    Publication.mockImplementation(function (doi) {
      return {
        doi,
        citationCount: 0,
        referenceCount: 0,
        citationDois: new Set([]),
        referenceDois: new Set([]),
        fetchData: vi.fn().mockResolvedValue(),
        isRead: false
      }
    })

    mockSelectedPublications = [
      {
        doi: '10.1234/selected1',
        citationCount: 0,
        referenceCount: 0,
        citationDois: new Set(['10.1234/citation1', '10.1234/citation2']),
        referenceDois: new Set(['10.1234/reference1'])
      },
      {
        doi: '10.1234/selected2',
        citationCount: 0,
        referenceCount: 0,
        citationDois: new Set(['10.1234/citation2']),
        referenceDois: new Set(['10.1234/reference2'])
      }
    ]

    mockOptions = {
      selectedPublications: mockSelectedPublications,
      isExcluded: vi.fn(() => false),
      isSelected: vi.fn(() => false),
      getSelectedPublicationByDoi: vi.fn(),
      maxSuggestions: 10,
      readPublicationsDois: new Set(),
      updateLoadingMessage: vi.fn()
    }
  })

  describe('computeSuggestions', () => {
    it('should compute suggestions from citation network', async () => {
      const result = await SuggestionService.computeSuggestions(mockOptions)

      expect(result).toHaveProperty('publications')
      expect(result).toHaveProperty('totalSuggestions')
      expect(Array.isArray(result.publications)).toBe(true)
      expect(typeof result.totalSuggestions).toBe('number')
    })

    it('should reset citation/reference counts for selected publications', async () => {
      await SuggestionService.computeSuggestions(mockOptions)

      mockSelectedPublications.forEach((pub) => {
        expect(pub.citationCount).toBe(0)
        expect(pub.referenceCount).toBe(0)
      })
    })

    it('should call updateLoadingMessage during processing', async () => {
      await SuggestionService.computeSuggestions(mockOptions)

      expect(mockOptions.updateLoadingMessage).toHaveBeenCalledWith(
        expect.stringContaining('suggestions loaded')
      )
    })

    it('should exclude DOIs that are marked as excluded', async () => {
      mockOptions.isExcluded = vi.fn((doi) => doi === '10.1234/citation1')

      const result = await SuggestionService.computeSuggestions(mockOptions)

      const suggestionDois = result.publications.map((p) => p.doi)
      expect(suggestionDois).not.toContain('10.1234/citation1')
    })

    it('should not suggest DOIs that are already selected', async () => {
      mockOptions.isSelected = vi.fn((_doi) => _doi === '10.1234/citation2')
      mockOptions.getSelectedPublicationByDoi = vi.fn((_doi) => ({
        citationCount: 0,
        referenceCount: 0
      }))

      const result = await SuggestionService.computeSuggestions(mockOptions)

      const suggestionDois = result.publications.map((p) => p.doi)
      expect(suggestionDois).not.toContain('10.1234/citation2')
    })

    it('should mark publications as read if they are in readPublicationsDois', async () => {
      const readDois = new Set(['10.1234/citation1'])
      mockOptions.readPublicationsDois = readDois

      const result = await SuggestionService.computeSuggestions(mockOptions)

      const readPub = result.publications.find((p) => p.doi === '10.1234/citation1')
      if (readPub) {
        expect(readPub.isRead).toBe(true)
      }
    })

    it('should limit suggestions to maxSuggestions', async () => {
      mockOptions.maxSuggestions = 2

      const result = await SuggestionService.computeSuggestions(mockOptions)

      expect(result.publications.length).toBeLessThanOrEqual(2)
    })

    it('should fetch data for all suggested publications', async () => {
      const result = await SuggestionService.computeSuggestions(mockOptions)

      // Verify fetchData was called for each publication
      result.publications.forEach((pub) => {
        expect(pub.fetchData).toHaveBeenCalled()
      })
    })

    it('should keep only loaded suggestions when cancelled', async () => {
      const { createCancellationToken } = await import('@/lib/Cancellation.js')
      const cancelToken = createCancellationToken()
      let resolveStuckFetch

      // One suggestion loads and triggers cancellation, the other stays pending (simulating a stuck request)
      Publication.mockImplementation(function (doi) {
        return {
          doi,
          citationCount: 0,
          referenceCount: 0,
          citationDois: new Set([]),
          referenceDois: new Set([]),
          wasFetched: false,
          fetchData: vi.fn().mockImplementation(function () {
            if (doi === '10.1234/citation1') {
              this.wasFetched = true
              return Promise.resolve().then(() => cancelToken.cancel())
            }
            return new Promise((resolve) => {
              resolveStuckFetch = resolve
            })
          }),
          isRead: false
        }
      })

      const result = await SuggestionService.computeSuggestions({ ...mockOptions, cancelToken })

      expect(cancelToken.isCancelled).toBe(true)
      expect(result.publications.length).toBeGreaterThan(0)
      result.publications.forEach((pub) => {
        expect(pub.wasFetched).toBe(true)
      })

      // Clean up the still-pending fetch so it doesn't linger past the test
      resolveStuckFetch?.()
    })

    it('should not filter suggestions when the cancellation token was not triggered', async () => {
      const cancelToken = {
        isCancelled: false,
        promise: new Promise(() => {})
      }

      const result = await SuggestionService.computeSuggestions({ ...mockOptions, cancelToken })

      expect(result.publications.length).toBeGreaterThan(0)
    })
  })
})
