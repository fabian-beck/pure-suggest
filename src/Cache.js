import LZString from 'lz-string';
import { get, set, keys, del, clear } from 'idb-keyval';

// In-memory cache layer for frequently accessed items
const memoryCache = new Map();
const MAX_MEMORY_CACHE_SIZE = 2000; // Keep 2000 most recent items in memory

console.log(`Locally cached #elements: ${(await keys()).length}`)

function addToMemoryCache(url, data) {
  // If cache is full, remove oldest item (first item)
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
  }
  
  // Add/update item (moves to end if already exists)
  memoryCache.delete(url);
  memoryCache.set(url, data);
  console.debug(`[PERF] Added to memory cache: ${url} (cache size: ${memoryCache.size})`);
}

export async function cachedFetch(url, processData, fetchParameters = {}, noCache = false) {
  const overallStart = performance.now();
  
  try {
    if (noCache) throw new Error("No cache");
    
    // Check memory cache first
    if (memoryCache.has(url)) {
      const memoryStart = performance.now();
      const cachedData = memoryCache.get(url);
      
      // Move to end (mark as recently used)
      memoryCache.delete(url);
      memoryCache.set(url, cachedData);
      
      const processStart = performance.now();
      processData(cachedData);
      console.debug(`[PERF] cachedFetch: processData - ${performance.now() - processStart}ms`);
      
      console.debug(`[PERF] cachedFetch: MEMORY HIT total - ${performance.now() - overallStart}ms`);
      return;
    }
    
    const cacheGetStart = performance.now();
    const cacheObject = await get(url);
    console.debug(`[PERF] cachedFetch: IndexedDB get - ${performance.now() - cacheGetStart}ms`);
    
    if (cacheObject.timestamp < Date.now() - 1000 * 60 * 60 * 24 * 100) {
      throw new Error("Cached data is too old");
    }
    
    const decompressStart = performance.now();
    const data = JSON.parse(LZString.decompress(cacheObject.data));
    console.debug(`[PERF] cachedFetch: decompress + parse - ${performance.now() - decompressStart}ms`);
    
    if (!data) throw new Error("Cached data is empty");
    
    // Add to memory cache for future use
    addToMemoryCache(url, data);
    
    const processStart = performance.now();
    processData(data);
    console.debug(`[PERF] cachedFetch: processData - ${performance.now() - processStart}ms`);
    
    console.debug(`[PERF] cachedFetch: INDEXED DB total - ${performance.now() - overallStart}ms`);
  } catch (cannotLoadFromCacheError) {
    console.debug(`[PERF] cachedFetch: cache miss, fetching from network`);
    try {
      const fetchStart = performance.now();
      const response = await fetch(url, fetchParameters);
      console.debug(`[PERF] cachedFetch: network fetch - ${performance.now() - fetchStart}ms`);
      
      if (!response.ok) {
        throw new Error(`Received response with status ${response.status}`);
      }
      
      const parseStart = performance.now();
      const data = await response.json();
      console.debug(`[PERF] cachedFetch: response.json() - ${performance.now() - parseStart}ms`);
      
      const compressStart = performance.now();
      const compressedData = LZString.compress(JSON.stringify(data));
      console.debug(`[PERF] cachedFetch: compress - ${performance.now() - compressStart}ms`);
      
      const cacheObject = { data: compressedData, timestamp: Date.now() };
      try {
        if (noCache) {
          url = url.replace("&noCache=true", "");
        }
        const cacheSetStart = performance.now();
        await set(url, cacheObject);
        console.debug(`[PERF] cachedFetch: cache set - ${performance.now() - cacheSetStart}ms`);
      } catch (error) {
        const keysArray = await keys();
        console.log(`Cache full (#elements: ${keysArray.length})! Removing elements...`)
        try {
          // local storage cache full, delete random elements
          for (let i = 0; i < 100; i++) {
            const randomStoredUrl = keysArray[
              Math.floor(Math.random() * keysArray.length)
            ];
            del(randomStoredUrl);
          }
          await set(url, cacheObject);
        } catch (error2) {
          console.error(
            `Unable to locally cache information for "${url}": ${error2}`
          );
        }
      }
      console.log(`Successfully fetched data for "${url}"`);

      // Add to memory cache for future use
      addToMemoryCache(url, data);

      const processStart = performance.now();
      processData(data);
      console.debug(`[PERF] cachedFetch: processData - ${performance.now() - processStart}ms`);
      
      console.debug(`[PERF] cachedFetch: NETWORK total - ${performance.now() - overallStart}ms`);
    } catch (error3) {
      console.error(`Unable to fetch or process data for "${url}": ${error3}`)
    }
  }
}

export function clearCache() {
  clear();
  memoryCache.clear();
  console.log('Cleared both IndexedDB and memory cache');
}