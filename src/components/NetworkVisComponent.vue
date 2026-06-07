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
  createForceSimulation,
  initializeForces,
  calculateYearX,
  SIMULATION_ALPHA,
  getNodeXPosition
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
  initializePublicationNodes,
  updatePublicationNodes,
  createPublicationNodes
} from '@/utils/network/publicationNodes.js'

// Links

// Year labels
import { 
  generateYearRange, 
  updateYearLabelContent, 
  updateYearLabelRects, 
  updateYearLabelVisibility 
} from '@/utils/network/yearLabels.js'

// Components

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
      svgWidth: Number,
      svgHeight: Number,
      node: null,
      link: null,
      label: null,
      zoom: null,
      showNodes: ['selected', 'suggested', 'keyword', 'author'],
      errorMessage: '',
      errorTimer: null,
      suggestedNumberFactor: 0.3,
      authorNumberFactor: 0.5,
      onlyShowFiltered: false,
      // D3 simulation state (moved from useNetworkSimulation)
      simulation: null,
      isDragging: false,
      graph: { nodes: [], links: [] },
      // Position change detection for performance optimization
      positionThreshold: 1, // pixels - minimum movement to trigger DOM update
      lastUpdateTime: 0,
      skipEarlyTicks: 50, // Skip DOM updates for first N ticks
      shouldSkipEarlyTicks: false, // Only skip when truly restarted with high alpha
      // X position caching for performance optimization
      nodeXPositionsCache: new Map(), // Cache X positions to avoid redundant calculations
      // Reactive tick count for CSS animation control
      currentTickCount: 0, // Synchronized with performance monitor
      resizeObserver: null,
      resizeTimer: null,
      // Auto-fit: scale & center the content to fill the container after a (re)plot
      pendingFit: false,
      fitFallbackTimer: null
    }
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

    networkCssClasses () {
      // Check if we should show fading animation during early tick skipping (but not when dragging)
      if (
        this.shouldSkipEarlyTicks &&
        !this.isDragging &&
        this.currentTickCount <= this.skipEarlyTicks
      ) {
        return 'network-fading'
      } else {
        return 'network-visible'
      }
    }
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
        this.plot()
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
    'interfaceStore.hoveredPublication': {
      handler () {
        // Update publication highlighting when hover state changes from external components
        this.updatePublicationHighlighting()
      }
    }
  },
  mounted() {
    const container = document.getElementById('network-svg-container')
    this.svgWidth = container.clientWidth
    // Use the actual container height so the map fills its (large, central) panel.
    // Fall back to a wide aspect ratio if the container has not been laid out yet.
    this.svgHeight = container.clientHeight || this.svgWidth / 5
    // set viewbox to center
    d3.select('#network-svg').attr(
      'viewBox',
      `${-this.svgWidth / 2} ${-this.svgHeight / 2} ${this.svgWidth} ${this.svgHeight}`
    )
    this.zoom = d3.zoom().on('zoom', (event) => {
      this.svg.attr('transform', event.transform)
    })
    this.svg = d3.select('#network-svg').call(this.zoom).select('g')
    this.label = this.svg.append('g').attr('class', 'labels').selectAll('text')
    this.link = this.svg.append('g').attr('class', 'links').selectAll('path')
    this.node = this.svg.append('g').attr('class', 'nodes').selectAll('rect')

    // Initialize D3 simulation
    this.initializeSimulation({
      svgWidth: this.svgWidth,
      svgHeight: this.svgHeight,
      isMobile: this.interfaceStore.isMobile,
      isNetworkClusters: this.isNetworkClusters,
      selectedPublicationsCount: this.sessionStore.selectedPublications.length,
      tickHandler: this.tick
    })

    // Set initial state of "only show filtered" based on whether filters are active
    this.onlyShowFiltered = this.sessionStore.filter.hasActiveFilters()

    // Keep the map adapted to its container size (debounced). Replotting preserves zoom.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.resizeTimer) clearTimeout(this.resizeTimer)
        this.resizeTimer = setTimeout(() => {
          if (this.interfaceStore.isLoading || this.isEmpty) return
          if (this.syncContainerSize()) {
            this.plot()
          }
        }, 200)
      })
      this.resizeObserver.observe(container)
    }
  },
  beforeUnmount() {
    // Cleanup D3 simulation (moved from useNetworkSimulation)
    if (this.simulation) {
      this.simulation.stop()
      this.simulation = null
    }
    if (this.resizeTimer) clearTimeout(this.resizeTimer)
    if (this.fitFallbackTimer) clearTimeout(this.fitFallbackTimer)
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
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
      const processedNodes = this.preserveNodePositions(this.tempNodes, existingNodeData)
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
            .select('circle.node-shape')
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

      try {
        // Refresh SVG dimensions/viewBox from the current container size so the map
        // adapts to its container (e.g. after pressing Update). Does not touch zoom.
        this.syncContainerSize()

        // Update simulation configuration
        this.updateSimulation({
          svgWidth: this.svgWidth,
          svgHeight: this.svgHeight,
          isMobile: this.interfaceStore.isMobile,
          isNetworkClusters: this.isNetworkClusters,
          selectedPublicationsCount: this.sessionStore.selectedPublications.length,
          tickHandler: this.tick
        })

        this.initNetworkGraph()

        this.updateNetworkNodes()

        this.link = updateNetworkLinks(this.link, this.graph.links)

        // Update year labels
        const hasPublications = this.sessionStore.publicationsFiltered?.length > 0
        const shouldShow = hasPublications && !this.isEmpty && !this.isNetworkClusters

        if (shouldShow) {
          const yearRange = generateYearRange(
            this.sessionStore.yearMin,
            this.sessionStore.yearMax
          )

          this.label = updateYearLabelContent(this.label, yearRange)
          updateYearLabelRects(this.label, this.yearX)
          updateYearLabelVisibility(this.label, true, this.yearX, this.svgHeight)
        } else if (this.label) {
          this.label.selectAll('text, rect').attr('visibility', 'hidden')
        }

        // Update graph data in simulation
        this.updateGraphData(this.graph.nodes, this.graph.links)

        // Reset position tracking and optimization metrics when plot is called
        this.resetOptimizationMetrics()

        if (restart) {
          // After this layout settles, scale & center the content to fill the container
          this.scheduleFit()
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

      // Increment tick counter
      this.$refs.performanceMonitor?.incrementTick()
      // Synchronize local tick count for CSS animation reactivity
      this.currentTickCount = this.$refs.performanceMonitor?.tickCount || 0

      // Skip DOM updates for first N ticks only if this is a true restart with high alpha (but not when dragging)
      if (
        this.shouldSkipEarlyTicks &&
        !this.isDragging &&
        this.$refs.performanceMonitor?.tickCount <= this.skipEarlyTicks
      ) {
        this.$refs.performanceMonitor?.trackFps() // Still track FPS for debugging
        return true
      }

      // Disable skipping after the skip period
      if (
        this.shouldSkipEarlyTicks &&
        this.$refs.performanceMonitor?.tickCount > this.skipEarlyTicks
      ) {
        this.shouldSkipEarlyTicks = false
      }

      // Skip every second DOM update tick for performance (but not when dragging)
      if (!this.isDragging && this.currentTickCount % 2 === 0) {
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

      // Pre-compute X positions for all nodes (major performance optimization)
      this.cacheNodeXPositions()

      // Check which nodes have moved significantly and get the changed nodes
      const changedNodes = this.detectChangedNodes()

      // Only update positions of changed nodes (not all nodes)
      if (changedNodes.length > 0) {
        this.updateChangedNodePositions(changedNodes)
        const linksUpdated = this.updateSelectiveLinks(changedNodes)
        this.lastUpdateTime = performance.now()

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
      return calculateYearX(year, this.svgWidth, this.svgHeight, this.interfaceStore.isMobile)
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
      const transform = d3.zoomTransform(this.svg.node())
      transform.k = transform.k * factor
      this.svg.attr('transform', transform)
    },
    resetZoom() {
      const svg = d3.select('#network-svg')
      const transform = d3.zoomIdentity
      svg.transition().duration(750).call(this.zoom.transform, transform)
    },
    preserveNodePositions(newNodes, existingNodeData) {
      if (!existingNodeData || typeof existingNodeData.map !== 'function') {
        // If no existing data, return nodes with default positions
        return newNodes.map((d) => Object.assign({ x: 0, y: 0 }, d))
      }

      const oldPositions = new Map(existingNodeData.map((d) => [d.id, d]))
      return newNodes.map((d) => Object.assign(oldPositions.get(d.id) || { x: 0, y: 0 }, d))
    },

    /**
     * Sync the SVG dimensions and viewBox with the current container size.
     * Updates only the viewBox (the coordinate system) — never the zoom transform,
     * so the user's pan/zoom is preserved. Returns true if the size changed.
     */
    syncContainerSize() {
      const container = document.getElementById('network-svg-container')
      if (!container) return false
      const width = container.clientWidth
      const height = container.clientHeight
      if (!width || !height) return false
      if (width === this.svgWidth && height === this.svgHeight) return false

      this.svgWidth = width
      this.svgHeight = height
      d3.select('#network-svg').attr(
        'viewBox',
        `${-width / 2} ${-height / 2} ${width} ${height}`
      )
      return true
    },

    /**
     * Request a fit once the current (re)layout settles. Primary trigger is the
     * simulation 'end' event; a fallback poller guarantees it runs even if 'end'
     * is preempted (e.g. the competing replots during an Update).
     */
    scheduleFit() {
      this.pendingFit = true
      if (this.fitFallbackTimer) clearTimeout(this.fitFallbackTimer)
      const tryFit = () => {
        if (!this.pendingFit) return
        if (this.simulation && this.simulation.alpha() > 0.05) {
          this.fitFallbackTimer = setTimeout(tryFit, 250)
          return
        }
        this.pendingFit = false
        this.fitToContainer()
      }
      this.fitFallbackTimer = setTimeout(tryFit, 600)
    },

    /**
     * Scale & center the content to fill the visible map. Measures the SVG's real
     * rendered size so the viewBox centre (0,0) is the centre of the visible area,
     * then centers the content there via the zoom behavior (manual zoom keeps working).
     */
    fitToContainer(padding = 40) {
      if (!this.svg || !this.zoom || !this.graph.nodes?.length) return
      const svgEl = document.getElementById('network-svg')
      if (!svgEl) return
      const rect = svgEl.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      if (!width || !height) return

      // Match the coordinate system to the actual rendered SVG size
      this.svgWidth = width
      this.svgHeight = height
      d3.select('#network-svg').attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`)

      // Measure the settled layout
      this.cacheNodeXPositions()
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      this.graph.nodes.forEach((node) => {
        const x = this.getNodeDisplayX(node)
        const y = node.y || 0
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      })
      if (!isFinite(minX)) return

      const contentWidth = Math.max(maxX - minX, 1)
      const contentHeight = Math.max(maxY - minY, 1)
      const scale = Math.max(
        0.1,
        Math.min((width - padding * 2) / contentWidth, (height - padding * 2) / contentHeight, 2.5)
      )
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      const transform = d3.zoomIdentity.translate(-scale * centerX, -scale * centerY).scale(scale)

      d3.select('#network-svg').transition().duration(400).call(this.zoom.transform, transform)
    },

    // D3 Simulation methods (moved from useNetworkSimulation)
    initializeSimulation(config) {
      const {
        svgWidth,
        svgHeight,
        isMobile,
        isNetworkClusters,
        selectedPublicationsCount,
        tickHandler
      } = config

      const yearXCalculator = (year) => calculateYearX(year, svgWidth, svgHeight, isMobile)

      this.simulation = createForceSimulation({
        isNetworkClusters,
        selectedPublicationsCount,
        yearXCalculator,
        tickHandler
      })

      // Auto-fit the content to the container once the layout settles
      if (typeof this.simulation.on === 'function') {
        this.simulation.on('end', () => {
          if (this.pendingFit) {
            this.pendingFit = false
            if (this.fitFallbackTimer) clearTimeout(this.fitFallbackTimer)
            this.fitToContainer()
          }
        })
      }

      return this.simulation
    },

    updateSimulation(config) {
      if (!this.simulation) return

      const {
        svgWidth,
        svgHeight,
        isMobile,
        isNetworkClusters,
        selectedPublicationsCount,
        tickHandler
      } = config

      const yearXCalculator = (year) => calculateYearX(year, svgWidth, svgHeight, isMobile)

      initializeForces(this.simulation, {
        isNetworkClusters,
        selectedPublicationsCount,
        yearXCalculator,
        tickHandler
      })
    },

    updateGraphData(nodes, links) {
      this.graph.nodes = nodes
      this.graph.links = links

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
        // Only skip early ticks if this is a true restart with high alpha (> 0.3) and not dragging
        if (alpha > 0.3 && !this.isDragging) {
          this.$refs.performanceMonitor?.resetMetrics()
          this.currentTickCount = 0 // Reset local tick count
          this.shouldSkipEarlyTicks = true
        } else {
          this.shouldSkipEarlyTicks = false
        }

        this.simulation.alpha(alpha).restart()
      }
    },

    start() {
      if (this.simulation) {
        // start() is just resuming, don't skip ticks
        this.shouldSkipEarlyTicks = false

        this.simulation.restart()
      }
    },

    stop() {
      if (this.simulation) {
        this.simulation.stop()
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
        // Get cached X position (major performance optimization)
        const currentX = this.getCachedNodeX(node)
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
      this.currentTickCount = 0 // Reset local tick count
      this.shouldSkipEarlyTicks = false // Reset skip flag
      this.nodeXPositionsCache.clear() // Clear X position cache
      this.resetPositionTracking()
    },

    // X position caching optimization methods
    cacheNodeXPositions() {
      // Pre-compute X positions for all nodes to avoid redundant calculations
      this.nodeXPositionsCache.clear()
      for (const node of this.graph.nodes) {
        const xPos = getNodeXPosition(node, this.isNetworkClusters, this.yearX)
        this.nodeXPositionsCache.set(node.id, xPos)
      }
    },

    getCachedNodeX(node) {
      // Get cached X position, fallback to calculation if not cached
      const cached = this.nodeXPositionsCache.get(node.id)
      if (cached !== undefined) {
        return cached
      }
      // Fallback (should rarely happen)
      const xPos = getNodeXPosition(node, this.isNetworkClusters, this.yearX)
      this.nodeXPositionsCache.set(node.id, xPos)
      return xPos
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

        // Clear graph data
        this.graph = { nodes: [], links: [] }

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

      // Update positions of only the changed nodes
      // In timeline mode: use simulation x-position for author nodes (force attraction),
      // calculated x-position for publication/keyword nodes (strict positioning)
      changedNodeSelection.attr('transform', (d) => `translate(${this.getNodeDisplayX(d)}, ${d.y})`)
    },

    updateSelectiveLinks(changedNodes) {
      if (!changedNodes.length) return 0

      // Create a Set of changed node IDs for fast lookup
      const changedNodeIds = new Set(changedNodes.map((node) => node.id))

      // Filter links that are connected to any changed node
      const affectedLinks = this.link.filter(function (d) {
        return changedNodeIds.has(d.source.id) || changedNodeIds.has(d.target.id)
      })

      // Update only the affected links using appropriate X positions
      affectedLinks
        .attr('d', (d) => calculateLinkPath(d, (d) => this.getNodeDisplayX(d)))
        .attr('class', (d) => calculateLinkClasses(d, this.sessionStore.activePublication))

      // Return how many links were updated
      return affectedLinks.size()
    },

    /**
     * Get the appropriate X position for display, respecting force simulation for author nodes in timeline mode
     */
    getNodeDisplayX(node) {
      if (!this.isNetworkClusters && node.type === 'author') {
        // Use simulation x-position for author nodes in timeline mode (force attraction)
        return node.x || 0
      }
      // Use calculated x-position for other nodes (strict positioning)
      return this.getCachedNodeX(node)
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
    }
  }
}
</script>

<template>
  <div class="network-of-references">
    <div class="box network-box">
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
          :node-count="graph.nodes.length"
          :link-count="graph.links.length"
          :should-skip-early-ticks="shouldSkipEarlyTicks"
          :skip-early-ticks="skipEarlyTicks"
        />
        <svg id="network-svg" :class="networkCssClasses">
          <g></g>
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
        @zoom="zoomByFactor"
        @reset="resetZoom"
        @plot="plot"
        v-show="!isNetworkActuallyCollapsed && !isEmpty"
      />
      <div
        class="map-legend"
        v-show="!isNetworkActuallyCollapsed && !isEmpty && !interfaceStore.isMobile"
      >
        <span class="legend-item">
          <span class="legend-dot selected"></span>Selected
        </span>
        <span class="legend-item">
          <span class="legend-dot suggested"></span>Suggested
        </span>
        <span class="legend-item legend-size-item">
          <span class="legend-size"><i></i><i></i></span>Size = citations
        </span>
      </div>
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
      background: var(--surface-bg);
    }

    & .controls-header-left {
      position: absolute;
      top: calc(1vw + 2.5rem);
      left: 1vw;
    }
  }
}

/* Modern light "map" surface (Litmaps-style) */
.network-box.box {
  background: var(--surface-bg);
  padding: 0;
  overflow: hidden;

  /* NetworkHeader becomes a slim light toolbar */
  & > .level:first-child {
    margin: 0;
    padding: 0.4rem 0.7rem;
    background: var(--surface-bg-subtle);
    border-bottom: 1px solid var(--border-subtle);
  }

  & .controls-header-left {
    top: calc(1vw + 3rem);
  }
}

/* Map legend (Litmaps-style) */
.map-legend {
  position: absolute;
  bottom: max(1vw, 1rem);
  left: max(1vw, 1rem);
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.3rem 0.7rem;
  font-size: 0.75rem;
  color: var(--bulma-grey-dark);
  background: var(--legend-bg);
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.12);

  & .legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    white-space: nowrap;
  }

  & .legend-dot {
    width: 0.85rem;
    height: 0.85rem;
    border-radius: 50%;
    border: 2px solid;
    box-sizing: border-box;

    &.selected {
      border-color: var(--bulma-primary);
      background: var(--bulma-primary-95);
    }

    &.suggested {
      border-color: var(--bulma-info);
      background: var(--surface-bg);
    }
  }

  & .legend-size {
    display: flex;
    align-items: center;
    gap: 2px;

    & i {
      display: block;
      border-radius: 50%;
      border: 1.5px solid var(--bulma-grey);
      background: var(--surface-bg);
    }

    & i:nth-child(1) {
      width: 0.5rem;
      height: 0.5rem;
    }

    & i:nth-child(2) {
      width: 0.85rem;
      height: 0.85rem;
    }
  }
}

#network-svg-container {
  overflow: hidden;
  position: relative;
}

/* Network fade during early tick skipping */
.network-fading {
  opacity: 0.1;
  transition: opacity 0.3s ease-out;
}

.network-visible {
  opacity: 1;
  transition: opacity 0.5s ease-in;
}

#network-svg {
  background: var(--surface-bg);
  width: 100%;
  height: 100%;

  & g:focus {
    outline: none;
  }

  & g.publication.node-container {
    cursor: pointer;

    & circle.node-shape {
      cursor: pointer;
      fill: white;
      stroke-width: 2.5;
      @include light-shadow-svg;
    }

    & circle.boost {
      fill: var(--bulma-warning);
      stroke: black;
      stroke-width: 0.5;
      @include light-shadow-svg;
    }

    & text.node-label {
      text-anchor: middle;
      dominant-baseline: hanging;
      font-size: 10px;
      fill: var(--bulma-grey-dark);
      /* White halo so labels stay readable over links and other nodes */
      paint-order: stroke;
      stroke: white;
      stroke-width: 3px;
      stroke-linejoin: round;
    }

    & text.labelQueuingForSelected,
    & text.labelQueuingForExcluded {
      text-anchor: middle;
      dominant-baseline: middle;
      visibility: hidden;
      font-weight: 1000;
      stroke: white;
      stroke-width: 0.5;
    }

    &.is-hovered circle.node-shape {
      transform: scale(1.1);
      animation: node-pulse 2s ease-in-out infinite;
    }

    &.selected circle.node-shape {
      stroke: var(--bulma-primary);
      fill: var(--bulma-primary-95);
    }

    &.suggested circle.node-shape {
      stroke: var(--bulma-info);
      fill: white;
    }

    &.active circle.node-shape {
      stroke-width: 5;
      filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.35));
    }

    &.active text.node-label {
      font-weight: 700;
      font-size: 11px;
    }

    &.linkedToActive circle.node-shape {
      stroke-width: 4;
    }

    &.non-active {
      opacity: 0.18;
    }

    &.is-keyword-hovered circle.node-shape {
      filter: drop-shadow(0px 0px 10px var(--bulma-warning));
      stroke: hsl(
        var(--bulma-warning-h),
        var(--bulma-warning-s),
        calc(var(--bulma-warning-l) - 20%)
      );
    }

    &.is-author-hovered circle.node-shape {
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
      opacity: 0.5;
      filter: blur(0.5px);
    }
  }

  & g.keyword.node-container {
    cursor: grab;

    & text {
      text-anchor: middle;
      transform: translate(0px, 4px);
      filter: drop-shadow(0px 0px 2px var(--bulma-warning));
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
      @include light-shadow-svg;
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

    /* Emphasize the active publication's links and encode direction by color:
       outgoing = papers it cites (primary), incoming = papers citing it (info) */
    &.active {
      opacity: 0.75;
      stroke-width: 3.5;
    }

    &.active.outgoing {
      stroke: var(--bulma-primary);
    }

    &.active.incoming {
      stroke: var(--bulma-info);
    }

    &.non-active {
      opacity: 0.04;
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
