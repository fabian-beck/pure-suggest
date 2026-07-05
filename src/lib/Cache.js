import { get, set, keys, del, clear } from 'idb-keyval'
import LZString from 'lz-string'

const CACHE_CONFIG = {
  EXPIRY_MS: 1000 * 60 * 60 * 24 * 100, // 100 days in milliseconds
  CLEANUP_BATCH_SIZE: 100
}

// In-memory cache layer for frequently accessed items
const memoryCache = new Map()
const MAX_MEMORY_CACHE_SIZE = 2000 // Keep 2000 most recent items in memory

// Deduplicates concurrent network fetches for the same URL
const inFlightRequests = new Map()

// Only access IndexedDB if available (not in test environment)
if (typeof indexedDB !== 'undefined') {
  try {
    const keyCount = (await keys()).length
    console.log(`Locally cached #elements: ${keyCount}`)
  } catch (error) {
    console.warn('IndexedDB not available:', error.message)
  }
}

// Warm up memory cache by loading IndexedDB entries
async function warmUpMemoryCache() {
  try {
    const allKeys = await keys()
    const warmUpCount = Math.min(500, allKeys.length) // Load up to 500 entries

    console.log(`🔥 Warming up memory cache with ${warmUpCount} entries...`)

    for (let i = 0; i < warmUpCount; i++) {
      try {
        const key = allKeys[i]
        const cacheObject = await get(key)

        if (cacheObject && cacheObject.data) {
          const data = JSON.parse(LZString.decompress(cacheObject.data))
          addToMemoryCache(key, data)
        }
      } catch {
        // Skip problematic entries
        continue
      }
    }

    console.log(`✅ Memory cache warmed up: ${memoryCache.size} entries loaded`)
  } catch (error) {
    console.error('❌ Error during memory cache warm-up:', error)
  }
}

// Start warm-up process only if IndexedDB is available
if (typeof indexedDB !== 'undefined') {
  warmUpMemoryCache()
}

function addToMemoryCache(url, data) {
  // If cache is full, remove oldest item (first item)
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    const firstKey = memoryCache.keys().next().value
    memoryCache.delete(firstKey)
  }

  // Add/update item (moves to end if already exists)
  memoryCache.delete(url)
  memoryCache.set(url, data)
  // Log memory cache milestones
  if (memoryCache.size % 500 === 0 && memoryCache.size > 0) {
    console.log(`[PERF] 📊 Memory cache: ${memoryCache.size} entries`)
  }
}

/**
 * Handle cache cleanup when storage is full and retry setting cache object
 * @param {string} url - The URL key for caching
 * @param {object} cacheObject - The cache object to store
 */
async function handleCacheCleanupAndRetry(url, cacheObject) {
  const keysArray = await keys()
  console.log(`Cache full (#elements: ${keysArray.length})! Removing elements...`)
  try {
    // local storage cache full, delete random elements
    for (let i = 0; i < CACHE_CONFIG.CLEANUP_BATCH_SIZE; i++) {
      // eslint-disable-next-line sonarjs/pseudo-random
      const randomStoredUrl = keysArray[Math.floor(Math.random() * keysArray.length)]
      del(randomStoredUrl)
    }
    await set(url, cacheObject)
  } catch (error2) {
    console.error(`Unable to locally cache information for "${url}": ${error2}`)
  }
}

/**
 * Reads a cached entry from the memory cache, falling back to IndexedDB.
 * @param {string} canonicalUrl - The cache key.
 * @returns {Promise<object|undefined>} Cached data, or undefined on a miss.
 */
async function readCache(canonicalUrl) {
  if (memoryCache.has(canonicalUrl)) {
    const cachedData = memoryCache.get(canonicalUrl)
    // Move to end (mark as recently used)
    memoryCache.delete(canonicalUrl)
    memoryCache.set(canonicalUrl, cachedData)
    return cachedData
  }

  if (typeof indexedDB === 'undefined') return undefined

  const cacheObject = await get(canonicalUrl)
  if (!cacheObject || cacheObject.timestamp < Date.now() - CACHE_CONFIG.EXPIRY_MS) {
    return undefined
  }

  const data = JSON.parse(LZString.decompress(cacheObject.data))
  if (!data) return undefined

  addToMemoryCache(canonicalUrl, data)
  return data
}

/**
 * Writes an entry to both IndexedDB and the memory cache.
 * @param {string} canonicalUrl - The cache key.
 * @param {object} data - The data to store.
 */
async function writeCache(canonicalUrl, data) {
  const compressedData = LZString.compress(JSON.stringify(data))
  const cacheObject = { data: compressedData, timestamp: Date.now() }
  try {
    await set(canonicalUrl, cacheObject)
  } catch {
    await handleCacheCleanupAndRetry(canonicalUrl, cacheObject)
  }
  addToMemoryCache(canonicalUrl, data)
}

export async function cachedFetch(url, processData, fetchParameters = {}, noCache = false) {
  const canonicalUrl = noCache ? url.replace('&noCache=true', '') : url

  if (!noCache) {
    const cachedData = await readCache(canonicalUrl)
    if (cachedData !== undefined) {
      processData(cachedData)
      return
    }

    // Join an in-flight request for the same URL; noCache requests must reach
    // the network themselves to bypass the server-side cache
    if (inFlightRequests.has(canonicalUrl)) {
      try {
        processData(await inFlightRequests.get(canonicalUrl))
      } catch (error) {
        console.error(`Unable to fetch or process data for "${url}": ${error}`)
      }
      return
    }
  }

  const fetchPromise = fetch(url, fetchParameters).then((response) => {
    if (!response.ok) throw new Error(`Received response with status ${response.status}`)
    return response.json()
  })
  // Only normal requests are shareable; noCache requests bypass caches and must
  // not be joined by concurrent normal requests
  if (!noCache) inFlightRequests.set(canonicalUrl, fetchPromise)

  try {
    const data = await fetchPromise
    await writeCache(canonicalUrl, data)
    console.log(`Successfully fetched data for "${url}"`)
    processData(data)
  } catch (error) {
    console.error(`Unable to fetch or process data for "${url}": ${error}`)
  } finally {
    // Guarded delete: a concurrent noCache request may have replaced the entry
    if (inFlightRequests.get(canonicalUrl) === fetchPromise) {
      inFlightRequests.delete(canonicalUrl)
    }
  }
}

/**
 * Warms the per-URL cache for many items using a single bulk request. URLs that
 * are already cached (memory or IndexedDB) are skipped; the remaining misses are
 * fetched together via `bulkFetch` and written back under their individual URLs,
 * so subsequent `cachedFetch` calls for the same URLs become cache hits. This
 * keeps bulk loading aligned with per-item caching.
 * @param {string[]} urls - Individual cache-key URLs to warm.
 * @param {(missedUrls: string[]) => Promise<Map<string, object>>} bulkFetch -
 *   Fetches the misses, returning a Map from URL to its data.
 */
export async function cacheBulk(urls, bulkFetch) {
  const cached = await Promise.all(urls.map((url) => readCache(url)))
  const missedUrls = urls.filter((_url, index) => cached[index] === undefined)
  if (!missedUrls.length) return

  const fetched = await bulkFetch(missedUrls)
  for (const url of missedUrls) {
    const data = fetched.get(url)
    if (data) await writeCache(url, data)
  }
}

export function clearCache() {
  if (typeof indexedDB !== 'undefined') {
    clear()
  }
  memoryCache.clear()
  console.log('Cleared both IndexedDB and memory cache')
}
