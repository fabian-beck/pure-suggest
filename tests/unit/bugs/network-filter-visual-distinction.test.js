/**
 * Test for verifying that publications not matching active filters are visually
 * distinguished in the network visualization when onlyShowFiltered is false.
 *
 * Issue: When a filter is applied and network visualization is not restricted
 * to filtered publications only, the filtered and non-filtered results should
 * still be discerned. All publications not matching the filtering should be
 * faded out (comparable to those queueing to be selected/removed, however,
 * without plus/minus icons).
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import Filter from '@/core/Filter.js'
import Publication from '@/core/Publication.js'
import { useQueueStore } from '@/stores/queue.js'
import { createPublicationNodes } from '@/utils/network/publicationNodes.js'

describe('Network Filter Visual Distinction', () => {
  let queueStore

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    queueStore = useQueueStore()
  })

  it('should mark publications as filtered-out when they do not match active filters', () => {
    // Create test publications
    const pub1 = new Publication('10.1000/pub1')
    pub1.title = 'Machine Learning Advances'
    pub1.year = 2020
    pub1.isSelected = true

    const pub2 = new Publication('10.1000/pub2')
    pub2.title = 'Deep Learning Research'
    pub2.year = 2021
    pub2.isSelected = false

    const pub3 = new Publication('10.1000/pub3')
    pub3.title = 'Computer Vision'
    pub3.year = 2015
    pub3.isSelected = false

    const publications = [pub1, pub2, pub3]

    // Create filter for year range (2020-2021)
    const filter = new Filter()
    filter.isActive = true
    filter.yearStart = '2020'
    filter.yearEnd = '2021'

    // Test with onlyShowFiltered = false (show all publications, mark non-matching)
    const doiToIndex = {}
    const nodes = createPublicationNodes(publications, doiToIndex, {
      selectedQueue: queueStore.selectedQueue,
      excludedQueue: queueStore.excludedQueue,
      filter,
      onlyShowFiltered: false
    })

    // Verify all publications are included
    expect(nodes).toHaveLength(3)

    // Verify matching publications are not filtered out
    const pub1Node = nodes.find((n) => n.id === pub1.doi)
    const pub2Node = nodes.find((n) => n.id === pub2.doi)
    expect(pub1Node.isFilteredOut).toBe(false)
    expect(pub2Node.isFilteredOut).toBe(false)

    // Verify non-matching publication is marked as filtered out
    const pub3Node = nodes.find((n) => n.id === pub3.doi)
    expect(pub3Node.isFilteredOut).toBe(true)
  })

  it('should not mark any publications as filtered-out when onlyShowFiltered is true', () => {
    // When onlyShowFiltered is true, the publications list is already filtered,
    // so none should be marked as filtered-out
    const pub1 = new Publication('10.1000/pub1')
    pub1.title = 'Machine Learning'
    pub1.year = 2020
    pub1.isSelected = true

    const pub2 = new Publication('10.1000/pub2')
    pub2.title = 'Deep Learning'
    pub2.year = 2021
    pub2.isSelected = false

    const publications = [pub1, pub2]

    const filter = new Filter()
    filter.isActive = true
    filter.yearStart = '2020'
    filter.yearEnd = '2021'

    const doiToIndex = {}
    const nodes = createPublicationNodes(publications, doiToIndex, {
      selectedQueue: queueStore.selectedQueue,
      excludedQueue: queueStore.excludedQueue,
      filter,
      onlyShowFiltered: true
    })

    // Verify no publications are marked as filtered out
    expect(nodes).toHaveLength(2)
    nodes.forEach((node) => {
      expect(node.isFilteredOut).toBe(false)
    })
  })

  it('should not mark any publications as filtered-out when filter is inactive', () => {
    const pub1 = new Publication('10.1000/pub1')
    pub1.title = 'Publication 1'
    pub1.year = 2020
    pub1.isSelected = true

    const pub2 = new Publication('10.1000/pub2')
    pub2.title = 'Publication 2'
    pub2.year = 2015
    pub2.isSelected = false

    const publications = [pub1, pub2]

    const filter = new Filter()
    filter.isActive = false
    filter.yearStart = '2020'

    const doiToIndex = {}
    const nodes = createPublicationNodes(publications, doiToIndex, {
      selectedQueue: queueStore.selectedQueue,
      excludedQueue: queueStore.excludedQueue,
      filter,
      onlyShowFiltered: false
    })

    // When filter is inactive, no publications should be marked as filtered out
    expect(nodes).toHaveLength(2)
    nodes.forEach((node) => {
      expect(node.isFilteredOut).toBe(false)
    })
  })

  it('should not mark any publications as filtered-out when no filters are active', () => {
    const pub1 = new Publication('10.1000/pub1')
    pub1.title = 'Publication 1'
    pub1.year = 2020
    pub1.isSelected = true

    const publications = [pub1]

    const filter = new Filter()
    filter.isActive = true
    // No filter criteria set

    const doiToIndex = {}
    const nodes = createPublicationNodes(publications, doiToIndex, {
      selectedQueue: queueStore.selectedQueue,
      excludedQueue: queueStore.excludedQueue,
      filter,
      onlyShowFiltered: false
    })

    // When no filter criteria are set, no publications should be filtered out
    expect(nodes).toHaveLength(1)
    expect(nodes[0].isFilteredOut).toBe(false)
  })

  it('should work correctly with string filters', () => {
    const pub1 = new Publication('10.1000/pub1')
    pub1.title = 'Machine Learning Advances'
    pub1.year = 2020
    pub1.isSelected = true

    const pub2 = new Publication('10.1000/pub2')
    pub2.title = 'Deep Learning Research'
    pub2.year = 2021
    pub2.isSelected = false

    const pub3 = new Publication('10.1000/pub3')
    pub3.title = 'Computer Vision'
    pub3.year = 2019
    pub3.isSelected = false

    const publications = [pub1, pub2, pub3]

    // Filter by string "Learning"
    const filter = new Filter()
    filter.isActive = true
    filter.string = 'Learning'

    const doiToIndex = {}
    const nodes = createPublicationNodes(publications, doiToIndex, {
      selectedQueue: queueStore.selectedQueue,
      excludedQueue: queueStore.excludedQueue,
      filter,
      onlyShowFiltered: false
    })

    expect(nodes).toHaveLength(3)

    // Publications with "Learning" in title should not be filtered out
    const pub1Node = nodes.find((n) => n.id === pub1.doi)
    const pub2Node = nodes.find((n) => n.id === pub2.doi)
    expect(pub1Node.isFilteredOut).toBe(false)
    expect(pub2Node.isFilteredOut).toBe(false)

    // Publication without "Learning" should be filtered out
    const pub3Node = nodes.find((n) => n.id === pub3.doi)
    expect(pub3Node.isFilteredOut).toBe(true)
  })

  it('should distinguish filtered-out from queuing states', () => {
    // Verify that filtered-out and queueing flags are independent
    const pub1 = new Publication('10.1000/pub1')
    pub1.title = 'Machine Learning'
    pub1.year = 2020
    pub1.isSelected = false

    const pub2 = new Publication('10.1000/pub2')
    pub2.title = 'Computer Vision'
    pub2.year = 2015
    pub2.isSelected = false

    const publications = [pub1, pub2]

    // Add pub1 to selection queue
    queueStore.selectedQueue.push(pub1.doi)

    // Filter by year (only 2020)
    const filter = new Filter()
    filter.isActive = true
    filter.yearStart = '2020'

    const doiToIndex = {}
    const nodes = createPublicationNodes(publications, doiToIndex, {
      selectedQueue: queueStore.selectedQueue,
      excludedQueue: queueStore.excludedQueue,
      filter,
      onlyShowFiltered: false
    })

    expect(nodes).toHaveLength(2)

    // pub1 should be queued but not filtered out (matches filter)
    const pub1Node = nodes.find((n) => n.id === pub1.doi)
    expect(pub1Node.isQueuingForSelected).toBe(true)
    expect(pub1Node.isFilteredOut).toBe(false)

    // pub2 should not be queued but should be filtered out (doesn't match filter)
    const pub2Node = nodes.find((n) => n.id === pub2.doi)
    expect(pub2Node.isQueuingForSelected).toBe(false)
    expect(pub2Node.isFilteredOut).toBe(true)
  })
})
