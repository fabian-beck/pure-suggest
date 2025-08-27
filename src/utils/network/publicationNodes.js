/**
 * Publication Node Management
 * 
 * This module handles the creation, initialization, and updating of publication nodes
 * in the network visualization. Publication nodes represent research papers and are
 * displayed as rectangular nodes with associated metadata.
 */

import tippy from "tippy.js";

const RECT_SIZE = 20;
const ENLARGE_FACTOR = 1.5;

/**
 * Create publication node data from publications
 */
export function createPublicationNodes(publications, doiToIndex, selectedQueue, excludedQueue) {
    const nodes = [];
    let i = 0;

    publications.forEach((publication) => {
        if (publication.year) {
            doiToIndex[publication.doi] = i;
            nodes.push({
                id: publication.doi,
                publication: publication,
                isQueuingForSelected: selectedQueue.includes(publication.doi),
                isQueuingForExcluded: excludedQueue.includes(publication.doi),
                type: "publication",
            });
            i++;
        }
    });

    return nodes;
}

/**
 * Initialize publication node DOM elements
 */
export function initializePublicationNodes(nodeSelection, activatePublication, hoverHandler) {
    const publicationNodes = nodeSelection.filter((d) => d.type === "publication");
    
    // Add rect element (main visual element for publication nodes)
    publicationNodes
        .append("rect")
        .attr("pointer-events", "all")
        .on("click", activatePublication)
        .on("mouseover", (event, d) => hoverHandler(d.publication, true))
        .on("mouseout", (event, d) => hoverHandler(d.publication, false));
    
    // Add score text (displays the publication score)
    publicationNodes
        .append("text")
        .classed("score", true)
        .attr("pointer-events", "none");
    
    // Add boost indicator circle (shows boost factor visually)
    publicationNodes.append("circle");
    
    // Add queueing labels (+ for selected, - for excluded)
    publicationNodes
        .append("text")
        .classed("labelQueuingForSelected", true)
        .attr("pointer-events", "none")
        .attr("x", 15)
        .attr("y", 15)
        .text("+");
    publicationNodes
        .append("text")
        .classed("labelQueuingForExcluded", true)
        .attr("pointer-events", "none")
        .attr("x", 15)
        .attr("y", 15)
        .text("-");

    return publicationNodes;
}

/**
 * Update publication node visual properties
 */
export function updatePublicationNodes(nodeSelection, activePublication, existingTooltips) {
    const publicationNodes = nodeSelection.filter((d) => d.type === "publication");
    
    // Update CSS classes based on state
    publicationNodes
        .classed("selected", (d) => d.publication.isSelected)
        .classed("suggested", (d) => !d.publication.isSelected)
        .classed("active", (d) => d.publication.isActive)
        .classed("linkedToActive", (d) => d.publication.isLinkedToActive)
        .classed("non-active", (d) => activePublication && !d.publication.isActive && !d.publication.isLinkedToActive)
        .classed("queuingForSelected", (d) => d.isQueuingForSelected)
        .classed("queuingForExcluded", (d) => d.isQueuingForExcluded)
        .classed("is-hovered", (d) => d.publication.isHovered)
        .classed("is-keyword-hovered", (d) => d.publication.isKeywordHovered)
        .classed("is-author-hovered", (d) => d.publication.isAuthorHovered);

    // Clean up existing tooltips
    if (existingTooltips) {
        existingTooltips.forEach((tooltip) => tooltip.destroy());
    }

    // Set up tooltip content
    publicationNodes.attr("data-tippy-content", (d) => {
        const queueStatus = d.isQueuingForSelected 
            ? " and marked to be added to selected publications"
            : d.isQueuingForExcluded 
                ? " and marked to be added to excluded publications"
                : "";
        
        return `<b>${d.publication.title ? d.publication.title : "[unknown title]"}</b> (${
            d.publication.authorShort ? d.publication.authorShort + ", " : ""
        }${d.publication.year ? d.publication.year : "[unknown year]"})
        <br><br>
        The publication is <b>${d.publication.isSelected ? "selected" : "suggested"}</b>${queueStatus}.`;
    });

    // Create new tooltips
    const newTooltips = tippy(publicationNodes.nodes(), {
        maxWidth: "min(400px,70vw)",
        allowHTML: true,
    });

    // Update rect attributes
    publicationNodes
        .select("rect")
        .attr("width", getRectSize)
        .attr("height", getRectSize)
        .attr("x", (d) => -getRectSize(d) / 2)
        .attr("y", (d) => -getRectSize(d) / 2)
        .attr("stroke-width", (d) => d.publication.isActive ? 4 : 3)
        .attr("fill", (d) => d.publication.scoreColor);

    // Update score text
    publicationNodes
        .select("text.score")
        .classed("unread", (d) => !d.publication.isRead && !d.publication.isSelected)
        .attr("y", 1)
        .attr("font-size", "0.8em")
        .text((d) => d.publication.score);

    // Update boost indicator circle
    publicationNodes
        .select("circle")
        .attr("cx", (d) => getRectSize(d) / 2 - 1)
        .attr("cy", (d) => -getRectSize(d) / 2 + 1)
        .attr("r", (d) => d.publication.boostFactor > 1 ? getBoostIndicatorSize(d) / 6 : 0)
        .attr("stroke", "black");

    return { nodes: publicationNodes, tooltips: newTooltips };
}

/**
 * Calculate rectangle size based on publication state
 */
function getRectSize(d) {
    return RECT_SIZE * (d.publication.isActive ? ENLARGE_FACTOR : 1);
}

/**
 * Calculate boost indicator size
 */
function getBoostIndicatorSize(d) {
    let internalFactor = 1;
    if (d.publication.boostFactor >= 8) {
        internalFactor = 1.8;
    } else if (d.publication.boostFactor >= 4) {
        internalFactor = 1.5;
    } else if (d.publication.boostFactor > 1) {
        internalFactor = 1.2;
    }
    return getRectSize(d) * internalFactor * 0.8;
}

// Color is handled by d.publication.scoreColor from the original logic

/**
 * Get filtered publications based on visibility settings and filters
 */
export function getFilteredPublications(
    selectedPublications, 
    suggestedPublications, 
    showSelectedNodes, 
    showSuggestedNodes, 
    suggestedNumberFactor, 
    onlyShowFiltered,
    filterConfig
) {
    let publications = [];
    
    if (showSelectedNodes) {
        let selectedPubs = selectedPublications;
        if (onlyShowFiltered && filterConfig.hasActiveFilters && filterConfig.applyToSelected) {
            selectedPubs = selectedPubs.filter(filterConfig.matches);
        }
        publications = publications.concat(selectedPubs);
    }
    
    if (showSuggestedNodes) {
        let suggestedPubs = suggestedPublications;
        if (onlyShowFiltered && filterConfig.hasActiveFilters && filterConfig.applyToSuggested) {
            suggestedPubs = suggestedPubs.filter(filterConfig.matches);
        }
        publications = publications.concat(suggestedPubs.slice(0, Math.round(suggestedNumberFactor * 50)));
    }

    return publications;
}