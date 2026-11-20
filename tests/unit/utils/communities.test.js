import { describe, it, expect } from 'vitest'

import { detectCommunities } from '@/utils/network/communities.js'

describe('detectCommunities', () => {
  const node = (id) => ({ id })
  const clique = (nodes, type = 'citation') =>
    nodes.flatMap((source, i) => nodes.slice(i + 1).map((target) => ({ source, target, type })))

  it('separates densely linked groups that are bridged by a single link', () => {
    const groupA = ['a1', 'a2', 'a3', 'a4'].map(node)
    const groupB = ['b1', 'b2', 'b3', 'b4'].map(node)
    const author = node('author')
    const links = [
      ...clique(groupA),
      ...clique(groupB),
      { source: groupA[0], target: groupB[0], type: 'citation' },
      ...groupB.slice(0, 2).map((target) => ({ source: author, target, type: 'author' }))
    ]
    const community = detectCommunities(links)
    groupA.forEach((n) => expect(community.get(n)).toBe(community.get(groupA[1])))
    ;[...groupB, author].forEach((n) => expect(community.get(n)).toBe(community.get(groupB[1])))
    expect(community.get(groupA[1])).not.toBe(community.get(groupB[1]))
  })

  it('ignores keyword links, which would merge all publications sharing a keyword', () => {
    const keyword = node('keyword')
    const publications = ['p1', 'p2', 'p3', 'p4'].map(node)
    const links = [
      { source: publications[0], target: publications[1], type: 'citation' },
      { source: publications[2], target: publications[3], type: 'citation' },
      ...publications.map((target) => ({ source: keyword, target, type: 'keyword' }))
    ]
    const community = detectCommunities(links)
    expect(community.has(keyword)).toBe(false)
    expect(community.get(publications[0])).not.toBe(community.get(publications[2]))
  })
})
