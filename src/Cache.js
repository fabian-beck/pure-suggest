import LZString from 'lz-string';
import { get, set, keys, del } from 'idb-keyval';

console.log(`Locally cached #elements: ${(await keys()).length}`)

export async function cachedFetch(url, processData, fetchParameters = {}) {
  try {
    const data = JSON.parse(LZString.decompress(await get(url)));
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
      try {
        await set(url, compressedData)
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
          await set(url, compressedData);
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
  localStorage.clear();
}