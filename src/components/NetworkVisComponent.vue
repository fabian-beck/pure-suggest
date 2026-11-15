<script>
import * as d3 from 'd3'
import 'tippy.js/dist/tippy.css'
import { storeToRefs } from 'pinia'

// Stores
import NetworkControls from '@/components/NetworkControls.vue'
import NetworkHeader from '@/components/NetworkHeader.vue'
import NetworkPerformanceMonitor from '@/components/NetworkPerformanceMonitor.vue'
import { useAppState } from '@/composables/useAppState.js'
import { useModalManager } from '@/composables/useModalManager.js'
import { useAuthorStore } from '@/stores/author.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useQueueStore } from '@/stores/queue.js'
import { useSessionStore } from '@/stores/session.js'

// Force simulation utilities
import {
  initializeAuthorNodes,
  updateAuthorNodes,
  highlightAuthorPublications,
  clearAuthorHighlight,
  createAuthorLinks,
  createAuthorNodes
} from '@/utils/network/authorNodes.js'
import {
  assignNodePositions,
  createForceSimulation,
  initializeForces,
  calculateYearX,
  pinTimelineX,
  SIMULATION_ALPHA
} from '@/utils/network/forces.js'

// Node types
import {
  initializeKeywordNodes,
  updateKeywordNodes,
  releaseKeywordPosition,
  highlightKeywordPublications,
  clearKeywordHighlight,
  createKeywordNodeDrag,
  createKeywordLinks,
  createKeywordNodes
} from '@/utils/network/keywordNodes.js'
import {
  updateNetworkLinks,
  calculateLinkPath,
  calculateLinkClasses,
  createCitationLinks
} from '@/utils/network/links.js'
import {
  loadLabelEngine,
  createNodeLabelProblem,
  limitNodeLabels,
  placeNodeLabels,
  renderNodeLabels,
  updateNodeLabelPositions
} from '@/utils/network/nodeLabels.js'
import {
  initializePublicationNodes,
  updatePublicationNodes,
  updateActiveState,
  createPublicationNodes
} from '@/utils/network/publicationNodes.js'

// Links

// Year labels
import { 
  generateYearRange,
  getYearLabelRects,
  updateYearLabelContent, 
  updateYearLabelRects, 
  updateYearLabelTextPositions,
  updateYearLabelVisibility 
} from '@/utils/network/yearLabels.js'

// Components

const LABEL_OVERSCAN = 100 // px beyond the view, about the width of a label
const RESIZE_REPLOT_DELAY = 200 // ms after the last change of the panel size

