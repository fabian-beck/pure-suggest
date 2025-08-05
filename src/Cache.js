import LZString from 'lz-string';
import { get, set, keys, del, clear } from 'idb-keyval';
import { CACHE_CONFIG } from './constants/cache.js';

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
      } catch {
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
  
  try {
    if (noCache) throw new Error("No cache");
    
    // Check memory cache first
    if (memoryCache.has(url)) {
      const cachedData = memoryCache.get(url);
      
      // Move to end (mark as recently used)
      memoryCache.delete(url);
      memoryCache.set(url, cachedData);
      
      processData(cachedData);
      return;
    }
    
    const cacheObject = await get(url);
    
    if (cacheObject.timestamp < Date.now() - CACHE_CONFIG.EXPIRY_MS) {
      throw new Error("Cached data is too old");
    }
    
    const data = JSON.parse(LZString.decompress(cacheObject.data));
    
    if (!data) throw new Error("Cached data is empty");
    
    // Add to memory cache for future use
    addToMemoryCache(url, data);
    
    processData(data);
  } catch {
    // Network fetch (cache miss)
    try {
      const response = await fetch(url, fetchParameters);
      
      if (!response.ok) {
        throw new Error(`Received response with status ${response.status}`);
      }
      
      const data = await response.json();
      
      const compressedData = LZString.compress(JSON.stringify(data));
      
      const cacheObject = { data: compressedData, timestamp: Date.now() };
      try {
        if (noCache) {
          url = url.replace("&noCache=true", "");
        }
        await set(url, cacheObject);
      } catch {
        const keysArray = await keys();
        console.log(`Cache full (#elements: ${keysArray.length})! Removing elements...`)
        try {
          // local storage cache full, delete random elements
          for (let i = 0; i < CACHE_CONFIG.CLEANUP_BATCH_SIZE; i++) {
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

      processData(data);
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