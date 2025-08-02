import LZString from 'lz-string';
import { get, set, keys, del, clear } from 'idb-keyval';

// In-memory cache layer for frequently accessed items
const memoryCache = new Map();
const MAX_MEMORY_CACHE_SIZE = 2000; // Keep 2000 most recent items in memory

console.log(`Locally cached #elements: ${(await keys()).length}`)

// Warm up memory cache by loading IndexedDB entries
async function warmUpMemoryCache() {
  try {
    const allKeys = await keys();
    const warmUpCount = Math.min(500, allKeys.length); // Load up to 500 entries
    
    console.log(`🔥 Warming up memory cache with ${warmUpCount} entries...`);
    
    for (let i = 0; i < warmUpCount; i++) {
      try {
        const key = allKeys[i];
        const cacheObject = await get(key);
        
        if (cacheObject && cacheObject.data) {
          const data = JSON.parse(LZString.decompress(cacheObject.data));
          addToMemoryCache(key, data);
        }
      } catch (error) {
        // Skip problematic entries
        continue;
      }
    }
    
    console.log(`✅ Memory cache warmed up: ${memoryCache.size} entries loaded`);
  } catch (error) {
    console.error('❌ Error during memory cache warm-up:', error);
  }
}

// Start warm-up process
warmUpMemoryCache();

function addToMemoryCache(url, data) {
  // If cache is full, remove oldest item (first item)
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
  }
  
  // Add/update item (moves to end if already exists)
  memoryCache.delete(url);
  memoryCache.set(url, data);
  // Log memory cache milestones
  if (memoryCache.size % 500 === 0 && memoryCache.size > 0) {
    console.log(`[PERF] 📊 Memory cache: ${memoryCache.size} entries`);
  }
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
      return;
    }
    
    const cacheGetStart = performance.now();
    const cacheObject = await get(url);
    const getDuration = performance.now() - cacheGetStart;
    
    if (cacheObject.timestamp < Date.now() - 1000 * 60 * 60 * 24 * 100) {
      throw new Error("Cached data is too old");
    }
    
    const decompressStart = performance.now();
    const data = JSON.parse(LZString.decompress(cacheObject.data));
    const decompressDuration = performance.now() - decompressStart;
    
    if (!data) throw new Error("Cached data is empty");
    
    // Add to memory cache for future use
    addToMemoryCache(url, data);
    
    const processStart = performance.now();
    processData(data);
    const processDuration = performance.now() - processStart;
    
    const totalDuration = performance.now() - overallStart;
  } catch (cannotLoadFromCacheError) {
    // Network fetch (cache miss)
    try {
      const fetchStart = performance.now();
      const response = await fetch(url, fetchParameters);
      const fetchDuration = performance.now() - fetchStart;
      
      if (!response.ok) {
        throw new Error(`Received response with status ${response.status}`);
      }
      
      const parseStart = performance.now();
      const data = await response.json();
      const parseDuration = performance.now() - parseStart;
      
      const compressStart = performance.now();
      const compressedData = LZString.compress(JSON.stringify(data));
      const compressDuration = performance.now() - compressStart;
      
      const cacheObject = { data: compressedData, timestamp: Date.now() };
      try {
        if (noCache) {
          url = url.replace("&noCache=true", "");
        }
        const cacheSetStart = performance.now();
        await set(url, cacheObject);
        const setDuration = performance.now() - cacheSetStart;
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
      const processDuration = performance.now() - processStart;
      
      const totalDuration = performance.now() - overallStart;
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