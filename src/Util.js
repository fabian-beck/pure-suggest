// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server?answertab=active#tab-top
export function saveAsFile(filename, data) {
  const blob = new Blob([data], { type: "text/csv" });
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

  var m = array.length, t, i;
  while (m) {
    i = Math.floor(random(seed) * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
    ++seed
  }
  return array;
}

