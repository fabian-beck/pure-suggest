export default async function cachedFetch(url, processData) {
    if (localStorage[url]) {
      processData(JSON.parse(localStorage[url]));
    } else {
      await fetch(url)
        .then(response => response.json())
        .then(data => {
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
                `Unable to cache information for request "${url}" in local storage: ${error2}`
              );
            }
          }
          processData(data);
        })
        .catch(function(error) {
          console.error(`Failed to fetch and process "${url}": ${error}`);
        });
    }
  }