import { vi } from 'vitest'

/**
 * Shared D3.js mock utilities for network visualization tests
 * Reduces duplication across multiple test files
 */

/**
 * Creates a mock D3 selection with chainable methods
 * @returns {Object} Mock selection object
 */
export const createMockSelection = () => {
  const mockData = []
  return {
    append: vi.fn(() => createMockSelection()),
    attr: vi.fn(() => createMockSelection()),
    select: vi.fn(() => createMockSelection()),
    selectAll: vi.fn(() => createMockSelection()),
    call: vi.fn(() => createMockSelection()),
    data: vi.fn((data) => {
      if (data) {
        // Store the data and return an object with map function for D3 data binding
        return {
          map: vi.fn((fn) => data.map(fn)),
          join: vi.fn(() => createMockSelection()),
          enter: vi.fn(() => createMockSelection()),
          exit: vi.fn(() => createMockSelection()),
          remove: vi.fn(() => createMockSelection())
        }
      }
      return mockData
    }),
    join: vi.fn(() => createMockSelection()),
    enter: vi.fn(() => createMockSelection()),
    exit: vi.fn(() => createMockSelection()),
    remove: vi.fn(() => createMockSelection()),
    merge: vi.fn(() => createMockSelection()),
    style: vi.fn(() => createMockSelection()),
    text: vi.fn(() => createMockSelection()),
    on: vi.fn(() => createMockSelection()),
    classed: vi.fn(() => createMockSelection()),
    filter: vi.fn((filterFn) => {
      // For testing, we'll return selections based on the filter function
      if (typeof filterFn === 'function') {
        // Mock some test data to filter
        const testData = [
          { type: 'publication', id: 'pub1' },
          { type: 'author', id: 'author1', author: { name: 'Test Author' } },
          { type: 'keyword', id: 'keyword1' }
        ]
        const filteredData = testData.filter(filterFn)
        return {
          ...createMockSelection(),
          data: () => filteredData
        }
      }
      return createMockSelection()
    }),
    node: vi.fn(() => ({ getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 100 }) })),
    nodes: vi.fn(() => [])
  }
}

/**
 * Creates a mock D3 force for physics simulations
 * @returns {Object} Mock force object
 */
export const createMockForce = () => ({
  links: vi.fn(() => createMockForce()),
  id: vi.fn(() => createMockForce()),
  distance: vi.fn(() => createMockForce()),
  strength: vi.fn(() => createMockForce())
})

/**
 * Creates a mock D3 force simulation
 * @returns {Object} Mock simulation object
 */
export const createMockSimulation = () => ({
  alphaDecay: vi.fn(() => createMockSimulation()),
  alphaMin: vi.fn(() => createMockSimulation()),
  nodes: vi.fn(() => createMockSimulation()),
  force: vi.fn(() => createMockForce()),
  alpha: vi.fn(() => createMockSimulation()),
  restart: vi.fn(() => createMockSimulation()),
  stop: vi.fn(() => createMockSimulation()),
  on: vi.fn(() => createMockSimulation())
})

/**
 * Creates a complete D3.js module mock
 * Use with vi.mock('d3', () => createD3Mock())
 * @returns {Object} Complete D3 module mock
 */
export const createD3Mock = () => ({
  select: vi.fn(() => createMockSelection()),
  selectAll: vi.fn(() => createMockSelection()),
  zoom: vi.fn(() => ({
    on: vi.fn(() => createMockSelection())
  })),
  zoomTransform: vi.fn(() => ({ k: 1, x: 0, y: 0 })),
  drag: vi.fn(() => {
    const mockDrag = {
      on: vi.fn(() => mockDrag)
    }
    return mockDrag
  }),
  forceSimulation: vi.fn(() => createMockSimulation()),
  forceLink: vi.fn(() => ({
    id: vi.fn(() => ({
      distance: vi.fn(() => ({
        strength: vi.fn(() => ({}))
      }))
    }))
  })),
  forceManyBody: vi.fn(() => ({
    strength: vi.fn(() => ({}))
  })),
  forceX: vi.fn(() => ({
    x: vi.fn(() => ({
      strength: vi.fn(() => ({}))
    }))
  })),
  forceY: vi.fn(() => ({
    y: vi.fn(() => ({
      strength: vi.fn(() => ({}))
    }))
  }))
})

