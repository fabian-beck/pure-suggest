// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server?answertab=active#tab-top
export function saveAsFile(filename, mime, data) {
  const blob = new Blob([data], { type: mime });
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveBlob(blob, filename);
  } else {
    const elem = window.document.createElement("a");
    elem.href = window.URL.createObjectURL(blob);
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  }
}

// https://stackoverflow.com/questions/49820013/javascript-scrollintoview-smooth-scroll-and-offset
export function scrollToTargetAdjusted(element, offsetY) {
  var elementPosition = element.getBoundingClientRect().top;
  var offsetPosition = elementPosition + window.pageYOffset - offsetY;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
}

// https://stackoverflow.com/questions/16801687/javascript-random-ordering-with-seed
export function shuffle(array, seed) {
  function random(seed) {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  var m = array.length,
    t,
    i;
  while (m) {
    i = Math.floor(random(seed) * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
    ++seed;
  }
  return array;
}

// This function is used to parse a BibTeX file and extract all DOIs from it and returns a "session"
export function myBibtexParser(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsText(file);

    reader.onload = function (event) {
      const content = event.target.result;

      const dois = [];
      const output = { selected: dois };

      // Regex: Finds all occurences statring with DOI, any whitespace, =, any whitespace, match { or " , capture anything but } or " , and finally match } or }
      const doiRegex = /doi\s*=\s*[{"]([^}"']+)[}"]/gi;

      let match;
      while ((match = doiRegex.exec(content)) !== null) {
        const doi = match[1].trim();
        dois.push(doi);
      }

      resolve(output);
    };

    // Error handling
    reader.onerror = function () {
      reject(new Error("Error reading the BibTeX file"));
    };
  });
}
