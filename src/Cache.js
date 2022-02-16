export default async function cachedFetch(url, processData) {
  if (localStorage[url]) {
    processData(JSON.parse(localStorage[url]));
  } else {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error (`Received response with status ${response.status}`);
      }
      const data = await response.json();
      try {
        localStorage[url] = JSON.stringify(data);
      } catch (error) {
        try {
          // local storage cache full, delete random elements
          for (let i = 0; i < 100; i++) {
            const randomStoredUrl = Object.keys(localStorage)[
              Math.floor(Math.random() * Object.keys(localStorage).length)
            ];
            localStorage.removeItem(randomStoredUrl);
          }
          localStorage[url] = JSON.stringify(data);
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