export default {
  name: 'NetworkVisComponent',
  components: {
    NetworkControls,
    NetworkHeader,
    NetworkPerformanceMonitor
  },
  setup() {
    const sessionStore = useSessionStore()
    const { filter, activePublication } = storeToRefs(sessionStore)
    const interfaceStore = useInterfaceStore()
    const { isNetworkClusters } = storeToRefs(interfaceStore)
    const queueStore = useQueueStore()
    const { selectedQueue, excludedQueue } = storeToRefs(queueStore)
    const authorStore = useAuthorStore()
    const { isEmpty, activatePublicationComponentByDoi, updateQueued } = useAppState()
    const { openAuthorModal } = useModalManager()

    return {
      sessionStore,
      filter,
      activePublication,
      interfaceStore,
      isNetworkClusters,
      queueStore,
      selectedQueue,
      excludedQueue,
      authorStore,
      isEmpty,
      activatePublicationComponentByDoi,
      updateQueued,
      openAuthorModal
    }
  },
  data () {
    return {
      svg: null,
      node: null,
      link: null,
      label: null,
      zoom: null,
      showNodes: ['selected', 'suggested', 'keyword', 'author'],
      errorMessage: '',
      errorTimer: null,
      suggestedNumberFactor: 0.3,
      authorNumberFactor: 0.5,
      labelNumberFactor: 0.3, // Share of the nodes that may get a label at zoom 1 (0: none)
      onlyShowFiltered: false,
      isDragging: false,
      // Graph size for the performance monitor; the graph itself is kept non-reactive
      nodeCount: 0,
      linkCount: 0,
      // Position change detection for performance optimization
      positionThreshold: 1, // pixels - minimum movement to trigger DOM update
      lastUpdateTime: 0
    }
  },
  created() {
    // The simulation and its graph are deliberately not part of data(): d3-force
    // reads and writes node positions many times per tick, and doing that through
    // Vue's reactive proxies makes every tick an order of magnitude slower
    this.simulation = null
    this.graph = { nodes: [], links: [] }
    this.nodeLabel = null
    this.labelResult = null // Previous label placements, kept as warm start for stable labels
    this.labelTickCount = 0
    this.tickCount = 0
    this.labelZoomScale = 1 // Zoom factor of the previous label placement
    this.viewport = { width: 0, height: 0 } // Size of the panel, measured when plotting and on resize
    this.shownYears = { min: undefined, max: undefined } // Range of the year axis
    this.isLabelEngineLoaded = false
  },
  computed: {
    showSelectedNodes () {
      return this.showNodes.includes('selected')
    },
    showSuggestedNodes () {
      return this.showNodes.includes('suggested')
    },
    showKeywordNodes () {
      return this.showNodes.includes('keyword')
    },
    showAuthorNodes () {
      return this.showNodes.includes('author')
    },

    isNetworkActuallyCollapsed () {
      // In wide screen mode or mobile mode, network is never collapsed regardless of store state
      return this.interfaceStore.isNetworkCollapsed && !this.interfaceStore.isWideScreen && !this.interfaceStore.isMobile
    },
  },
  watch: {
    isNetworkClusters: {
      handler () {
        // Skip plotting during loading to prevent premature network rendering
        if (this.interfaceStore.isLoading) {
          return
        }
        this.plot(true)
      }
    },
    filter: {
      deep: true,
      handler () {
        // When filters are cleared, reset onlyShowFiltered to false
        if (!this.sessionStore.filter.hasActiveFilters()) {
          this.onlyShowFiltered = false
        }
        // Skip plotting during loading to prevent premature network rendering
        if (this.interfaceStore.isLoading) {
          return
        }
        this.plot(true)
      }
    },
    activePublication: {
      handler () {
        if (this.interfaceStore.isLoading) {
          return
        }
        // Activation only changes highlighting, not the graph structure, so a
        // full replot with simulation resume is not needed
        this.updateActiveHighlighting()
      }
    },
    selectedQueue: {
      deep: true,
      handler () {
        // Replot when publications are queued for selection
        // Use plot() without restart to avoid simulation restart since structure doesn't change
        if (this.interfaceStore.isLoading) {
          return
        }
        this.plot()
      }
    },
    excludedQueue: {
      deep: true,
      handler () {
        // Replot when publications are queued for exclusion
        // Use plot() without restart to avoid simulation restart since structure doesn't change
        if (this.interfaceStore.isLoading) {
          return
        }
        this.plot()
      }
    },
    'interfaceStore.networkReplotTrigger': {
      handler (newValue, oldValue) {
        // Replot when the trigger value changes
        if (newValue !== oldValue) {
          this.$nextTick(() => {
            // Trigger a full replot with force simulation restart
            this.plot(true)
          })
        }
      }
    },
    labelNumberFactor () {
      this.updateNodeLabels(true)
    },
    'interfaceStore.hoveredPublication': {
      handler () {
        // Update publication highlighting when hover state changes from external components
        this.updatePublicationHighlighting()
      }
    }
  },
  mounted() {
    this.container = document.getElementById('network-svg-container')
    this.svgElement = this.$el.querySelector('#network-svg')
    this.updateViewport()
    this.zoom = d3
      .zoom()
      .on('zoom', (event) => {
        this.svg.attr('transform', event.transform)
        this.updateYearLabelTexts()
        // Labels follow the view and are only placed anew when the zoom ends
        this.updateNodeLabels(false)
      })
      .on('end', (event) => {
        // While the view was only panned, the labels keep their places
        this.updateNodeLabels(true, event.transform.k === this.labelZoomScale)
      })
    this.svg = d3.select('#network-svg').call(this.zoom).select('g')
    this.label = this.svg.append('g').attr('class', 'labels').selectAll('text')
    this.link = this.svg.append('g').attr('class', 'links').selectAll('path')
    this.node = this.svg.append('g').attr('class', 'nodes').selectAll('rect')
    this.nodeLabel = d3.select('#network-svg g.node-labels').selectAll('g')

    // Forces are set when plotting
    this.simulation = createForceSimulation()
      .on('tick', this.tick)
      // The last tick may not have been drawn, and labels are placed on every fourth drawn tick only
      .on('end', () => {
        const changedNodes = this.detectChangedNodes()
        this.updateChangedNodePositions(changedNodes)
        this.updateSelectiveLinks(changedNodes)
        this.updateNodeLabels(true)
      })

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.updateViewport()) {
        return
      }
      this.updateYearLabelTexts()
      // The layout adapts to the new size of the panel once the resizing pauses
      clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => {
        if (this.graph.nodes.length && !this.interfaceStore.isLoading) {
          this.plot(true)
        }
      }, RESIZE_REPLOT_DELAY)
    })
    this.resizeObserver.observe(this.svgElement)

    loadLabelEngine()
      .then(() => {
        this.isLabelEngineLoaded = true
        this.updateNodeLabels(true)
      })
      .catch((error) => console.error(`Cannot load network label engine: ${error.message}`))

    // Set initial state of "only show filtered" based on whether filters are active
    this.onlyShowFiltered = this.sessionStore.filter.hasActiveFilters()
  },
  beforeUnmount() {
    this.resizeObserver.disconnect()
    clearTimeout(this.resizeTimer)
    // Cleanup D3 simulation (moved from useNetworkSimulation)
    if (this.simulation) {
      this.simulation.stop()
      this.simulation = null
    }
  },
  methods: {
    /**
     * Collect and filter publications based on current settings
     * @returns {Array} Array of filtered publications
     */
    collectFilteredPublications () {
      let publications = []

      if (this.showSelectedNodes) {
        let selectedPubs = this.sessionStore.selectedPublications || []
        if (
          this.onlyShowFiltered &&
          this.sessionStore.filter.hasActiveFilters() &&
          this.sessionStore.filter.applyToSelected
        ) {
          selectedPubs = selectedPubs.filter((pub) => this.sessionStore.filter.matches(pub))
        }
        publications = publications.concat(selectedPubs)
      }

      if (this.showSuggestedNodes) {
        let suggestedPubs = this.sessionStore.suggestedPublications || []
        // Filter first if needed
        if (
          this.onlyShowFiltered &&
          this.sessionStore.filter.hasActiveFilters() &&
          this.sessionStore.filter.applyToSuggested
        ) {
          suggestedPubs = suggestedPubs.filter((pub) => this.sessionStore.filter.matches(pub))
        }
        // Then slice to limit to top N from filtered results
        suggestedPubs = suggestedPubs.slice(0, Math.round(this.suggestedNumberFactor * 50))
        publications = publications.concat(suggestedPubs)
      }

      return publications
    },
    
    /**
     * Initialize graph nodes and links
     */
    initNetworkGraph () {
      // Initialize DOI to index mapping
      const doiToIndex = {}

      // Filter authors based on factor
      const allAuthors = this.authorStore.selectedPublicationsAuthors || []
      const filteredAuthors = allAuthors.slice(
        0,
        this.authorNumberFactor * this.sessionStore.selectedPublications.length
      )

      // Get filtered publications
      const publications = this.collectFilteredPublications()
      const years = publications.map((publication) => publication.year).filter(Boolean)
      this.shownYears = years.length
        ? { min: Math.min(...years), max: Math.max(...years) }
        : { min: undefined, max: undefined }

      // Create nodes
      let nodes = []

      // Create publication nodes
      const publicationNodes = createPublicationNodes(publications, doiToIndex, {
        selectedQueue: this.queueStore.selectedQueue || [],
        excludedQueue: this.queueStore.excludedQueue || [],
        filter: this.sessionStore.filter,
        onlyShowFiltered: this.onlyShowFiltered
      })
      nodes = nodes.concat(publicationNodes)

      // Create keyword nodes
      if (this.showKeywordNodes) {
        const keywordNodes = createKeywordNodes(
          this.sessionStore.uniqueBoostKeywords || [],
          this.sessionStore.publications || []
        )
        nodes = nodes.concat(keywordNodes)
      }

      // Create author nodes
      if (this.showAuthorNodes) {
        const authorNodes = createAuthorNodes(filteredAuthors, publications)
        nodes = nodes.concat(authorNodes)
      }

      // Create links
      const links = []

      // Create keyword links
      if (this.showKeywordNodes) {
        const keywordLinks = createKeywordLinks(
          this.sessionStore.uniqueBoostKeywords || [],
          publications,
          doiToIndex
        )
        links.push(...keywordLinks)
      }

      // Create citation links
      const citationLinks = createCitationLinks(
        this.sessionStore.selectedPublications || [],
        this.sessionStore.isSelected || (() => false),
        doiToIndex
      )
      links.push(...citationLinks)

      // Create author links
      if (this.showAuthorNodes) {
        const authorLinks = createAuthorLinks(filteredAuthors, publications, doiToIndex)
        links.push(...authorLinks)
      }

      // Store nodes and links for later processing (after updateNodes initializes this.node)
      this.tempNodes = nodes
      this.tempLinks = links.map((d) => Object.assign({}, d))

      // Update component state
      this.doiToIndex = doiToIndex
      this.filteredAuthors = filteredAuthors
    },

    /**
     * Update network nodes with current data
     */
    updateNetworkNodes () {
      // Preserve existing node positions for smooth transitions
      const existingNodeData =
        this.node && typeof this.node.data === 'function' ? this.node.data() : null
      const processedNodes = assignNodePositions(this.tempNodes, existingNodeData, this.tempLinks)
      const processedLinks = this.tempLinks

      // Update simulation graph data
      this.graph.nodes = processedNodes
      this.graph.links = processedLinks

      this.node = this.node
        .data(this.graph.nodes, (d) => d.id)
        .join((enter) => {
          const g = enter.append('g').attr('class', (d) => `node-container ${d.type}`)

          // Initialize publication nodes using module
          const publicationNodes = initializePublicationNodes(g)
          
          // Add event handlers to publication nodes
          publicationNodes
            .select('rect')
            .on('click', this.activatePublication)
            .on('mouseover', this.onPublicationNodeMouseover)
            .on('mouseout', this.onPublicationNodeMouseout)

          // Initialize keyword nodes using module
          const keywordNodes = initializeKeywordNodes(g)
          
          // Add event handlers to keyword nodes
          keywordNodes
            .call(this.keywordNodeDrag())
            .on('click', this.keywordNodeClick)
            .on('mouseover', this.onKeywordNodeMouseover)
            .on('mouseout', this.onKeywordNodeMouseout)

          // Initialize author nodes using module
          const authorNodes = initializeAuthorNodes(g)
          
          // Add event handlers to author nodes
          authorNodes
            .on('mouseover', this.onAuthorNodeMouseover)
            .on('mouseout', this.onAuthorNodeMouseout)
            .on('click', this.authorNodeClick)

          return g
        })
      try {
        // Update publication nodes using module
        const publicationResult = updatePublicationNodes(
          this.node,
          this.sessionStore.activePublication,
          this.publicationTooltips
        )
        this.publicationTooltips = publicationResult.tooltips
      } catch (error) {
        throw new Error(`Cannot update publication nodes in network: ${error.message}`, {
          cause: error
        })
      }
      try {
        // Update keyword nodes using module
        const keywordResult = updateKeywordNodes(
          this.node,
          this.sessionStore.activePublication,
          this.keywordTooltips
        )
        this.keywordTooltips = keywordResult.tooltips
      } catch (error) {
        throw new Error(`Cannot update keyword nodes in network: ${error.message}`, {
          cause: error
        })
      }
      try {
        // Update author nodes using module
        const authorResult = updateAuthorNodes(
          this.node,
          this.sessionStore.activePublication,
          this.authorTooltips
        )
        this.authorTooltips = authorResult.tooltips
      } catch (error) {
        throw new Error(`Cannot update author nodes in network: ${error.message}`, {
          cause: error
        })
      }
    },

    plot (restart) {
      if (this.isDragging) {
        // During dragging, we want full simulation restart for responsive layout
        // Skip the expensive graph reconstruction but restart simulation with current graph
        if (restart) {
          this.restart(SIMULATION_ALPHA)
        } else {
          this.start()
        }
        return
      }

      // Skip plotting when network is collapsed for performance
      if (this.isNetworkActuallyCollapsed) {
        return
      }

      // Early return if app state is empty - no need to run simulation
      if (this.isEmpty || !this.sessionStore.selectedPublications?.length) {
        this.stop() // Stop any running simulation
        this.clearExistingVisualization() // Clear any existing network elements
        this.resetOptimizationMetrics()
        return
      }

      // The panel may have changed its size since the resize observer last reported
      this.updateViewport()
      if (!this.viewport.width || !this.viewport.height) {
        return
      }

      try {
        initializeForces(
          this.simulation,
          this.isNetworkClusters,
          this.sessionStore.selectedPublications.length,
          this.viewport
        )

        this.initNetworkGraph()

        this.updateNetworkNodes()

        this.link = updateNetworkLinks(this.link, this.graph.links)

        // Update year labels
        const hasPublications = this.sessionStore.publicationsFiltered?.length > 0
        const shouldShow = hasPublications && !this.isEmpty && !this.isNetworkClusters

        if (shouldShow) {
          const yearRange = generateYearRange(this.shownYears.min, this.shownYears.max)

          this.label = updateYearLabelContent(this.label, yearRange)
          updateYearLabelRects(this.label, this.yearX)
          updateYearLabelVisibility(this.label, true, this.yearX)
          this.updateYearLabelTexts()
        } else if (this.label) {
          this.label.selectAll('text, rect').attr('visibility', 'hidden')
        }

        // Update graph data in simulation
        this.updateGraphData(this.graph.nodes, this.graph.links)
        // Link classes need the link ends resolved to nodes by the simulation
        this.link.attr('class', (d) => calculateLinkClasses(d, this.sessionStore.activePublication))

        // Reset position tracking and optimization metrics when plot is called
        this.resetOptimizationMetrics()

        if (restart) {
          this.restart(SIMULATION_ALPHA)
        } else {
          this.start()
        }
      } catch (error) {
        console.error(`Cannot plot network: ${  error.message}`)
        this.errorMessage = 'Sorry, an error occurred while plotting the citation network.'
        if (this.errorTimer) {
          clearTimeout(this.errorTimer)
        }
        this.errorTimer = setTimeout(() => {
          this.errorMessage = ''
        }, 10000)
      }

    },
    /**
     * Check if current tick should be skipped for performance optimization
     * @returns {boolean} true if tick should be skipped, false otherwise
     */
    shouldSkipCurrentTick() {
      // Skip when network is collapsed for performance
      if (this.isNetworkActuallyCollapsed) {
        return true
      }

      // Early return if graph is empty - no nodes to update
      if (!this.graph.nodes || this.graph.nodes.length === 0) {
        this.$refs.performanceMonitor?.trackFps() // Still track FPS for debugging
        return true
      }

      this.$refs.performanceMonitor?.incrementTick()

      // Skip every second DOM update tick for performance (but not when dragging)
      if (!this.isDragging && ++this.tickCount % 2 === 0) {
        this.$refs.performanceMonitor?.recordTickSkipped()
        this.$refs.performanceMonitor?.trackFps() // Still track FPS for debugging
        return true
      }

      return false // Don't skip this tick
    },

    tick () {
      // Check if this tick should be skipped for performance
      if (this.shouldSkipCurrentTick()) {
        return
      }

      // Check which nodes have moved significantly and get the changed nodes
      const changedNodes = this.detectChangedNodes()

      // Only update positions of changed nodes (not all nodes)
      if (changedNodes.length > 0) {
        this.updateChangedNodePositions(changedNodes)
        const linksUpdated = this.updateSelectiveLinks(changedNodes)
        this.lastUpdateTime = performance.now()

        // Labels follow their nodes and are placed anew every fourth update
        this.updateNodeLabels(this.labelTickCount++ % 4 === 0)

        // Track performance metrics - only count actual DOM updates
        this.$refs.performanceMonitor?.recordDomUpdate(changedNodes.length, linksUpdated)
      } else {
        // No nodes moved significantly, but we still processed the tick
        this.$refs.performanceMonitor?.recordSkippedUpdate()
      }

      // FPS tracking (always track for debugging)
      this.$refs.performanceMonitor?.trackFps()
    },
    keywordNodeDrag () {
      return createKeywordNodeDrag(this, SIMULATION_ALPHA)
    },
    keywordNodeClick (event, d) {
      releaseKeywordPosition(event, d, this, SIMULATION_ALPHA)
    },
    onPublicationNodeMouseover (event, d) {
      this.interfaceStore.setHoveredPublication(d.publication)
    },
    onPublicationNodeMouseout () {
      this.interfaceStore.setHoveredPublication(null)
    },
    onKeywordNodeMouseover (event, d) {
      highlightKeywordPublications(d, this.sessionStore.publicationsFiltered || [])
      this.updatePublicationHighlighting()
    },
    onKeywordNodeMouseout () {
      clearKeywordHighlight(this.sessionStore.publicationsFiltered || [])
      this.updatePublicationHighlighting()
    },
    onAuthorNodeMouseover (event, d) {
      highlightAuthorPublications(d, this.sessionStore.publicationsFiltered || [])
      this.updatePublicationHighlighting()
    },
    onAuthorNodeMouseout () {
      clearAuthorHighlight(this.sessionStore.publicationsFiltered || [])
      this.updatePublicationHighlighting()
    },
    authorNodeClick (event, d) {
      this.openAuthorModal(d.author.id)
    },
    yearX (year) {
      return calculateYearX(year, this.shownYears.min, this.viewport.width)
    },
    activatePublication (event, d) {
      this.activatePublicationComponentByDoi(d.publication.doi)
      event.stopPropagation()
    },
    toggleMode() {
      this.isNetworkClusters = !this.isNetworkClusters
    },
    expandNetwork(isNetworkExpanded) {
      this.interfaceStore.isNetworkExpanded = isNetworkExpanded
    },
    collapseNetwork() {
      this.interfaceStore.collapseNetwork()
    },
    restoreNetwork() {
      this.interfaceStore.restoreNetwork()
      // Trigger a plot update when restoring from collapsed state
      // to ensure the network is up to date
      this.$nextTick(() => {
        this.plot(true)
      })
    },
    zoomByFactor(factor) {
      d3.select('#network-svg').call(this.zoom.scaleBy, factor)
    },
    resetZoom() {
      const svg = d3.select('#network-svg')
      const transform = d3.zoomIdentity
      svg.transition().duration(750).call(this.zoom.transform, transform)
    },
    /**
     * Measure the panel and fit the view box to it (one unit per pixel, origin centered),
     * so that the layout can fill the panel at any aspect ratio; true if the size changed
     */
    updateViewport() {
      const { clientWidth: width, clientHeight: height } = this.container
      if (width === this.viewport.width && height === this.viewport.height) {
        return false
      }
      this.viewport = { width, height }
      d3.select(this.svgElement).attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`)
      return true
    },

    updateGraphData(nodes, links) {
      this.graph.nodes = nodes
      this.graph.links = links
      this.nodeCount = nodes.length
      this.linkCount = links.length
      pinTimelineX(nodes, this.isNetworkClusters, this.yearX)

      if (this.simulation) {
        this.simulation.nodes(nodes)
        const linkForce = this.simulation.force('link')
        if (linkForce && linkForce.links) {
          linkForce.links(links)
        }
      }
    },

    restart(alpha = SIMULATION_ALPHA) {
      if (this.simulation) {
        this.simulation.alpha(alpha).restart()
      }
    },

    start() {
      if (this.simulation) {
        this.simulation.restart()
      }
    },

    stop() {
      if (this.simulation) {
        this.simulation.stop()
      }
    },

    // Keep the year labels at the top and bottom border of the view
    updateYearLabelTexts() {
      updateYearLabelTextPositions(
        this.label,
        this.viewport.height,
        d3.zoomTransform(this.svgElement)
      )
    },

    /**
     * Move the node labels to the current node positions, or place them anew (solve);
     * with pin, existing labels stay exactly where they are and labels are only added
     */
    updateNodeLabels(solve, pin = false) {
      const { width, height } = this.viewport
      if (!this.isLabelEngineLoaded || !width || !this.graph.nodes.length) {
        return
      }
      // Maps layout coordinates onto the visible viewport (origin top-left)
      const zoomTransform = d3.zoomTransform(this.svgElement)
      const viewTransform = d3.zoomIdentity
        .translate(zoomTransform.x + width / 2, zoomTransform.y + height / 2)
        .scale(zoomTransform.k)

      if (!this.labelNumberFactor) {
        this.nodeLabel = this.nodeLabel.data([]).join('g')
        this.labelResult = null
        return
      }

      let result = null
      if (solve) {
        const { k, x, y } = viewTransform
        const problem = createNodeLabelProblem(this.graph.nodes, this.graph.links, k)
        // The share of labeled nodes grows with the zoomed area: zooming in shows more
        // labels, and it does not change while the view is panned
        limitNodeLabels(
          problem,
          Math.ceil(Math.min(1, this.labelNumberFactor * k * k) * problem.items.length)
        )
        // The view is a window on the network: labels are also placed in the overscan
        // around it, so that they keep their places at the border when the view moves;
        // nodes farther out are passed as marks that these labels keep off
        problem.items = problem.items.filter(({ anchor }) => {
          const [canvasX, canvasY] = viewTransform.apply([anchor.x, anchor.y])
          return (
            canvasX >= -3 * LABEL_OVERSCAN &&
            canvasX <= width + 3 * LABEL_OVERSCAN &&
            canvasY >= -3 * LABEL_OVERSCAN &&
            canvasY <= height + 3 * LABEL_OVERSCAN
          )
        })
        problem.canvas = { width, height, overscan: LABEL_OVERSCAN }
        problem.transform = [k, 0, 0, k, x, y]
        if (this.labelResult) {
          problem.warm_start = { placements: this.labelResult.placements, pin }
        }
        this.labelZoomScale = k
        if (!this.isNetworkClusters) {
          problem.obstacles.vector.push({
            class: 'text',
            rects: getYearLabelRects(
              generateYearRange(this.shownYears.min, this.shownYears.max),
              this.yearX,
              height,
              zoomTransform
            )
          })
        }
        result = placeNodeLabels(problem)
      }
      if (result) {
        this.labelResult = result
        this.nodeLabel = renderNodeLabels(
          this.nodeLabel,
          result,
          this.graph.nodes,
          this.sessionStore.activePublication
        )
        d3.select('#network-svg g.node-labels').attr(
          'transform',
          `translate(${-width / 2}, ${-height / 2})`
        )
      } else {
        updateNodeLabelPositions(this.nodeLabel, viewTransform)
      }
    },

    setDragging(dragging) {
      this.isDragging = dragging
    },

    // Position change detection methods
    detectChangedNodes() {
      if (!this.graph.nodes || this.graph.nodes.length === 0) {
        return []
      }

      const changedNodes = []

      // Check each node for significant position changes
      for (const node of this.graph.nodes) {
        const currentX = node.x || 0
        const currentY = node.y || 0

        // Initialize last positions if not set
        if (node._lastDisplayX === undefined || node._lastDisplayY === undefined) {
          node._lastDisplayX = currentX
          node._lastDisplayY = currentY
          changedNodes.push(node) // First render
          continue
        }

        // Calculate movement distance
        const deltaX = Math.abs(currentX - node._lastDisplayX)
        const deltaY = Math.abs(currentY - node._lastDisplayY)

        // Check if movement exceeds threshold
        if (deltaX > this.positionThreshold || deltaY > this.positionThreshold) {
          changedNodes.push(node)
          // Update last positions
          node._lastDisplayX = currentX
          node._lastDisplayY = currentY
        }
      }

      return changedNodes
    },

    resetPositionTracking() {
      if (this.graph.nodes) {
        this.graph.nodes.forEach((node) => {
          delete node._lastDisplayX
          delete node._lastDisplayY
        })
      }
    },

    resetOptimizationMetrics() {
      this.$refs.performanceMonitor?.resetMetrics() // Reset performance metrics
      this.resetPositionTracking()
    },

    clearExistingVisualization() {
      // Clear all existing network elements from the DOM
      try {
        if (this.node) {
          this.node.remove()
        }
        if (this.link) {
          this.link.remove()
        }
        if (this.label) {
          this.label.remove()
        }
        if (this.nodeLabel) {
          // Including labels that are still fading out
          d3.select('#network-svg g.node-labels').selectAll('g').remove()
          this.nodeLabel = d3.select('#network-svg g.node-labels').selectAll('g')
          this.labelResult = null
        }

        // Clear graph data
        this.graph = { nodes: [], links: [] }
        this.nodeCount = 0
        this.linkCount = 0

        // Clear the SVG container
        if (this.svg && typeof this.svg.select === 'function') {
          this.svg.select('g').selectAll('*').remove()
        }

        // Reinitialize empty D3 selections (same as mounted hook)
        if (this.svg) {
          this.label = this.svg.append('g').attr('class', 'labels').selectAll('text')
          this.link = this.svg.append('g').attr('class', 'links').selectAll('path')
          this.node = this.svg.append('g').attr('class', 'nodes').selectAll('rect')
        }
      } catch (error) {
        console.warn('Error clearing visualization:', error.message)
        // Ensure clean state even if clearing fails
        this.graph = { nodes: [], links: [] }
        this.nodeCount = 0
        this.linkCount = 0
        // Try to reinitialize basic selections
        if (this.svg) {
          try {
            this.label = this.svg.append('g').attr('class', 'labels').selectAll('text')
            this.link = this.svg.append('g').attr('class', 'links').selectAll('path')
            this.node = this.svg.append('g').attr('class', 'nodes').selectAll('rect')
          } catch (reinitError) {
            console.warn('Could not reinitialize D3 selections:', reinitError.message)
          }
        }
      }
    },

    updateChangedNodePositions(changedNodes) {
      if (!changedNodes.length) return

      // Create a Set of changed node IDs for fast lookup
      const changedNodeIds = new Set(changedNodes.map((node) => node.id))

      // Filter nodes that have changed and update only their positions
      const changedNodeSelection = this.node.filter(function (d) {
        return changedNodeIds.has(d.id)
      })

      changedNodeSelection.attr('transform', (d) => `translate(${d.x}, ${d.y})`)
    },

    updateSelectiveLinks(changedNodes) {
      if (!changedNodes.length) return 0

      // Create a Set of changed node IDs for fast lookup
      const changedNodeIds = new Set(changedNodes.map((node) => node.id))

      // Filter links that are connected to any changed node
      const affectedLinks = this.link.filter(function (d) {
        return changedNodeIds.has(d.source.id) || changedNodeIds.has(d.target.id)
      })

      affectedLinks.attr('d', calculateLinkPath)

      // Return how many links were updated
      return affectedLinks.size()
    },

    /**
     * Lightweight method to update only publication node highlighting without full re-render.
     * This avoids expensive plot() calls and simulation restarts for pure visual highlighting.
     */
    updatePublicationHighlighting() {
      // Only update publication node highlighting if nodes exist
      if (this.node) {
        this.node
          .filter((d) => d.type === 'publication')
          .classed(
            'is-hovered',
            (d) => this.interfaceStore.hoveredPublication === d.publication.doi
          )
          .classed('is-keyword-hovered', (d) => d.publication.isKeywordHovered)
          .classed('is-author-hovered', (d) => d.publication.isAuthorHovered)
      }
    },

    /**
     * Lightweight update when the active publication changes: refreshes highlight
     * classes, node sizes, and link styles without a full replot or simulation restart.
     */
    updateActiveHighlighting() {
      if (!this.node || !this.link) {
        return
      }
      const activePublication = this.sessionStore.activePublication
      try {
        updateActiveState(this.node, activePublication)
        this.keywordTooltips = updateKeywordNodes(
          this.node,
          activePublication,
          this.keywordTooltips
        ).tooltips
        this.authorTooltips = updateAuthorNodes(
          this.node,
          activePublication,
          this.authorTooltips
        ).tooltips
        this.link.attr('class', (d) => calculateLinkClasses(d, activePublication))
        this.updateNodeLabels(true)
      } catch (error) {
        console.error(`Cannot update active highlighting in network: ${error.message}`)
      }
    }
  }
}
</script>

<template>
  <div class="network-of-references">
    <div class="box has-background-grey">
      <NetworkHeader
        :error-message="errorMessage"
        :has-no-content="isEmpty.value"
        v-model:is-network-clusters="isNetworkClusters"
        @expand-network="expandNetwork"
        @collapse-network="collapseNetwork"
        @restore-network="restoreNetwork"
      />
      <div id="network-svg-container" v-show="!isNetworkActuallyCollapsed">
        <NetworkPerformanceMonitor
          ref="performanceMonitor"
          :show="interfaceStore.showPerformancePanel"
          :is-empty="isEmpty.value || !sessionStore.selectedPublications?.length"
          :node-count="nodeCount"
          :link-count="linkCount"
        />
        <svg id="network-svg">
          <defs>
            <!-- Blends each color channel 50% toward white: same visual result as
                 50% opacity over a white background, but the node stays opaque so
                 edges don't shine through -->
            <filter id="filtered-out-lighten" color-interpolation-filters="sRGB">
              <feComponentTransfer>
                <feFuncR type="linear" slope="0.5" intercept="0.5" />
                <feFuncG type="linear" slope="0.5" intercept="0.5" />
                <feFuncB type="linear" slope="0.5" intercept="0.5" />
              </feComponentTransfer>
            </filter>
          </defs>
          <g></g>
          <g class="node-labels"></g>
        </svg>
      </div>
      <ul class="publication-component-list" v-show="!isNetworkActuallyCollapsed">
        <PublicationComponent
          v-if="activePublication && interfaceStore.isNetworkExpanded"
          :publication="activePublication"
          is-active
          :publication-type="activePublication.isSelected ? 'selected' : 'suggested'"
        ></PublicationComponent>
      </ul>
      <div class="controls-header-left" v-show="!isNetworkActuallyCollapsed">
        <v-btn
          class="has-background-primary has-text-white"
          @click="updateQueued"
          v-show="queueStore.isUpdatable && interfaceStore.isNetworkExpanded"
          id="quick-access-update"
        >
          <v-icon left>mdi-update</v-icon>
          <span class="key">U</span>pdate
        </v-btn>
      </div>
      <NetworkControls
        v-model:show-nodes="showNodes"
        v-model:only-show-filtered="onlyShowFiltered"
        v-model:suggested-number-factor="suggestedNumberFactor"
        v-model:author-number-factor="authorNumberFactor"
        v-model:label-number-factor="labelNumberFactor"
        @zoom="zoomByFactor"
        @reset="resetZoom"
        @plot="plot"
        v-show="!isNetworkActuallyCollapsed && !isEmpty"
      />
    </div>
  </div>
</template>

<style lang="scss">
.network-of-references {
  & .box {
    height: 100%;
    display: grid;
    grid-template-rows: max-content auto;
    position: relative;

    & ul.publication-component-list {
      position: absolute;
      bottom: 1vw;
      left: 1vw;
      width: 50%;
      max-width: 50rem;
      min-width: 40rem;
      background: white;
    }

    & .controls-header-left {
      position: absolute;
      top: calc(1vw + 2.5rem);
      left: 1vw;
    }
  }
}

#network-svg-container {
  overflow: hidden;
  position: relative;
}

#network-svg {
  background: white;
  // Out of the flow: as its view box follows the measured size of the panel, its intrinsic
  // height would otherwise let the panel grow with every measurement
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;

  & g:focus {
    outline: none;
  }

  & g.publication.node-container {
    cursor: pointer;

    & rect {
      cursor: pointer;
      stroke-width: 2;
    }

    & circle {
      fill: var(--bulma-warning);
      stroke-width: 1;
    }

    & text {
      text-anchor: middle;
      dominant-baseline: middle;
      // Stroke halo instead of a drop-shadow filter: filters are re-rasterized
      // for every moving node on every simulation frame
      paint-order: stroke;
      stroke: white;
      stroke-width: 1px;
      stroke-linejoin: round;

      &.unread {
        fill: hsl(var(--bulma-info-h), var(--bulma-info-s), calc(var(--bulma-info-l) - 20%));
        font-weight: 1000;
      }

      &.labelQueuingForSelected,
      &.labelQueuingForExcluded {
        visibility: hidden;
        font-weight: 1000;
      }
    }

    &.is-hovered {
      & rect,
      & circle {
        transform: scale(1.1);
        animation: node-pulse 2s ease-in-out infinite;
      }
    }

    &.selected {
      & rect,
      & circle {
        stroke: var(--bulma-primary);
      }
    }

    &.suggested {
      & rect,
      & circle {
        stroke: var(--bulma-info);
      }
    }

    &.active rect {
      stroke-width: 6;
    }

    &.linkedToActive rect {
      stroke-width: 4;
    }

    &.non-active {
      opacity: 0.3;
    }

    &.is-keyword-hovered rect {
      filter: drop-shadow(0px 0px 10px var(--bulma-warning));
      stroke: hsl(
        var(--bulma-warning-h),
        var(--bulma-warning-s),
        calc(var(--bulma-warning-l) - 20%)
      );
    }

    &.is-author-hovered rect {
      filter: drop-shadow(0px 0px 10px black);
      stroke: black;
    }

    &.queuingForSelected,
    &.queuingForExcluded {
      opacity: 0.5;
      filter: blur(0.5px);
    }

    &.queuingForSelected text.labelQueuingForSelected {
      visibility: visible;
      fill: hsl(var(--bulma-primary-h), var(--bulma-primary-s), calc(var(--bulma-primary-l) - 20%));
    }

    &.queuingForExcluded text.labelQueuingForExcluded {
      visibility: visible;
    }

    &.filtered-out {
      filter: url(#filtered-out-lighten) blur(0.5px);
    }
  }

  & g.keyword.node-container {
    cursor: grab;

    & text {
      text-anchor: middle;
      transform: translate(0px, 4px);
      paint-order: stroke;
      stroke: var(--bulma-warning);
      stroke-width: 3px;
      stroke-opacity: 0.5;
      stroke-linejoin: round;
    }

    &.fixed text {
      font-weight: 700;
    }

    &.linkedToActive text {
      text-decoration-line: underline;
    }

    &.non-active {
      opacity: 0.3;
    }

    &:hover text {
      transform: translate(0px, 3.5px) scale(1.1);
    }
  }

  & g.author.node-container {
    cursor: pointer;

    & circle {
      fill: black;
    }

    & text {
      text-anchor: middle;
      dominant-baseline: middle;
      fill: white;
      font-size: 0.85rem;
      font-weight: 600;
      transform: translate(0px, 1px);

      &.long {
        font-size: 0.7rem;
      }

      &.very-long {
        font-size: 0.6rem;
      }
    }

    &.non-active {
      opacity: 0.3;
    }

    &:hover {
      & circle {
        transform: scale(1.1);
        animation: author-node-pulse 2s ease-in-out infinite;
      }
    }
  }

  & g.node-label {
    pointer-events: none;

    & text {
      paint-order: stroke;
      stroke: white;
      stroke-width: 3px;
      stroke-linejoin: round;
    }

    & path {
      fill: none;
      stroke: grey;
      stroke-width: 1;
    }

    // On the children, as the opacity of the label itself fades it in and out
    &.non-active > * {
      opacity: 0.3;
    }

    &.selected text {
      fill: hsl(var(--bulma-primary-h), var(--bulma-primary-s), calc(var(--bulma-primary-l) - 25%));
    }

    &.suggested text {
      fill: hsl(var(--bulma-info-h), var(--bulma-info-s), calc(var(--bulma-info-l) - 25%));
    }
  }

  & path.citation {
    fill: none;
    stroke-width: 3;
    stroke: var(--bulma-primary);
    opacity: 0.15;

    &.external {
      stroke-width: 2;
      stroke: var(--bulma-info);
      opacity: 0.1;
    }

    &.active {
      opacity: 0.5;
    }

    &.non-active {
      opacity: 0.05;
    }
  }

  & path.keyword {
    fill: var(--bulma-warning);
    opacity: 0.2;

    &.active {
      opacity: 0.5;
    }

    &.non-active {
      opacity: 0.05;
    }
  }

  & path.author {
    opacity: 0.2;

    &.active {
      opacity: 0.5;
    }

    &.non-active {
      opacity: 0.05;
    }
  }
}

@keyframes node-pulse {
  0%,
  100% {
    transform: scale(0.9);
  }

  50% {
    transform: scale(1.15);
  }
}

@keyframes author-node-pulse {
  0%,
  100% {
    transform: scale(0.9);
  }

  50% {
    transform: scale(1.15);
  }
}

@media screen and (max-width: 1023px) {
  .network-of-references {
    padding: 0 !important;
  }

  .network-of-references .box {
    padding: 0.5rem;
  }
}
</style>
