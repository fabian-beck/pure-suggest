/**
 * Test for verifying that publications queued for selection properly update
 * their visual state in the network when they become selected publications.
 *
 * Issue: Publications that are queuing to be added to selected publications
 * are visually marked (blurred, plus icon) in the network visualization.
 * However, when updating the suggestion, this visual state is not correctly
 * updated—in the vis, they show like queueing publications, although they
 * are already part of the selected publications.
 * 
 * Root cause: The network replot watcher only triggered when author nodes were visible,
 * so when updateQueued() was called with author nodes hidden, the network never replotted
 * and the queued publications continued to show the blurred/plus icon visual state.
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Publication from '@/core/Publication.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'
import { createPublicationNodes } from '@/utils/network/publicationNodes.js'

// Mock fetch globally
global.fetch = vi.fn()

describe('Queued Publications Visual State Bug', () => {
  let sessionStore
  let queueStore

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)

    sessionStore = useSessionStore()
    queueStore = useQueueStore()

    // Mock DOM methods that D3 uses
    global.document.getElementById = vi.fn((id) => {
      if (id === 'network-svg-container') {
        return {
          clientWidth: 800,
          clientHeight: 400,
          getBoundingClientRect: () => ({
            width: 800,
            height: 400,
            top: 0,
            left: 0,
            right: 800,
            bottom: 400
          })
        }
      }
      return null
    })

    // Mock fetch for publication data
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: [
          {
            title: ['Test Publication'],
            published: { 'date-parts': [[2020]] },
            DOI: '10.1000/test1',
            author: [{ given: 'John', family: 'Doe' }],
            abstract: 'Test abstract'
          }
        ]
      })
    })
  })

  it('should not show queueing visual state for publications that moved from queue to selected', async () => {
    // Setup: Add one publication to selected
    const pub1 = new Publication('10.1000/pub1')
    pub1.title = 'Publication 1'
    pub1.year = 2020
    pub1.isSelected = true
    sessionStore.selectedPublications = [pub1]

    // Add another publication to the queue
    const pub2Doi = '10.1000/pub2'
    queueStore.selectedQueue.push(pub2Doi)

    // Verify publication is in queue
    expect(queueStore.isQueuingForSelected(pub2Doi)).toBe(true)

    // Create nodes with the queued publication
    const pub2 = new Publication(pub2Doi)
    pub2.title = 'Publication 2'
    pub2.year = 2021
    pub2.isSelected = false

    const publications = [pub1, pub2]
    const doiToIndex = {}
    let nodes = createPublicationNodes(
      publications,
      doiToIndex,
      queueStore.selectedQueue,
      queueStore.excludedQueue
    )

    // Verify that pub2 node has the queueing flag
    const pub2Node = nodes.find((n) => n.id === pub2Doi)
    expect(pub2Node).toBeDefined()
    expect(pub2Node.isQueuingForSelected).toBe(true)

    // Now simulate updateQueued - move pub2 from queue to selected
    sessionStore.selectedPublications = [pub1, pub2]
    pub2.isSelected = true
    queueStore.clear()

    // Verify queue is cleared
    expect(queueStore.isQueuingForSelected(pub2Doi)).toBe(false)

    // Create nodes again (simulating network replot after updateQueued)
    nodes = createPublicationNodes(
      publications,
      doiToIndex,
      queueStore.selectedQueue,
      queueStore.excludedQueue
    )

    // Verify that pub2 node no longer has the queueing flag
    const pub2NodeAfter = nodes.find((n) => n.id === pub2Doi)
    expect(pub2NodeAfter).toBeDefined()
    expect(pub2NodeAfter.isQueuingForSelected).toBe(false)
    expect(pub2NodeAfter.publication.isSelected).toBe(true)
  })

  it('should create nodes with correct queueing flags based on current queue state', () => {
    // This test verifies that when nodes are created, they reflect the current queue state
    const pub1Doi = '10.1000/pub1'
    const pub1 = new Publication(pub1Doi)
    pub1.title = 'Publication 1'
    pub1.year = 2020
    pub1.isSelected = false

    // Initially queue is empty
    const doiToIndex = {}
    let nodes = createPublicationNodes(
      [pub1],
      doiToIndex,
      queueStore.selectedQueue,
      queueStore.excludedQueue
    )

    expect(nodes[0].isQueuingForSelected).toBe(false)
    expect(nodes[0].isQueuingForExcluded).toBe(false)

    // Add to queue
    queueStore.selectedQueue.push(pub1Doi)
    nodes = createPublicationNodes(
      [pub1],
      doiToIndex,
      queueStore.selectedQueue,
      queueStore.excludedQueue
    )

    expect(nodes[0].isQueuingForSelected).toBe(true)
    expect(nodes[0].isQueuingForExcluded).toBe(false)

    // Clear queue
    queueStore.clear()
    nodes = createPublicationNodes(
      [pub1],
      doiToIndex,
      queueStore.selectedQueue,
      queueStore.excludedQueue
    )

    expect(nodes[0].isQueuingForSelected).toBe(false)
    expect(nodes[0].isQueuingForExcluded).toBe(false)
  })
})
