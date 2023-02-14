import LZString from 'lz-string';

export async function cachedFetch(url, processData, fetchParameters = {}) {
  try {
    const data = JSON.parse(LZString.decompress(localStorage[url]));
    if (!data) throw new Error("Cached data is empty");
    processData(data);
  } catch (cannotLoadFromCacheError) {
    try {
      const response = await fetch(url, fetchParameters);
      if (!response.ok) {
        throw new Error(`Received response with status ${response.status}`);
      }
      const data = await response.json();
      try {
        localStorage[url] = LZString.compress(JSON.stringify(data));
      } catch (error) {
        console.log(`Cache full (#elements: ${Object.keys(localStorage).length})! Removing elements...`)
        try {
          // local storage cache full, delete random elements
          for (let i = 0; i < 100; i++) {
            const randomStoredUrl = Object.keys(localStorage)[
              Math.floor(Math.random() * Object.keys(localStorage).length)
            ];
            localStorage.removeItem(randomStoredUrl);
          }
          localStorage[url] = LZString.compress(JSON.stringify(data));
        } catch (error2) {
          console.error(
            `Unable to cache information for "${url}" in local storage: ${error2}`
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