/**
 * Graph Data Management Composable
 * 
 * This composable handles the initialization and management of graph data
 * including nodes, links, and associated state for the network visualization.
 */

import { 
    createPublicationNodes,
    getFilteredPublications 
} from "./publicationNodes.js";
import { createKeywordNodes } from "./keywordNodes.js";
import { createAuthorNodes } from "./authorNodes.js";
import { createNetworkLinks } from "./networkLinks.js";

/**
 * Initialize complete graph data structure
 */
export function initializeGraphData(component) {
    const {
        sessionStore,
        showSelectedNodes,
        showSuggestedNodes,
        showKeywordNodes,
        showAuthorNodes,
        suggestedNumberFactor,
        authorNumberFactor,
        onlyShowFiltered,
        node
    } = component;
    
    const existingNodeData = node?.data ? node.data() : null;

    // Initialize DOI to index mapping
    const doiToIndex = {};
    
    // Filter authors based on factor
    const allAuthors = sessionStore.selectedPublicationsAuthors;
    const filteredAuthors = allAuthors.slice(0, authorNumberFactor * sessionStore.selectedPublications.length);
    
    // Create nodes and links
    const nodes = createGraphNodes({
        sessionStore,
        showSelectedNodes,
        showSuggestedNodes,
        showKeywordNodes,
        showAuthorNodes,
        suggestedNumberFactor,
        onlyShowFiltered,
        doiToIndex,
        filteredAuthors
    });
    
    const links = createGraphLinks({
        sessionStore,
        showKeywordNodes,
        showAuthorNodes,
        doiToIndex,
        filteredAuthors,
        showSelectedNodes,
        showSuggestedNodes,
        suggestedNumberFactor,
        onlyShowFiltered
    });
    
    // Preserve existing node positions for smooth transitions
    const processedNodes = preserveNodePositions(nodes, existingNodeData);
    const processedLinks = links.map((d) => Object.assign({}, d));
    
    return {
        nodes: processedNodes,
        links: processedLinks,
        doiToIndex,
        filteredAuthors
    };
}

/**
 * Create all graph nodes
 */
function createGraphNodes(context) {
    const {
        sessionStore,
        showSelectedNodes,
        showSuggestedNodes,
        showKeywordNodes,
        showAuthorNodes,
        suggestedNumberFactor,
        onlyShowFiltered,
        doiToIndex,
        filteredAuthors
    } = context;
    
    let nodes = [];
    
    // Get filtered publications based on visibility settings
    const publications = getFilteredPublications(
        sessionStore.selectedPublications,
        sessionStore.suggestedPublications,
        showSelectedNodes,
        showSuggestedNodes,
        suggestedNumberFactor,
        onlyShowFiltered,
        {
            hasActiveFilters: sessionStore.filter.hasActiveFilters(),
            applyToSelected: sessionStore.filter.applyToSelected,
            applyToSuggested: sessionStore.filter.applyToSuggested,
            matches: (pub) => sessionStore.filter.matches(pub)
        }
    );

    // Create publication nodes
    const publicationNodes = createPublicationNodes(
        publications, 
        doiToIndex, 
        sessionStore.selectedQueue, 
        sessionStore.excludedQueue
    );
    nodes = nodes.concat(publicationNodes);
    
    // Create keyword nodes
    if (showKeywordNodes) {
        const keywordNodes = createKeywordNodes(sessionStore);
        nodes = nodes.concat(keywordNodes);
    }
    
    // Create author nodes
    if (showAuthorNodes) {
        const authorNodes = createAuthorNodes(filteredAuthors, publications);
        nodes = nodes.concat(authorNodes);
    }
    
    return nodes;
}

/**
 * Create all graph links
 */
function createGraphLinks(context) {
    const {
        sessionStore,
        showKeywordNodes,
        showAuthorNodes,
        doiToIndex,
        filteredAuthors,
        showSelectedNodes,
        showSuggestedNodes,
        suggestedNumberFactor,
        onlyShowFiltered
    } = context;
    
    // Get filtered publications for link creation
    const publications = getFilteredPublications(
        sessionStore.selectedPublications,
        sessionStore.suggestedPublications,
        showSelectedNodes,
        showSuggestedNodes,
        suggestedNumberFactor,
        onlyShowFiltered,
        {
            hasActiveFilters: sessionStore.filter.hasActiveFilters(),
            applyToSelected: sessionStore.filter.applyToSelected,
            applyToSuggested: sessionStore.filter.applyToSuggested,
            matches: (pub) => sessionStore.filter.matches(pub)
        }
    );

    // Create all network links using module
    return createNetworkLinks(
        sessionStore,
        doiToIndex,
        filteredAuthors,
        publications,
        showKeywordNodes,
        showAuthorNodes
    );
}

/**
 * Preserve existing node positions for smooth transitions
 * Based on D3's pattern: https://observablehq.com/@d3/modifying-a-force-directed-graph
 */
function preserveNodePositions(newNodes, existingNodeData) {
    if (!existingNodeData || typeof existingNodeData.map !== 'function') {
        // If no existing data, return nodes with default positions
        return newNodes.map((d) => Object.assign({ x: 0, y: 0 }, d));
    }
    
    const oldPositions = new Map(existingNodeData.map((d) => [d.id, d]));
    return newNodes.map((d) => Object.assign(oldPositions.get(d.id) || { x: 0, y: 0 }, d));
}

