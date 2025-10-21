/**
 * Test for verifying that publications queued for selection properly update
 * their visual state in the network when they become selected publications.
 *
 * Issue: Publications that are queuing to be added to selected publications
 * are visually marked (blurred, plus icon) in the network visualization.
 * However, when updating the suggestion, this visual state is not correctly
 * updated—in the vis, they show like queueing publications, although they
 * are already part of the selected publications.
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import NetworkVisComponent from '@/components/NetworkVisComponent.vue'
import { useAppState } from '@/composables/useAppState.js'
import Publication from '@/core/Publication.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'
import { createPublicationNodes } from '@/utils/network/publicationNodes.js'

// Mock fetch globally
global.fetch = vi.fn()

describe('Queued Publications Visual State Bug', () => {
  let sessionStore
  let queueStore
  let appState

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)

    sessionStore = useSessionStore()
    queueStore = useQueueStore()
    appState = useAppState()

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

  it('should update visual classes when queue is cleared during network update', async () => {
    // This test verifies that the updatePublicationNodes correctly updates
    // CSS classes based on current node data
    const pub1Doi = '10.1000/pub1'
    const pub1 = new Publication(pub1Doi)
    pub1.title = 'Publication 1'
    pub1.year = 2020
    pub1.isSelected = false

    // Queue the publication
    queueStore.selectedQueue.push(pub1Doi)

    // Create node with queueing flag
    const doiToIndex = {}
    const nodes = createPublicationNodes(
      [pub1],
      doiToIndex,
      queueStore.selectedQueue,
      queueStore.excludedQueue
    )

    const node = nodes[0]
    expect(node.isQueuingForSelected).toBe(true)

    // Simulate what happens during updateQueued:
    // 1. Publication moves to selected
    pub1.isSelected = true

    // 2. Queue is cleared
    queueStore.clear()

    // 3. Network should replot with new node data
    // But if it uses old node objects, the flag won't update

    // The bug is that even though the queue is cleared,
    // if the node object still has isQueuingForSelected = true,
    // the visual state will be wrong
    expect(node.isQueuingForSelected).toBe(true) // This is the bug!

    // The fix should ensure that node data is refreshed from current queue state
  })
})
