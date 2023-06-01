import LZString from 'lz-string';
import { get, set, keys, del, clear } from 'idb-keyval';

console.log(`Locally cached #elements: ${(await keys()).length}`)

export async function cachedFetch(url, processData, fetchParameters = {}) {
  try {
    const cacheObject = await get(url);
    if (cacheObject.timestamp < Date.now() - 1000 * 60 * 60 * 24 * 100) {
      throw new Error("Cached data is too old");
    }
    const data = JSON.parse(LZString.decompress(cacheObject.data));
    if (!data) throw new Error("Cached data is empty");
    processData(data);
  } catch (cannotLoadFromCacheError) {
    try {
      const response = await fetch(url, fetchParameters);
      if (!response.ok) {
        throw new Error(`Received response with status ${response.status}`);
      }
      const data = await response.json();
      const compressedData = LZString.compress(JSON.stringify(data));
      const cacheObject = { data: compressedData, timestamp: Date.now() };
      try {
        await set(url, cacheObject)
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

      processData(data);
    } catch (error3) {
      console.error(`Unable to fetch or process data for "${url}": ${error3}`)
    }
  }
}

export function clearCache() {
  clear();
}