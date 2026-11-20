/**
 * Communities of the citation network (Louvain method): groups of nodes that are linked
 * more densely among each other than to the rest of the network
 */

/**
 * Communities of the nodes linked by citation and author links (with ends resolved to
 * nodes), as a map from node to community index; keyword links are ignored, as they would
 * merge all publications sharing a keyword. Moves nodes to the neighboring community that
 * gains the most modularity until no move gains, then repeats on the graph of communities.
 */
export function detectCommunities(links) {
  const nodes = []
  const index = new Map()
  const indexOf = (node) => {
    if (!index.has(node)) {
      index.set(node, nodes.length)
      nodes.push(node)
    }
    return index.get(node)
  }
  // Weights of the links of each (aggregated) node to its neighbors, including itself
  let adjacency = []
  links.forEach(({ source, target, type }) => {
    if (type === 'keyword') return
    const [i, j] = [indexOf(source), indexOf(target)]
    ;[
      [i, j],
      [j, i]
    ].forEach(([a, b]) => {
      adjacency[a] ??= new Map()
      adjacency[a].set(b, (adjacency[a].get(b) || 0) + 1)
    })
  })
  let membership = nodes.map((node, i) => i)

  for (;;) {
    const degrees = adjacency.map((weights) => [...weights.values()].reduce((a, b) => a + b, 0))
    const totalDegree = degrees.reduce((a, b) => a + b, 0)
    const community = adjacency.map((weights, i) => i)
    const communityDegrees = [...degrees]
    let isImproved = false
    let isMoved = true
    while (isMoved) {
      isMoved = false
      adjacency.forEach((weights, i) => {
        const weightsToCommunities = new Map()
        weights.forEach((weight, j) => {
          if (j !== i) {
            weightsToCommunities.set(
              community[j],
              (weightsToCommunities.get(community[j]) || 0) + weight
            )
          }
        })
        const gain = (c) =>
          (weightsToCommunities.get(c) || 0) - (communityDegrees[c] * degrees[i]) / totalDegree
        communityDegrees[community[i]] -= degrees[i]
        let best = community[i]
        let bestGain = gain(best)
        for (const c of weightsToCommunities.keys()) {
          if (gain(c) > bestGain + 1e-9) {
            best = c
            bestGain = gain(c)
          }
        }
        communityDegrees[best] += degrees[i]
        if (best !== community[i]) {
          community[i] = best
          isMoved = isImproved = true
        }
      })
    }
    if (!isImproved) break

    const communityIndex = new Map()
    community.forEach((c) => {
      if (!communityIndex.has(c)) communityIndex.set(c, communityIndex.size)
    })
    membership = membership.map((i) => communityIndex.get(community[i]))
    const aggregated = Array.from({ length: communityIndex.size }, () => new Map())
    adjacency.forEach((weights, i) =>
      weights.forEach((weight, j) => {
        const [a, b] = [communityIndex.get(community[i]), communityIndex.get(community[j])]
        aggregated[a].set(b, (aggregated[a].get(b) || 0) + weight)
      })
    )
    adjacency = aggregated
  }
  return new Map(nodes.map((node, i) => [node, membership[i]]))
}
